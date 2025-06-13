import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.sqlite import JSON
from pydantic import BaseModel, Field
from enum import Enum
import uuid
import random
from abc import ABC, abstractmethod
import json

# Import the backend models
from electricity_market_backend import (
    UserType,
    MarketType,
    LoadPeriod,
    PlantType,
    PlantStatus,
    GameState,
    PLANT_TEMPLATES,
    DEFAULT_FUEL_PRICES,
    DEFAULT_RENEWABLE_AVAILABILITY
)

# Database setup
DATABASE_URL = "sqlite:///electricity_market_yearly.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Enum classes for SQLAlchemy
class UserTypeEnum(str, Enum):
    operator = "operator"
    utility = "utility"

class GameStateEnum(str, Enum):
    setup = "setup"
    year_planning = "year_planning"
    bidding_open = "bidding_open"
    market_clearing = "market_clearing"
    year_complete = "year_complete"
    game_complete = "game_complete"

class PlantTypeEnum(str, Enum):
    coal = "coal"
    natural_gas_cc = "natural_gas_cc"
    natural_gas_ct = "natural_gas_ct"
    nuclear = "nuclear"
    solar = "solar"
    wind_onshore = "wind_onshore"
    wind_offshore = "wind_offshore"
    battery = "battery"
    hydro = "hydro"
    biomass = "biomass"

class PlantStatusEnum(str, Enum):
    operating = "operating"
    under_construction = "under_construction"
    maintenance = "maintenance"
    retired = "retired"
    planned = "planned"

class LoadPeriodEnum(str, Enum):
    off_peak = "off_peak"
    shoulder = "shoulder"
    peak = "peak"

class MarketTypeEnum(str, Enum):
    day_ahead = "day_ahead"
    real_time = "real_time"

# Database models
class DBUser(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True)
    user_type = Column(SQLEnum(UserTypeEnum))
    budget = Column(Float, default=2000000000.0)  # $2B default
    debt = Column(Float, default=0.0)
    equity = Column(Float, default=2000000000.0)
    created_at = Column(DateTime, default=datetime.now)

class DBGameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(String, primary_key=True)
    name = Column(String)
    operator_id = Column(String, ForeignKey("users.id"))
    start_year = Column(Integer, default=2025)
    end_year = Column(Integer, default=2035)
    current_year = Column(Integer, default=2025)
    state = Column(SQLEnum(GameStateEnum), default=GameStateEnum.setup)
    carbon_price_per_ton = Column(Float, default=50.0)
    demand_profile = Column(Text)  # JSON string
    fuel_prices = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.now)

class DBPowerPlant(Base):
    __tablename__ = "power_plants"
    
    id = Column(String, primary_key=True)
    utility_id = Column(String, ForeignKey("users.id"))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    name = Column(String)
    plant_type = Column(SQLEnum(PlantTypeEnum))
    capacity_mw = Column(Float)
    construction_start_year = Column(Integer)
    commissioning_year = Column(Integer)
    retirement_year = Column(Integer)
    status = Column(SQLEnum(PlantStatusEnum), default=PlantStatusEnum.planned)
    capital_cost_total = Column(Float)
    fixed_om_annual = Column(Float)
    variable_om_per_mwh = Column(Float)
    capacity_factor = Column(Float)
    heat_rate = Column(Float, nullable=True)
    fuel_type = Column(String, nullable=True)
    min_generation_mw = Column(Float)
    maintenance_years = Column(Text, default="[]")  # JSON array of years
    created_at = Column(DateTime, default=datetime.now)

class DBYearlyBid(Base):
    __tablename__ = "yearly_bids"
    
    id = Column(String, primary_key=True)
    utility_id = Column(String, ForeignKey("users.id"))
    plant_id = Column(String, ForeignKey("power_plants.id"))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    market_type = Column(SQLEnum(MarketTypeEnum), default=MarketTypeEnum.day_ahead)
    off_peak_quantity = Column(Float)
    shoulder_quantity = Column(Float)
    peak_quantity = Column(Float)
    off_peak_price = Column(Float)
    shoulder_price = Column(Float)
    peak_price = Column(Float)
    timestamp = Column(DateTime, default=datetime.now)

class DBMarketResult(Base):
    __tablename__ = "market_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    period = Column(SQLEnum(LoadPeriodEnum))
    clearing_price = Column(Float)
    cleared_quantity = Column(Float)
    total_energy = Column(Float)
    accepted_supply_bids = Column(Text)  # JSON array of bid IDs
    marginal_plant = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.now)
# Portfolio Templates
PORTFOLIO_TEMPLATES = {
    "balanced_traditional": {
        "id": "balanced_traditional",
        "name": "Balanced Traditional Portfolio",
        "description": "Mix of coal, gas, and nuclear for reliable baseload power",
        "plants": [
            {"plant_type": "coal", "capacity_mw": 400, "name": "Coal Baseload Unit"},
            {"plant_type": "natural_gas_cc", "capacity_mw": 300, "name": "Gas Combined Cycle"},
            {"plant_type": "natural_gas_ct", "capacity_mw": 100, "name": "Gas Peaker"},
            {"plant_type": "nuclear", "capacity_mw": 800, "name": "Nuclear Baseload"}
        ]
    },
    "renewable_focused": {
        "id": "renewable_focused",
        "name": "Renewable Energy Leader",
        "description": "Heavy investment in solar, wind, and storage technologies",
        "plants": [
            {"plant_type": "solar", "capacity_mw": 500, "name": "Solar Farm Complex"},
            {"plant_type": "wind_onshore", "capacity_mw": 400, "name": "Wind Farm Alpha"},
            {"plant_type": "wind_offshore", "capacity_mw": 300, "name": "Offshore Wind"},
            {"plant_type": "battery", "capacity_mw": 200, "name": "Grid Storage System"},
            {"plant_type": "natural_gas_ct", "capacity_mw": 150, "name": "Backup Peaker"}
        ]
    },
    "gas_dominant": {
        "id": "gas_dominant",
        "name": "Natural Gas Specialist",
        "description": "Flexible gas-fired generation with high efficiency",
        "plants": [
            {"plant_type": "natural_gas_cc", "capacity_mw": 600, "name": "Large Gas CC Unit 1"},
            {"plant_type": "natural_gas_cc", "capacity_mw": 500, "name": "Large Gas CC Unit 2"},
            {"plant_type": "natural_gas_ct", "capacity_mw": 200, "name": "Fast Response Peaker 1"},
            {"plant_type": "natural_gas_ct", "capacity_mw": 150, "name": "Fast Response Peaker 2"}
        ]
    },
    "diversified_modern": {
        "id": "diversified_modern",
        "name": "Modern Diversified Portfolio",
        "description": "Balanced mix of all technologies for optimal flexibility",
        "plants": [
            {"plant_type": "nuclear", "capacity_mw": 400, "name": "Advanced Nuclear"},
            {"plant_type": "natural_gas_cc", "capacity_mw": 350, "name": "Efficient Gas CC"},
            {"plant_type": "solar", "capacity_mw": 300, "name": "Utility Solar"},
            {"plant_type": "wind_onshore", "capacity_mw": 250, "name": "Wind Farm"},
            {"plant_type": "battery", "capacity_mw": 150, "name": "Energy Storage"},
            {"plant_type": "natural_gas_ct", "capacity_mw": 100, "name": "Peaking Unit"}
        ]
    }
}

# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Convert plant templates to API-friendly format
PLANT_TEMPLATES_DATA = {
    plant_type.value: {
        "plant_type": plant_type.value,
        "name": template.name,
        "overnight_cost_per_kw": template.overnight_cost_per_kw,
        "construction_time_years": template.construction_time_years,
        "economic_life_years": template.economic_life_years,
        "capacity_factor_base": template.capacity_factor_base,
        "heat_rate": template.heat_rate,
        "fuel_type": template.fuel_type,
        "fixed_om_per_kw_year": template.fixed_om_per_kw_year,
        "variable_om_per_mwh": template.variable_om_per_mwh,
        "min_generation_pct": template.min_generation_pct,
        "co2_emissions_tons_per_mwh": template.co2_emissions_tons_per_mwh
    }
    for plant_type, template in PLANT_TEMPLATES.items()
}

# API endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "2.0.0",
        "framework": "FastAPI",
        "database": "SQLite",
        "timestamp": datetime.now().isoformat()
    }

# User management
@app.post("/users")
async def create_user(
    username: str = Query(..., description="Username"),
    user_type: str = Query(..., description="User type (operator or utility)"),
    db: Session = Depends(get_db)
):
    """Create a new user (operator or utility)"""
    
    # Check if username already exists
    existing_user = db.query(DBUser).filter(DBUser.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate user type
    try:
        user_type_enum = UserTypeEnum(user_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    # Create user
    user = DBUser(
        id=f"{user_type}_{username.lower().replace(' ', '_')}",
        username=username,
        user_type=user_type_enum,
        budget=10000000000 if user_type == "operator" else 2000000000,  # $10B for operator, $2B for utility
        debt=0.0,
        equity=10000000000 if user_type == "operator" else 2000000000
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@app.get("/users")
async def get_all_users(db: Session = Depends(get_db)):
    """Get all users"""
    users = db.query(DBUser).all()
    return users

@app.get("/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users/{user_id}/financial-summary")
async def get_user_financial_summary(
    user_id: str, 
    game_session_id: str = Query(..., description="Game session ID"),
    db: Session = Depends(get_db)
):
    """Get financial summary for a utility"""
    
    # Verify user exists and is a utility
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.user_type != UserTypeEnum.utility:
        raise HTTPException(status_code=400, detail="User is not a utility")
    
    # Get all plants for this utility in this game session
    plants = db.query(DBPowerPlant).filter(
        DBPowerPlant.utility_id == user_id,
        DBPowerPlant.game_session_id == game_session_id
    ).all()
    
    # Calculate metrics
    total_capital_invested = sum(plant.capital_cost_total for plant in plants)
    annual_fixed_costs = sum(plant.fixed_om_annual for plant in plants)
    plant_count = len(plants)
    total_capacity_mw = sum(plant.capacity_mw for plant in plants if plant.status == PlantStatusEnum.operating)
    
    return {
        "utility_id": user_id,
        "budget": user.budget,
        "debt": user.debt,
        "equity": user.equity,
        "total_capital_invested": total_capital_invested,
        "annual_fixed_costs": annual_fixed_costs,
        "plant_count": plant_count,
        "total_capacity_mw": total_capacity_mw
    }

@app.put("/users/{user_id}/financials")
async def update_user_financials(
    user_id: str,
    budget: float = Query(..., description="New budget"),
    debt: float = Query(..., description="New debt"),
    equity: float = Query(..., description="New equity"),
    db: Session = Depends(get_db)
):
    """Update user financial position"""
    
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.budget = budget
    user.debt = debt
    user.equity = equity
    
    db.commit()
    db.refresh(user)
    
    return user

# Game session management
@app.post("/game-sessions")
async def create_game_session(
    name: str = Query(..., description="Session name"),
    operator_id: str = Query(..., description="Operator ID"),
    start_year: int = Query(2025, description="Start year"),
    end_year: int = Query(2035, description="End year"),
    carbon_price_per_ton: float = Query(50.0, description="Carbon price ($/ton)"),
    db: Session = Depends(get_db)
):
    """Create a new game session"""
    
    # Verify operator exists
    operator = db.query(DBUser).filter(DBUser.id == operator_id).first()
    if not operator or operator.user_type != UserTypeEnum.operator:
        raise HTTPException(status_code=400, detail="Invalid operator ID")
    
    # Create demand profile
    demand_profile = {
        "off_peak_hours": 5000,
        "shoulder_hours": 2500,
        "peak_hours": 1260,
        "off_peak_demand": 1200,
        "shoulder_demand": 1800,
        "peak_demand": 2400,
        "demand_growth_rate": 0.02
    }
    
    # Create session
    session_id = f"session_{uuid.uuid4()}"
    session = DBGameSession(
        id=session_id,
        name=name,
        operator_id=operator_id,
        start_year=start_year,
        end_year=end_year,
        current_year=start_year,
        state=GameStateEnum.setup,
        carbon_price_per_ton=carbon_price_per_ton,
        demand_profile=json.dumps(demand_profile),
        fuel_prices=json.dumps(DEFAULT_FUEL_PRICES)
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session

@app.get("/game-sessions/{session_id}")
async def get_game_session(session_id: str, db: Session = Depends(get_db)):
    """Get game session by ID"""
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    return session

@app.put("/game-sessions/{session_id}/state")
async def update_game_state(
    session_id: str,
    new_state: str = Query(..., description="New game state"),
    db: Session = Depends(get_db)
):
    """Update game state"""
    
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    try:
        state_enum = GameStateEnum(new_state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game state")
    
    session.state = state_enum
    db.commit()
    db.refresh(session)
    
    return session

@app.put("/game-sessions/{session_id}/advance-year")
async def advance_game_year(session_id: str, db: Session = Depends(get_db)):
    """Advance to the next year"""
    
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if session.current_year >= session.end_year:
        session.state = GameStateEnum.game_complete
        db.commit()
        return {
            "message": "Game completed",
            "current_year": session.current_year,
            "state": session.state.value
        }
    
    session.current_year += 1
    session.state = GameStateEnum.year_planning
    db.commit()
    db.refresh(session)
    
    return {
        "message": f"Advanced to year {session.current_year}",
        "current_year": session.current_year,
        "state": session.state.value
    }

@app.get("/game-sessions/{session_id}/dashboard")
async def get_game_dashboard(session_id: str, db: Session = Depends(get_db)):
    """Get game dashboard data"""
    
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get all plants in this session
    plants = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id).all()
    
    # Get recent market results
    results = db.query(DBMarketResult).filter(
        DBMarketResult.game_session_id == session_id
    ).order_by(DBMarketResult.timestamp.desc()).limit(10).all()
    
    # Get recent investments
    recent_investments = db.query(DBPowerPlant).filter(
        DBPowerPlant.game_session_id == session_id,
        DBPowerPlant.construction_start_year >= session.current_year - 2
    ).all()
    
    # Calculate market stats
    total_capacity = sum(plant.capacity_mw for plant in plants if plant.status == PlantStatusEnum.operating)
    renewable_capacity = sum(
        plant.capacity_mw for plant in plants 
        if plant.status == PlantStatusEnum.operating and plant.plant_type in [
            PlantTypeEnum.solar, PlantTypeEnum.wind_onshore, PlantTypeEnum.wind_offshore, PlantTypeEnum.hydro
        ]
    )
    
    return {
        "session": {
            "id": session.id,
            "name": session.name,
            "current_year": session.current_year,
            "state": session.state.value,
            "carbon_price": session.carbon_price_per_ton
        },
        "market_stats": {
            "total_capacity_mw": total_capacity,
            "renewable_capacity_mw": renewable_capacity,
            "renewable_percentage": (renewable_capacity / total_capacity) if total_capacity > 0 else 0,
            "plant_count": len(plants),
            "operating_plants": sum(1 for plant in plants if plant.status == PlantStatusEnum.operating)
        },
        "recent_results": [
            {
                "year": result.year,
                "period": result.period.value,
                "clearing_price": result.clearing_price,
                "cleared_quantity": result.cleared_quantity,
                "total_energy": result.total_energy,
                "timestamp": result.timestamp
            }
            for result in results
        ],
        "recent_investments": [
            {
                "plant_id": plant.id,
                "utility_id": plant.utility_id,
                "name": plant.name,
                "plant_type": plant.plant_type.value,
                "capacity_mw": plant.capacity_mw,
                "commissioning_year": plant.commissioning_year
            }
            for plant in recent_investments
        ]
    }

# Plant templates
@app.get("/plant-templates")
async def get_plant_templates():
    """Get all plant templates"""
    return [
        {
            "plant_type": plant_type,
            "name": data["name"],
            "overnight_cost_per_kw": data["overnight_cost_per_kw"],
            "construction_time_years": data["construction_time_years"],
            "economic_life_years": data["economic_life_years"],
            "capacity_factor_base": data["capacity_factor_base"],
            "heat_rate": data["heat_rate"],
            "fuel_type": data["fuel_type"],
            "fixed_om_per_kw_year": data["fixed_om_per_kw_year"],
            "variable_om_per_mwh": data["variable_om_per_mwh"],
            "min_generation_pct": data["min_generation_pct"],
            "co2_emissions_tons_per_mwh": data["co2_emissions_tons_per_mwh"]
        }
        for plant_type, data in PLANT_TEMPLATES_DATA.items()
    ]

@app.get("/plant-templates/{plant_type}")
async def get_plant_template(plant_type: str):
    """Get plant template by type"""
    if plant_type not in PLANT_TEMPLATES_DATA:
        raise HTTPException(status_code=404, detail="Plant type not found")
    
    return PLANT_TEMPLATES_DATA[plant_type]

# Power plant management
@app.post("/game-sessions/{session_id}/plants")
async def create_power_plant(
    session_id: str,
    name: str = Query(..., description="Plant name"),
    plant_type: str = Query(..., description="Plant type"),
    capacity_mw: float = Query(..., description="Capacity in MW"),
    construction_start_year: int = Query(..., description="Construction start year"),
    commissioning_year: int = Query(..., description="Commissioning year"),
    retirement_year: int = Query(..., description="Retirement year"),
    utility_id: str = Query(..., description="Utility ID"),
    db: Session = Depends(get_db)
):
    """Create a new power plant"""
    
    # Verify session exists
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Verify utility exists
    utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
    if not utility or utility.user_type != UserTypeEnum.utility:
        raise HTTPException(status_code=400, detail="Invalid utility ID")
    
    # Verify plant type
    try:
        plant_type_enum = PlantTypeEnum(plant_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plant type")
    
    # Get template data
    if plant_type not in PLANT_TEMPLATES_DATA:
        raise HTTPException(status_code=400, detail="Invalid plant type")
    
    template = PLANT_TEMPLATES_DATA[plant_type]
    
    # Calculate costs
    capacity_kw = capacity_mw * 1000
    capital_cost = capacity_kw * template["overnight_cost_per_kw"]
    fixed_om_annual = capacity_kw * template["fixed_om_per_kw_year"]
    
    # Determine status based on construction timeline
    if commissioning_year <= session.current_year:
        status = PlantStatusEnum.operating
    else:
        status = PlantStatusEnum.under_construction
    
    # Check if utility has enough budget
    equity_required = capital_cost * 0.3  # 30% equity
    if utility.budget < equity_required:
        raise HTTPException(status_code=400, detail=f"Insufficient budget. Required: ${equity_required/1e6:.1f}M, Available: ${utility.budget/1e6:.1f}M")
    
    # Create plant
    plant_id = f"plant_{uuid.uuid4()}"
    plant = DBPowerPlant(
        id=plant_id,
        utility_id=utility_id,
        game_session_id=session_id,
        name=name,
        plant_type=plant_type_enum,
        capacity_mw=capacity_mw,
        construction_start_year=construction_start_year,
        commissioning_year=commissioning_year,
        retirement_year=retirement_year,
        status=status,
        capital_cost_total=capital_cost,
        fixed_om_annual=fixed_om_annual,
        variable_om_per_mwh=template["variable_om_per_mwh"],
        capacity_factor=template["capacity_factor_base"],
        heat_rate=template["heat_rate"],
        fuel_type=template["fuel_type"],
        min_generation_mw=capacity_mw * template["min_generation_pct"],
        maintenance_years=json.dumps([])
    )
    
    # Update utility finances (70% debt, 30% equity)
    utility.budget -= equity_required
    utility.debt += capital_cost * 0.7
    utility.equity -= equity_required
    
    db.add(plant)
    db.commit()
    db.refresh(plant)
    
    return plant

@app.get("/game-sessions/{session_id}/plants")
async def get_power_plants(
    session_id: str,
    utility_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get power plants for a game session"""
    
    query = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id)
    
    if utility_id:
        query = query.filter(DBPowerPlant.utility_id == utility_id)
    
    plants = query.all()
    return plants

@app.get("/game-sessions/{session_id}/plants/{plant_id}/economics")
async def get_plant_economics(
    session_id: str,
    plant_id: str,
    year: int = Query(..., description="Analysis year"),
    db: Session = Depends(get_db)
):
    """Get economic analysis for a power plant"""
    
    # Get plant
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == plant_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Get session for carbon price
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get fuel prices
    fuel_prices_data = json.loads(session.fuel_prices)
    year_fuel_prices = fuel_prices_data.get(str(year), fuel_prices_data.get("2025", {}))
    
    # Calculate marginal cost
    marginal_cost = plant.variable_om_per_mwh
    fuel_costs = 0
    
    if plant.fuel_type and plant.heat_rate:
        fuel_price = year_fuel_prices.get(plant.fuel_type, 0)
        fuel_costs = (plant.heat_rate * fuel_price) / 1000  # Convert BTU to MMBtu
        marginal_cost += fuel_costs
    
    # Add carbon cost
    template = PLANT_TEMPLATES_DATA[plant.plant_type.value]
    carbon_cost = template["co2_emissions_tons_per_mwh"] * session.carbon_price_per_ton
    marginal_cost += carbon_cost
    
    # Calculate annual generation and revenue
    annual_generation = plant.capacity_mw * plant.capacity_factor * 8760  # MWh
    estimated_revenue = annual_generation * 55  # Assuming $55/MWh average price
    
    return {
        "plant_id": plant.id,
        "name": plant.name,
        "capacity_mw": plant.capacity_mw,
        "year": year,
        "marginal_cost_per_mwh": marginal_cost,
        "fuel_costs": fuel_costs,
        "carbon_cost": carbon_cost,
        "annual_fixed_costs": plant.fixed_om_annual,
        "annual_generation_mwh": annual_generation,
        "estimated_annual_revenue": estimated_revenue,
        "estimated_gross_margin": estimated_revenue - plant.fixed_om_annual - (marginal_cost * annual_generation)
    }

@app.put("/game-sessions/{session_id}/plants/{plant_id}/retire")
async def retire_plant(
    session_id: str,
    plant_id: str,
    retirement_year: int = Query(..., description="New retirement year"),
    db: Session = Depends(get_db)
):
    """Retire a power plant early"""
    
    # Get plant
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == plant_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Get session
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Validate retirement year
    if retirement_year < session.current_year:
        raise HTTPException(status_code=400, detail="Retirement year cannot be in the past")
    
    if retirement_year >= plant.retirement_year:
        raise HTTPException(status_code=400, detail="New retirement year must be earlier than current retirement year")
    
    # Update plant
    plant.retirement_year = retirement_year
    
    # If retiring immediately, update status
    if retirement_year <= session.current_year:
        plant.status = PlantStatusEnum.retired
    
    db.commit()
    db.refresh(plant)
    
    return {
        "message": f"Plant {plant.name} will be retired in {retirement_year}",
        "plant_id": plant.id,
        "new_retirement_year": retirement_year,
        "status": plant.status.value
    }

# Bidding system
@app.post("/game-sessions/{session_id}/bids")
async def submit_yearly_bid(
    session_id: str,
    plant_id: str = Query(..., description="Plant ID"),
    year: int = Query(..., description="Bid year"),
    off_peak_quantity: float = Query(..., description="Off-peak quantity (MW)"),
    shoulder_quantity: float = Query(..., description="Shoulder quantity (MW)"),
    peak_quantity: float = Query(..., description="Peak quantity (MW)"),
    off_peak_price: float = Query(..., description="Off-peak price ($/MWh)"),
    shoulder_price: float = Query(..., description="Shoulder price ($/MWh)"),
    peak_price: float = Query(..., description="Peak price ($/MWh)"),
    utility_id: str = Query(..., description="Utility ID"),
    db: Session = Depends(get_db)
):
    """Submit a yearly bid for all load periods"""
    
    # Verify session exists
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Verify plant exists and belongs to utility
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == plant_id,
        DBPowerPlant.game_session_id == session_id,
        DBPowerPlant.utility_id == utility_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or does not belong to utility")
    
    # Check if plant is operating
    if plant.status != PlantStatusEnum.operating:
        raise HTTPException(status_code=400, detail=f"Plant is not operating (status: {plant.status.value})")
    
    # Check if plant is commissioned
    if plant.commissioning_year > year:
        raise HTTPException(status_code=400, detail=f"Plant will not be commissioned until {plant.commissioning_year}")
    
    # Check if plant is retired
    if plant.retirement_year <= year:
        raise HTTPException(status_code=400, detail=f"Plant will be retired by {year}")
    
    # Check if bid already exists
    existing_bid = db.query(DBYearlyBid).filter(
        DBYearlyBid.plant_id == plant_id,
        DBYearlyBid.year == year,
        DBYearlyBid.game_session_id == session_id
    ).first()
    
    if existing_bid:
        # Update existing bid
        existing_bid.off_peak_quantity = off_peak_quantity
        existing_bid.shoulder_quantity = shoulder_quantity
        existing_bid.peak_quantity = peak_quantity
        existing_bid.off_peak_price = off_peak_price
        existing_bid.shoulder_price = shoulder_price
        existing_bid.peak_price = peak_price
        existing_bid.timestamp = datetime.now()
        
        db.commit()
        db.refresh(existing_bid)
        
        return {
            "message": "Bid updated successfully",
            "bid_id": existing_bid.id
        }
    
    # Create new bid
    bid = DBYearlyBid(
        id=f"bid_{uuid.uuid4()}",
        utility_id=utility_id,
        plant_id=plant_id,
        game_session_id=session_id,
        year=year,
        market_type=MarketTypeEnum.day_ahead,
        off_peak_quantity=off_peak_quantity,
        shoulder_quantity=shoulder_quantity,
        peak_quantity=peak_quantity,
        off_peak_price=off_peak_price,
        shoulder_price=shoulder_price,
        peak_price=peak_price
    )
    
    db.add(bid)
    db.commit()
    db.refresh(bid)
    
    return {
        "message": "Bid submitted successfully",
        "bid_id": bid.id
    }

@app.get("/game-sessions/{session_id}/bids")
async def get_yearly_bids(
    session_id: str,
    year: Optional[int] = None,
    utility_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get yearly bids for a game session"""
    
    query = db.query(DBYearlyBid).filter(DBYearlyBid.game_session_id == session_id)
    
    if year:
        query = query.filter(DBYearlyBid.year == year)
    
    if utility_id:
        query = query.filter(DBYearlyBid.utility_id == utility_id)
    
    bids = query.all()
    return bids

# Market operations
@app.get("/game-sessions/{session_id}/fuel-prices/{year}")
async def get_fuel_prices(session_id: str, year: int, db: Session = Depends(get_db)):
    """Get fuel prices for a specific year"""
    
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    fuel_prices_data = json.loads(session.fuel_prices)
    year_prices = fuel_prices_data.get(str(year), fuel_prices_data.get("2025", {}))
    
    return {
        "year": year,
        "fuel_prices": year_prices,
        "notes": "Prices in $/MMBtu"
    }

@app.get("/game-sessions/{session_id}/renewable-availability/{year}")
async def get_renewable_availability(session_id: str, year: int, db: Session = Depends(get_db)):
    """Get renewable availability for a specific year"""
    
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get renewable availability data
    availability = DEFAULT_RENEWABLE_AVAILABILITY.get(year, DEFAULT_RENEWABLE_AVAILABILITY.get(2025))
    
    # Generate impact analysis
    solar_impact = "Normal"
    if availability.solar_availability > 1.1:
        solar_impact = "Positive"
    elif availability.solar_availability < 0.9:
        solar_impact = "Negative"
    
    wind_impact = "Normal"
    if availability.wind_availability > 1.1:
        wind_impact = "Positive"
    elif availability.wind_availability < 0.9:
        wind_impact = "Negative"
    
    # Generate recommendations
    recommendations = []
    if availability.solar_availability > 1.1:
        recommendations.append("Solar plants will perform well this year")
    elif availability.solar_availability < 0.9:
        recommendations.append("Consider bidding solar plants at lower capacity")
    
    if availability.wind_availability > 1.1:
        recommendations.append("Wind plants will perform well this year")
    elif availability.wind_availability < 0.9:
        recommendations.append("Consider bidding wind plants at lower capacity")
    
    if availability.solar_availability < 0.9 and availability.wind_availability < 0.9:
        recommendations.append("Thermal plants may command higher prices due to renewable shortfall")
    
    return {
        "year": year,
        "renewable_availability": {
            "solar_availability": availability.solar_availability,
            "wind_availability": availability.wind_availability,
            "weather_description": availability.weather_description
        },
        "impact_analysis": {
            "solar_impact": solar_impact,
            "wind_impact": wind_impact,
            "recommendations": recommendations
        }
    }

@app.get("/game-sessions/{session_id}/market-results")
async def get_market_results(
    session_id: str,
    year: Optional[int] = None,
    period: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get market results for a game session"""
    
    query = db.query(DBMarketResult).filter(DBMarketResult.game_session_id == session_id)
    
    if year:
        query = query.filter(DBMarketResult.year == year)
    
    if period:
        try:
            period_enum = LoadPeriodEnum(period)
            query = query.filter(DBMarketResult.period == period_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid period")
    
    results = query.all()
    
    # Convert accepted bids from JSON string to list
    for result in results:
        result.accepted_supply_bids = json.loads(result.accepted_supply_bids)
    
    return results

# Sample data creation
@app.post("/sample-data/create")
async def create_sample_data(db: Session = Depends(get_db)):
    """Create sample data for testing"""
    from startup import create_sample_data
    
    result = create_sample_data()
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create sample data")
    
    return {
        "message": "Sample data created successfully",
        "game_session_id": result["game_session_id"],
        "operator_id": result["operator_id"],
        "utility_ids": result["utility_ids"]
    }

# Utility portfolio templates
@app.get("/portfolio-templates")
async def get_portfolio_templates():
    """Get available portfolio templates for game setup"""
    return list(PORTFOLIO_TEMPLATES.values())

@app.post("/game-sessions/{session_id}/assign-portfolio")
async def assign_portfolio_to_utility(
    session_id: str,
    portfolio_id: str = Query(..., description="Portfolio template ID"),
    utility_id: str = Query(..., description="Utility ID"),
    db: Session = Depends(get_db)
):
    """Assign a portfolio template to a utility"""
    
    # Verify game session exists
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Verify utility exists
    utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
    if not utility:
        raise HTTPException(status_code=404, detail="Utility not found")
    
    # Get portfolio template
    if portfolio_id not in PORTFOLIO_TEMPLATES:
        raise HTTPException(status_code=404, detail="Portfolio template not found")
    
    template = PORTFOLIO_TEMPLATES[portfolio_id]
    
    # Create plants for this utility
    created_plants = []
    total_investment = 0
    
    for plant_config in template["plants"]:
        plant_type = plant_config["plant_type"]
        capacity_mw = plant_config["capacity_mw"]
        plant_name = plant_config["name"]
        
        # Get template data for this plant type
        if plant_type not in PLANT_TEMPLATES_DATA:
            continue
            
        template_data = PLANT_TEMPLATES_DATA[plant_type]
        capacity_kw = capacity_mw * 1000
        
        # Calculate costs
        capital_cost = capacity_kw * template_data["overnight_cost_per_kw"]
        fixed_om_annual = capacity_kw * template_data["fixed_om_per_kw_year"]
        
        # Create plant
        plant = DBPowerPlant(
            id=f"{utility_id}_{plant_type}_{capacity_mw}mw",
            utility_id=utility_id,
            game_session_id=session_id,
            name=f"{plant_name} ({capacity_mw}MW)",
            plant_type=PlantTypeEnum(plant_type),
            capacity_mw=capacity_mw,
            construction_start_year=session.start_year - 2,  # Already built
            commissioning_year=session.start_year,  # Available from start
            retirement_year=session.start_year + template_data["economic_life_years"],
            status=PlantStatusEnum.operating,
            capital_cost_total=capital_cost,
            fixed_om_annual=fixed_om_annual,
            variable_om_per_mwh=template_data["variable_om_per_mwh"],
            capacity_factor=template_data["capacity_factor_base"],
            heat_rate=template_data.get("heat_rate"),
            fuel_type=template_data.get("fuel_type"),
            min_generation_mw=capacity_mw * template_data["min_generation_pct"],
            maintenance_years=json.dumps([])
        )
        
        db.add(plant)
        created_plants.append(plant)
        total_investment += capital_cost
    
    # Update utility finances to reflect the investment
    # Assume 70% debt, 30% equity financing
    equity_investment = total_investment * 0.3
    debt_investment = total_investment * 0.7
    
    utility.budget = max(0, utility.budget - equity_investment)
    utility.debt += debt_investment
    utility.equity = max(0, utility.equity - equity_investment)
    
    db.commit()
    
    return {
        "message": f"Portfolio '{template['name']}' assigned to {utility.username}",
        "plants_created": len(created_plants),
        "total_capacity": sum(plant.capacity_mw for plant in created_plants),
        "total_investment": total_investment,
        "portfolio_template": template
    }

@app.post("/game-sessions/{session_id}/bulk-assign-portfolios")
async def bulk_assign_portfolios(
    session_id: str,
    assignments: dict,  # utility_id -> portfolio_id mapping
    db: Session = Depends(get_db)
):
    """Assign portfolios to multiple utilities at once"""
    
    results = []
    
    for utility_id, portfolio_id in assignments.items():
        try:
            result = await assign_portfolio_to_utility(session_id, portfolio_id, utility_id, db)
            results.append({
                "utility_id": utility_id,
                "portfolio_id": portfolio_id,
                "success": True,
                "result": result
            })
        except Exception as e:
            results.append({
                "utility_id": utility_id,
                "portfolio_id": portfolio_id,
                "success": False,
                "error": str(e)
            })
    
    return {
        "message": f"Bulk portfolio assignment completed",
        "results": results,
        "successful_assignments": len([r for r in results if r["success"]]),
        "failed_assignments": len([r for r in results if not r["success"]])
    }

@app.get("/game-sessions/{session_id}/utilities")
async def get_game_utilities(session_id: str, db: Session = Depends(get_db)):
    """Get all utilities participating in a game session"""
    
    # Get all utilities that have plants in this game session
    utilities_with_plants = db.query(DBUser).join(DBPowerPlant).filter(
        DBPowerPlant.game_session_id == session_id
    ).distinct().all()
    
    # If no utilities have plants yet, get all utilities (for setup phase)
    if not utilities_with_plants:
        utilities_with_plants = db.query(DBUser).filter(
            DBUser.user_type == UserTypeEnum.utility
        ).all()
    
    # Calculate additional metrics for each utility
    utility_data = []
    for utility in utilities_with_plants:
        plants = db.query(DBPowerPlant).filter(
            DBPowerPlant.utility_id == utility.id,
            DBPowerPlant.game_session_id == session_id
        ).all()
        
        total_capacity = sum(plant.capacity_mw for plant in plants)
        plant_count = len(plants)
        
        utility_data.append({
            "id": utility.id,
            "username": utility.username,
            "user_type": utility.user_type.value,
            "budget": utility.budget,
            "debt": utility.debt,
            "equity": utility.equity,
            "total_capacity_mw": total_capacity,
            "plant_count": plant_count
        })
    
    return utility_data

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)