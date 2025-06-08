from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from enum import Enum
import uuid
import json
import traceback

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./electricity_market.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enums
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

# Database Models
class DBUser(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    user_type = Column(SQLEnum(UserTypeEnum))
    budget = Column(Float, default=0.0)
    debt = Column(Float, default=0.0)
    equity = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBGameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    operator_id = Column(String, ForeignKey("users.id"))
    start_year = Column(Integer, default=2025)
    end_year = Column(Integer, default=2035)
    current_year = Column(Integer, default=2025)
    state = Column(SQLEnum(GameStateEnum), default=GameStateEnum.setup)
    carbon_price_per_ton = Column(Float, default=50.0)
    demand_profile = Column(Text)  # JSON string
    fuel_prices = Column(Text)     # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

class DBPowerPlant(Base):
    __tablename__ = "power_plants"
    
    id = Column(String, primary_key=True, index=True)
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
    min_generation_mw = Column(Float, default=0.0)
    maintenance_years = Column(Text)  # JSON array of years

class DBYearlyBid(Base):
    __tablename__ = "yearly_bids"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    utility_id = Column(String, ForeignKey("users.id"))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    plant_id = Column(String, ForeignKey("power_plants.id"))
    year = Column(Integer)
    off_peak_quantity = Column(Float)
    shoulder_quantity = Column(Float)
    peak_quantity = Column(Float)
    off_peak_price = Column(Float)
    shoulder_price = Column(Float)
    peak_price = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class DBMarketResult(Base):
    __tablename__ = "market_results"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    period = Column(SQLEnum(LoadPeriodEnum))
    clearing_price = Column(Float)
    cleared_quantity = Column(Float)
    total_energy = Column(Float)
    accepted_supply_bids = Column(Text)  # JSON array of bid IDs
    marginal_plant = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# FastAPI app
app = FastAPI(title="Electricity Market Game API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Plant templates data
PLANT_TEMPLATES_DATA = {
    "coal": {
        "plant_type": "coal",
        "name": "Supercritical Coal",
        "overnight_cost_per_kw": 4500,
        "construction_time_years": 4,
        "economic_life_years": 40,
        "capacity_factor_base": 0.85,
        "heat_rate": 8800,
        "fuel_type": "coal",
        "fixed_om_per_kw_year": 45,
        "variable_om_per_mwh": 4.5,
        "min_generation_pct": 0.4,
        "co2_emissions_tons_per_mwh": 0.95
    },
    "natural_gas_cc": {
        "plant_type": "natural_gas_cc",
        "name": "Natural Gas Combined Cycle",
        "overnight_cost_per_kw": 1200,
        "construction_time_years": 3,
        "economic_life_years": 30,
        "capacity_factor_base": 0.87,
        "heat_rate": 6400,
        "fuel_type": "natural_gas",
        "fixed_om_per_kw_year": 15,
        "variable_om_per_mwh": 3.0,
        "min_generation_pct": 0.3,
        "co2_emissions_tons_per_mwh": 0.35
    },
    "natural_gas_ct": {
        "plant_type": "natural_gas_ct",
        "name": "Natural Gas Combustion Turbine",
        "overnight_cost_per_kw": 800,
        "construction_time_years": 2,
        "economic_life_years": 25,
        "capacity_factor_base": 0.15,
        "heat_rate": 10500,
        "fuel_type": "natural_gas",
        "fixed_om_per_kw_year": 12,
        "variable_om_per_mwh": 8.0,
        "min_generation_pct": 0.0,
        "co2_emissions_tons_per_mwh": 0.55
    },
    "nuclear": {
        "plant_type": "nuclear",
        "name": "Advanced Nuclear",
        "overnight_cost_per_kw": 8500,
        "construction_time_years": 7,
        "economic_life_years": 60,
        "capacity_factor_base": 0.92,
        "heat_rate": 10400,
        "fuel_type": "uranium",
        "fixed_om_per_kw_year": 95,
        "variable_om_per_mwh": 2.0,
        "min_generation_pct": 0.7,
        "co2_emissions_tons_per_mwh": 0.0
    },
    "solar": {
        "plant_type": "solar",
        "name": "Utility Scale Solar PV",
        "overnight_cost_per_kw": 1400,
        "construction_time_years": 2,
        "economic_life_years": 25,
        "capacity_factor_base": 0.27,
        "heat_rate": None,
        "fuel_type": None,
        "fixed_om_per_kw_year": 18,
        "variable_om_per_mwh": 0.0,
        "min_generation_pct": 0.0,
        "co2_emissions_tons_per_mwh": 0.0
    },
    "wind_onshore": {
        "plant_type": "wind_onshore",
        "name": "Onshore Wind",
        "overnight_cost_per_kw": 1650,
        "construction_time_years": 2,
        "economic_life_years": 25,
        "capacity_factor_base": 0.35,
        "heat_rate": None,
        "fuel_type": None,
        "fixed_om_per_kw_year": 28,
        "variable_om_per_mwh": 0.0,
        "min_generation_pct": 0.0,
        "co2_emissions_tons_per_mwh": 0.0
    },
    "wind_offshore": {
        "plant_type": "wind_offshore",
        "name": "Offshore Wind",
        "overnight_cost_per_kw": 4200,
        "construction_time_years": 4,
        "economic_life_years": 25,
        "capacity_factor_base": 0.45,
        "heat_rate": None,
        "fuel_type": None,
        "fixed_om_per_kw_year": 80,
        "variable_om_per_mwh": 0.0,
        "min_generation_pct": 0.0,
        "co2_emissions_tons_per_mwh": 0.0
    },
    "battery": {
        "plant_type": "battery",
        "name": "Lithium-Ion Battery Storage",
        "overnight_cost_per_kw": 1500,
        "construction_time_years": 1,
        "economic_life_years": 15,
        "capacity_factor_base": 0.85,
        "heat_rate": None,
        "fuel_type": None,
        "fixed_om_per_kw_year": 25,
        "variable_om_per_mwh": 2.0,
        "min_generation_pct": -1.0,
        "co2_emissions_tons_per_mwh": 0.0
    }
}

# Default fuel prices
DEFAULT_FUEL_PRICES = {
    "2025": {"coal": 2.50, "natural_gas": 4.00, "uranium": 0.75},
    "2026": {"coal": 2.55, "natural_gas": 4.20, "uranium": 0.76},
    "2027": {"coal": 2.60, "natural_gas": 4.50, "uranium": 0.77},
    "2028": {"coal": 2.65, "natural_gas": 4.80, "uranium": 0.78},
    "2029": {"coal": 2.70, "natural_gas": 5.00, "uranium": 0.79},
    "2030": {"coal": 2.75, "natural_gas": 5.20, "uranium": 0.80}
}

# Pydantic models
class UserCreate(BaseModel):
    username: str
    user_type: UserTypeEnum

class GameSessionCreate(BaseModel):
    name: str
    operator_id: str
    start_year: Optional[int] = 2025
    end_year: Optional[int] = 2035
    carbon_price_per_ton: Optional[float] = 50.0

class PowerPlantCreate(BaseModel):
    name: str
    plant_type: PlantTypeEnum
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int

class YearlyBidCreate(BaseModel):
    plant_id: str
    year: int
    off_peak_quantity: float
    shoulder_quantity: float
    peak_quantity: float
    off_peak_price: float
    shoulder_price: float
    peak_price: float

class PortfolioAssignment(BaseModel):
    utility_id: str
    plants: List[Dict[str, Any]]

# API Endpoints

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "framework": "FastAPI",
        "timestamp": datetime.utcnow().isoformat()
    }

# User Management
@app.post("/users")
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        # Check if user already exists
        existing_user = db.query(DBUser).filter(DBUser.username == user.username).first()
        if existing_user:
            # If user exists, return the existing user instead of creating a new one
            return {
                "id": existing_user.id,
                "username": existing_user.username,
                "user_type": existing_user.user_type,
                "budget": existing_user.budget,
                "debt": existing_user.debt,
                "equity": existing_user.equity,
                "message": "User already exists, returning existing user"
            }
        
        # Set default budgets based on user type
        if user.user_type == UserTypeEnum.operator:
            budget = 10000000000  # $10B for operator
            debt = 0.0
            equity = 10000000000
        else:  # utility
            budget = 2000000000   # $2B for utility
            debt = 0.0
            equity = 2000000000
        
        db_user = DBUser(
            id=str(uuid.uuid4()),
            username=user.username,
            user_type=user.user_type,
            budget=budget,
            debt=debt,
            equity=equity
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return {
            "id": db_user.id,
            "username": db_user.username,
            "user_type": db_user.user_type,
            "budget": db_user.budget,
            "debt": db_user.debt,
            "equity": db_user.equity
        }
    except Exception as e:
        print(f"Error creating user: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Add endpoint to get all users
@app.get("/users")
async def get_all_users(db: Session = Depends(get_db)):
    users = db.query(DBUser).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "user_type": user.user_type,
            "budget": user.budget,
            "debt": user.debt,
            "equity": user.equity,
            "created_at": user.created_at.isoformat()
        } for user in users
    ]

@app.get("/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users/{user_id}/financial-summary")
async def get_user_financial_summary(
    user_id: str, 
    game_session_id: str = Query(...),
    db: Session = Depends(get_db)
):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's plants in this game session
    plants = db.query(DBPowerPlant).filter(
        DBPowerPlant.utility_id == user_id,
        DBPowerPlant.game_session_id == game_session_id
    ).all()
    
    total_capacity = sum(plant.capacity_mw for plant in plants)
    total_investment = sum(plant.capital_cost_total for plant in plants)
    annual_fixed_costs = sum(plant.fixed_om_annual for plant in plants)
    
    return {
        "utility_id": user_id,
        "budget": user.budget,
        "debt": user.debt,
        "equity": user.equity,
        "total_capital_invested": total_investment,
        "annual_fixed_costs": annual_fixed_costs,
        "plant_count": len(plants),
        "total_capacity_mw": total_capacity
    }

# Game Session Management
@app.post("/game-sessions")
async def create_game_session(session: GameSessionCreate, db: Session = Depends(get_db)):
    try:
        # Default demand profile
        demand_profile = {
            "off_peak_hours": 5000,
            "shoulder_hours": 2500,
            "peak_hours": 1260,
            "off_peak_demand": 1200,
            "shoulder_demand": 1800,
            "peak_demand": 2400,
            "demand_growth_rate": 0.02
        }
        
        db_session = DBGameSession(
            id=str(uuid.uuid4()),
            name=session.name,
            operator_id=session.operator_id,
            start_year=session.start_year,
            end_year=session.end_year,
            current_year=session.start_year,
            carbon_price_per_ton=session.carbon_price_per_ton,
            demand_profile=json.dumps(demand_profile),
            fuel_prices=json.dumps(DEFAULT_FUEL_PRICES)
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        
        return {
            "id": db_session.id,
            "name": db_session.name,
            "operator_id": db_session.operator_id,
            "start_year": db_session.start_year,
            "end_year": db_session.end_year,
            "current_year": db_session.current_year,
            "state": db_session.state,
            "carbon_price_per_ton": db_session.carbon_price_per_ton
        }
    except Exception as e:
        print(f"Error creating game session: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/game-sessions/{session_id}")
async def get_game_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    return session

@app.put("/game-sessions/{session_id}/state")
async def update_game_state(
    session_id: str, 
    new_state: GameStateEnum = Query(...),
    db: Session = Depends(get_db)
):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    session.state = new_state
    db.commit()
    
    return {"message": f"Game state updated to {new_state}", "state": new_state}

@app.put("/game-sessions/{session_id}/advance-year")
async def advance_year(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if session.current_year >= session.end_year:
        session.state = GameStateEnum.game_complete
    else:
        session.current_year += 1
        session.state = GameStateEnum.year_planning
    
    db.commit()
    
    return {
        "current_year": session.current_year,
        "state": session.state,
        "message": f"Advanced to year {session.current_year}"
    }

@app.get("/game-sessions/{session_id}/dashboard")
async def get_game_dashboard(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get all plants in this session
    plants = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id).all()
    
    # Get recent market results
    recent_results = db.query(DBMarketResult).filter(
        DBMarketResult.game_session_id == session_id
    ).order_by(DBMarketResult.timestamp.desc()).limit(10).all()
    
    # Calculate market stats
    total_capacity = sum(plant.capacity_mw for plant in plants if plant.status == PlantStatusEnum.operating)
    operating_plants = len([p for p in plants if p.status == PlantStatusEnum.operating])
    
    # Get demand for current year
    demand_data = json.loads(session.demand_profile)
    year_offset = session.current_year - session.start_year
    growth_factor = (1 + demand_data["demand_growth_rate"]) ** year_offset
    
    current_demand = {
        "off_peak": demand_data["off_peak_demand"] * growth_factor,
        "shoulder": demand_data["shoulder_demand"] * growth_factor,
        "peak": demand_data["peak_demand"] * growth_factor
    }
    
    # Get utilities count
    utilities = db.query(DBUser).filter(DBUser.user_type == UserTypeEnum.utility).all()
    utility_count = len([u for u in utilities if any(p.utility_id == u.id for p in plants)])
    
    return {
        "session_info": {
            "id": session.id,
            "name": session.name,
            "current_year": session.current_year,
            "state": session.state,
            "carbon_price": session.carbon_price_per_ton
        },
        "market_stats": {
            "total_capacity_mw": total_capacity,
            "operating_plants": operating_plants,
            "capacity_margin": max(0, (total_capacity - max(current_demand.values())) / max(current_demand.values())) if max(current_demand.values()) > 0 else 0
        },
        "participants": {
            "total_utilities": utility_count
        },
        "current_demand_mw": current_demand,
        "recent_results": [
            {
                "year": result.year,
                "period": result.period,
                "clearing_price": result.clearing_price,
                "cleared_quantity": result.cleared_quantity,
                "timestamp": result.timestamp.isoformat()
            } for result in recent_results
        ]
    }

@app.get("/game-sessions/{session_id}/utilities")
async def get_game_utilities(session_id: str, db: Session = Depends(get_db)):
    try:
        # First try to get utilities that have plants in this game session
        utilities_with_plants = db.query(DBUser).join(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == session_id,
            DBUser.user_type == UserTypeEnum.utility
        ).distinct().all()
        
        print(f"🔍 Found {len(utilities_with_plants)} utilities with plants in session {session_id}")
        
        # If no utilities with plants found, get all utilities (they might not have plants yet)
        if not utilities_with_plants:
            print(f"⚠️ No utilities with plants found, getting all utilities")
            all_utilities = db.query(DBUser).filter(
                DBUser.user_type == UserTypeEnum.utility
            ).all()
            print(f"🔍 Found {len(all_utilities)} total utilities")
            utilities_with_plants = all_utilities
        
        result = []
        for utility in utilities_with_plants:
            # Get plant count for this utility in this session
            plant_count = db.query(DBPowerPlant).filter(
                DBPowerPlant.utility_id == utility.id,
                DBPowerPlant.game_session_id == session_id
            ).count()
            
            # Get total capacity
            plants = db.query(DBPowerPlant).filter(
                DBPowerPlant.utility_id == utility.id,
                DBPowerPlant.game_session_id == session_id
            ).all()
            total_capacity = sum(plant.capacity_mw for plant in plants)
            
            result.append({
                "id": utility.id,
                "username": utility.username,
                "budget": utility.budget,
                "debt": utility.debt,
                "equity": utility.equity,
                "plant_count": plant_count,
                "total_capacity_mw": total_capacity
            })
        
        print(f"✅ Returning {len(result)} utilities for session {session_id}")
        return result
        
    except Exception as e:
        print(f"❌ Error getting utilities for session {session_id}: {e}")
        # Fallback: return all utilities
        all_utilities = db.query(DBUser).filter(
            DBUser.user_type == UserTypeEnum.utility
        ).all()
        
        return [
            {
                "id": utility.id,
                "username": utility.username,
                "budget": utility.budget,
                "debt": utility.debt,
                "equity": utility.equity,
                "plant_count": 0,
                "total_capacity_mw": 0
            } for utility in all_utilities
        ]

@app.get("/game-sessions/{session_id}/multi-year-analysis")
async def get_multi_year_analysis(session_id: str, db: Session = Depends(get_db)):
    # Get all market results for this session
    results = db.query(DBMarketResult).filter(
        DBMarketResult.game_session_id == session_id
    ).all()
    
    # Group by year
    yearly_data = {}
    for result in results:
        year = str(result.year)
        if year not in yearly_data:
            yearly_data[year] = {
                "total_energy": 0,
                "weighted_price_sum": 0,
                "total_value": 0
            }
        
        yearly_data[year]["total_energy"] += result.total_energy
        yearly_data[year]["weighted_price_sum"] += result.clearing_price * result.total_energy
        yearly_data[year]["total_value"] += result.clearing_price * result.total_energy
    
    # Calculate averages
    for year_data in yearly_data.values():
        if year_data["total_energy"] > 0:
            year_data["average_price"] = year_data["weighted_price_sum"] / year_data["total_energy"]
        else:
            year_data["average_price"] = 0
        
        # Mock renewable penetration and capacity utilization
        year_data["renewable_penetration"] = 0.25  # 25% renewable
        year_data["capacity_utilization"] = 0.65   # 65% utilization
    
    return {
        "session_id": session_id,
        "yearly_data": yearly_data,
        "trends": {
            "price_trend_per_year": 2.5,
            "renewable_growth_per_year": 0.02
        },
        "market_events": []
    }

# Plant Management
@app.get("/plant-templates")
async def get_plant_templates():
    return list(PLANT_TEMPLATES_DATA.values())

@app.get("/plant-templates/{plant_type}")
async def get_plant_template(plant_type: str):
    if plant_type not in PLANT_TEMPLATES_DATA:
        raise HTTPException(status_code=404, detail="Plant template not found")
    return PLANT_TEMPLATES_DATA[plant_type]

@app.post("/game-sessions/{session_id}/plants")
async def create_power_plant(
    session_id: str,
    plant: PowerPlantCreate,
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        # Get plant template for calculations
        template = PLANT_TEMPLATES_DATA.get(plant.plant_type.value)
        if not template:
            raise HTTPException(status_code=400, detail="Invalid plant type")
        
        # Calculate costs
        capacity_kw = plant.capacity_mw * 1000
        capital_cost = capacity_kw * template["overnight_cost_per_kw"]
        fixed_om_annual = capacity_kw * template["fixed_om_per_kw_year"]
        
        # Check if utility has enough budget
        utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
        if not utility:
            raise HTTPException(status_code=404, detail="Utility not found")
        
        equity_required = capital_cost * 0.3  # 30% equity financing
        if utility.budget < equity_required:
            raise HTTPException(status_code=400, detail="Insufficient budget for investment")
        
        # Create plant
        db_plant = DBPowerPlant(
            id=str(uuid.uuid4()),
            utility_id=utility_id,
            game_session_id=session_id,
            name=plant.name,
            plant_type=plant.plant_type,
            capacity_mw=plant.capacity_mw,
            construction_start_year=plant.construction_start_year,
            commissioning_year=plant.commissioning_year,
            retirement_year=plant.retirement_year,
            status=PlantStatusEnum.under_construction if plant.commissioning_year