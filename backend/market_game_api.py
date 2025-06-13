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

# Database setup
DATABASE_URL = "sqlite:///./electricity_market_yearly.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
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
    budget = Column(Float, default=2000000000.0)  # $2B default
    debt = Column(Float, default=0.0)
    equity = Column(Float, default=2000000000.0)  # $2B default
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    game_sessions = relationship("DBGameSession", back_populates="operator")
    power_plants = relationship("DBPowerPlant", back_populates="utility")
    yearly_bids = relationship("DBYearlyBid", back_populates="utility")

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
    renewable_availability = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    operator = relationship("DBUser", back_populates="game_sessions")
    power_plants = relationship("DBPowerPlant", back_populates="game_session")
    yearly_bids = relationship("DBYearlyBid", back_populates="game_session")
    market_results = relationship("DBMarketResult", back_populates="game_session")

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
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    utility = relationship("DBUser", back_populates="power_plants")
    game_session = relationship("DBGameSession", back_populates="power_plants")
    yearly_bids = relationship("DBYearlyBid", back_populates="plant")

class DBYearlyBid(Base):
    __tablename__ = "yearly_bids"
    
    id = Column(String, primary_key=True, index=True)
    utility_id = Column(String, ForeignKey("users.id"))
    plant_id = Column(String, ForeignKey("power_plants.id"))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    market_type = Column(SQLEnum(MarketTypeEnum), default=MarketTypeEnum.day_ahead)
    
    # Bid quantities (MW)
    off_peak_quantity = Column(Float)
    shoulder_quantity = Column(Float)
    peak_quantity = Column(Float)
    
    # Bid prices ($/MWh)
    off_peak_price = Column(Float)
    shoulder_price = Column(Float)
    peak_price = Column(Float)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    utility = relationship("DBUser", back_populates="yearly_bids")
    plant = relationship("DBPowerPlant", back_populates="yearly_bids")
    game_session = relationship("DBGameSession", back_populates="yearly_bids")

class DBMarketResult(Base):
    __tablename__ = "market_results"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    period = Column(SQLEnum(LoadPeriodEnum))
    market_type = Column(SQLEnum(MarketTypeEnum), default=MarketTypeEnum.day_ahead)
    clearing_price = Column(Float)
    cleared_quantity = Column(Float)
    total_energy = Column(Float)
    accepted_supply_bids = Column(Text)  # JSON array of bid IDs
    marginal_plant = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    game_session = relationship("DBGameSession", back_populates="market_results")

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    user_type: UserTypeEnum

class UserResponse(BaseModel):
    id: str
    username: str
    user_type: UserTypeEnum
    budget: float
    debt: float
    equity: float
    created_at: datetime

class GameSessionCreate(BaseModel):
    name: str
    operator_id: str
    start_year: int = 2025
    end_year: int = 2035
    carbon_price_per_ton: float = 50.0

class GameSessionResponse(BaseModel):
    id: str
    name: str
    operator_id: str
    start_year: int
    end_year: int
    current_year: int
    state: GameStateEnum
    carbon_price_per_ton: float
    created_at: datetime

class PowerPlantCreate(BaseModel):
    name: str
    plant_type: PlantTypeEnum
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int

class PowerPlantResponse(BaseModel):
    id: str
    utility_id: str
    name: str
    plant_type: PlantTypeEnum
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int
    status: PlantStatusEnum
    capital_cost_total: float
    fixed_om_annual: float
    variable_om_per_mwh: float
    capacity_factor: float
    heat_rate: Optional[float]
    fuel_type: Optional[str]
    min_generation_mw: float

class YearlyBidCreate(BaseModel):
    plant_id: str
    year: int
    off_peak_quantity: float
    shoulder_quantity: float
    peak_quantity: float
    off_peak_price: float
    shoulder_price: float
    peak_price: float

class YearlyBidResponse(BaseModel):
    id: str
    utility_id: str
    plant_id: str
    year: int
    off_peak_quantity: float
    shoulder_quantity: float
    peak_quantity: float
    off_peak_price: float
    shoulder_price: float
    peak_price: float
    timestamp: datetime

class MarketResultResponse(BaseModel):
    id: str
    year: int
    period: LoadPeriodEnum
    clearing_price: float
    cleared_quantity: float
    total_energy: float
    marginal_plant: Optional[str]
    timestamp: datetime

class UtilityFinancialsUpdate(BaseModel):
    budget: float
    debt: float
    equity: float

class MarketParametersUpdate(BaseModel):
    fuel_prices: Optional[Dict[str, float]] = None
    demand_profile: Optional[Dict[str, float]] = None
    renewable_availability: Optional[Dict[str, float]] = None
    carbon_price: Optional[float] = None

# Plant Templates Data
PLANT_TEMPLATES_DATA = {
    "coal": {
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

# Default fuel prices by year
DEFAULT_FUEL_PRICES = {
    "2025": {"coal": 2.50, "natural_gas": 4.00, "uranium": 0.75},
    "2026": {"coal": 2.55, "natural_gas": 4.20, "uranium": 0.76},
    "2027": {"coal": 2.60, "natural_gas": 4.50, "uranium": 0.77},
    "2028": {"coal": 2.65, "natural_gas": 4.80, "uranium": 0.78},
    "2029": {"coal": 2.70, "natural_gas": 5.00, "uranium": 0.79},
    "2030": {"coal": 2.75, "natural_gas": 5.20, "uranium": 0.80}
}

# Default renewable availability by year
DEFAULT_RENEWABLE_AVAILABILITY = {
    "2025": {"solar_availability": 1.0, "wind_availability": 1.0, "weather_description": "Normal weather conditions"},
    "2026": {"solar_availability": 1.1, "wind_availability": 0.9, "weather_description": "Above-average solar, below-average wind"},
    "2027": {"solar_availability": 0.8, "wind_availability": 1.2, "weather_description": "Cloudy year, strong wind patterns"},
    "2028": {"solar_availability": 1.2, "wind_availability": 1.1, "weather_description": "Excellent renewable conditions"},
    "2029": {"solar_availability": 0.9, "wind_availability": 0.8, "weather_description": "Challenging renewable year"},
    "2030": {"solar_availability": 1.0, "wind_availability": 1.0, "weather_description": "Return to normal conditions"}
}

# Database dependency
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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "framework": "FastAPI",
        "database": "SQLite",
        "features": ["yearly_simulation", "investment_analysis", "market_orchestration"]
    }

# User endpoints
@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Generate unique ID
    user_id = f"{user.username.lower().replace(' ', '_')}_{str(uuid.uuid4())[:8]}"
    
    # Check if username already exists
    existing_user = db.query(DBUser).filter(DBUser.username == user.username).first()
    if existing_user:
        # Make username unique by adding timestamp
        user.username = f"{user.username}_{int(datetime.now().timestamp())}"
    
    db_user = DBUser(
        id=user_id,
        username=user.username,
        user_type=user.user_type,
        budget=2000000000.0 if user.user_type == UserTypeEnum.utility else 10000000000.0,
        debt=0.0,
        equity=2000000000.0 if user.user_type == UserTypeEnum.utility else 10000000000.0
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.get("/users", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    return db.query(DBUser).all()

@app.get("/users/{user_id}", response_model=UserResponse)
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
    plant_count = len(plants)
    
    return {
        "utility_id": user_id,
        "budget": user.budget,
        "debt": user.debt,
        "equity": user.equity,
        "total_capital_invested": total_investment,
        "annual_fixed_costs": annual_fixed_costs,
        "plant_count": plant_count,
        "total_capacity_mw": total_capacity
    }

@app.put("/users/{user_id}/financials")
async def update_user_financials(
    user_id: str,
    financials: UtilityFinancialsUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.budget = financials.budget
    user.debt = financials.debt
    user.equity = financials.equity
    
    db.commit()
    db.refresh(user)
    
    return {"message": "Financial data updated successfully", "user": user}

# Game Session endpoints
@app.post("/game-sessions", response_model=GameSessionResponse)
async def create_game_session(session: GameSessionCreate, db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    
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
        id=session_id,
        name=session.name,
        operator_id=session.operator_id,
        start_year=session.start_year,
        end_year=session.end_year,
        current_year=session.start_year,
        carbon_price_per_ton=session.carbon_price_per_ton,
        demand_profile=json.dumps(demand_profile),
        fuel_prices=json.dumps(DEFAULT_FUEL_PRICES),
        renewable_availability=json.dumps(DEFAULT_RENEWABLE_AVAILABILITY)
    )
    
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return db_session

@app.get("/game-sessions/{session_id}", response_model=GameSessionResponse)
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
    db.refresh(session)
    
    return {"message": f"Game state updated to {new_state}", "session": session}

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
    db.refresh(session)
    
    return {
        "message": f"Advanced to year {session.current_year}",
        "current_year": session.current_year,
        "state": session.state
    }

@app.get("/game-sessions/{session_id}/dashboard")
async def get_game_dashboard(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get all plants in this session
    plants = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id).all()
    
    # Get all utilities in this session
    utility_ids = list(set(plant.utility_id for plant in plants))
    utilities = db.query(DBUser).filter(DBUser.id.in_(utility_ids)).all() if utility_ids else []
    
    # Calculate summary statistics
    total_capacity = sum(plant.capacity_mw for plant in plants)
    operating_capacity = sum(plant.capacity_mw for plant in plants if plant.status == PlantStatusEnum.operating)
    
    # Get recent market results
    recent_results = db.query(DBMarketResult).filter(
        DBMarketResult.game_session_id == session_id
    ).order_by(DBMarketResult.timestamp.desc()).limit(10).all()
    
    return {
        "session": session,
        "market_stats": {
            "total_capacity_mw": total_capacity,
            "operating_capacity_mw": operating_capacity,
            "total_plants": len(plants),
            "active_utilities": len(utilities)
        },
        "recent_market_results": recent_results,
        "utilities": utilities
    }

@app.put("/game-sessions/{session_id}/market-parameters")
async def update_market_parameters(
    session_id: str,
    parameters: MarketParametersUpdate,
    year: int = Query(...),
    db: Session = Depends(get_db)
):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Update fuel prices
    if parameters.fuel_prices:
        fuel_prices = json.loads(session.fuel_prices) if session.fuel_prices else {}
        fuel_prices[str(year)] = parameters.fuel_prices
        session.fuel_prices = json.dumps(fuel_prices)
    
    # Update demand profile
    if parameters.demand_profile:
        demand_profile = json.loads(session.demand_profile) if session.demand_profile else {}
        demand_profile.update(parameters.demand_profile)
        session.demand_profile = json.dumps(demand_profile)
    
    # Update renewable availability
    if parameters.renewable_availability:
        renewable_availability = json.loads(session.renewable_availability) if session.renewable_availability else {}
        renewable_availability[str(year)] = parameters.renewable_availability
        session.renewable_availability = json.dumps(renewable_availability)
    
    # Update carbon price
    if parameters.carbon_price:
        session.carbon_price_per_ton = parameters.carbon_price
    
    db.commit()
    db.refresh(session)
    
    return {
        "message": f"Market parameters updated for year {year}",
        "session": session
    }

@app.get("/game-sessions/{session_id}/utilities")
async def get_game_utilities(session_id: str, db: Session = Depends(get_db)):
    # Get all plants in this session to find utilities
    plants = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id).all()
    utility_ids = list(set(plant.utility_id for plant in plants))
    
    if not utility_ids:
        return []
    
    utilities = db.query(DBUser).filter(DBUser.id.in_(utility_ids)).all()
    
    # Add portfolio information
    result = []
    for utility in utilities:
        utility_plants = [p for p in plants if p.utility_id == utility.id]
        total_capacity = sum(plant.capacity_mw for plant in utility_plants)
        plant_count = len(utility_plants)
        
        result.append({
            "id": utility.id,
            "username": utility.username,
            "user_type": utility.user_type,
            "budget": utility.budget,
            "debt": utility.debt,
            "equity": utility.equity,
            "total_capacity_mw": total_capacity,
            "plant_count": plant_count
        })
    
    return result

# Plant Template endpoints
@app.get("/plant-templates")
async def get_plant_templates():
    return [
        {
            "plant_type": plant_type,
            **template_data
        }
        for plant_type, template_data in PLANT_TEMPLATES_DATA.items()
    ]

@app.get("/plant-templates/{plant_type}")
async def get_plant_template(plant_type: str):
    if plant_type not in PLANT_TEMPLATES_DATA:
        raise HTTPException(status_code=404, detail="Plant template not found")
    
    return {
        "plant_type": plant_type,
        **PLANT_TEMPLATES_DATA[plant_type]
    }

# Power Plant endpoints
@app.post("/game-sessions/{session_id}/plants", response_model=PowerPlantResponse)
async def create_power_plant(
    session_id: str,
    plant: PowerPlantCreate,
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    # Verify game session exists
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Verify utility exists
    utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
    if not utility:
        raise HTTPException(status_code=404, detail="Utility not found")
    
    # Get plant template
    template = PLANT_TEMPLATES_DATA.get(plant.plant_type.value)
    if not template:
        raise HTTPException(status_code=404, detail="Plant template not found")
    
    # Calculate costs
    capacity_kw = plant.capacity_mw * 1000
    capital_cost = capacity_kw * template["overnight_cost_per_kw"]
    fixed_om_annual = capacity_kw * template["fixed_om_per_kw_year"]
    
    # Check if utility can afford this investment (30% equity requirement)
    equity_required = capital_cost * 0.3
    if utility.budget < equity_required:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient budget. Required: ${equity_required:,.0f}, Available: ${utility.budget:,.0f}"
        )
    
    # Create plant
    plant_id = str(uuid.uuid4())
    db_plant = DBPowerPlant(
        id=plant_id,
        utility_id=utility_id,
        game_session_id=session_id,
        name=plant.name,
        plant_type=plant.plant_type,
        capacity_mw=plant.capacity_mw,
        construction_start_year=plant.construction_start_year,
        commissioning_year=plant.commissioning_year,
        retirement_year=plant.retirement_year,
        status=PlantStatusEnum.under_construction if plant.commissioning_year > session.current_year else PlantStatusEnum.operating,
        capital_cost_total=capital_cost,
        fixed_om_annual=fixed_om_annual,
        variable_om_per_mwh=template["variable_om_per_mwh"],
        capacity_factor=template["capacity_factor_base"],
        heat_rate=template.get("heat_rate"),
        fuel_type=template.get("fuel_type"),
        min_generation_mw=plant.capacity_mw * template["min_generation_pct"],
        maintenance_years=json.dumps([])
    )
    
    # Update utility finances (70% debt, 30% equity)
    debt_financing = capital_cost * 0.7
    utility.budget -= equity_required
    utility.debt += debt_financing
    utility.equity -= equity_required
    
    db.add(db_plant)
    db.commit()
    db.refresh(db_plant)
    
    return db_plant

@app.get("/game-sessions/{session_id}/plants", response_model=List[PowerPlantResponse])
async def get_power_plants(
    session_id: str,
    utility_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id)
    
    if utility_id:
        query = query.filter(DBPowerPlant.utility_id == utility_id)
    
    return query.all()

@app.get("/game-sessions/{session_id}/plants/{plant_id}/economics")
async def get_plant_economics(
    session_id: str,
    plant_id: str,
    year: int = Query(...),
    db: Session = Depends(get_db)
):
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == plant_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get fuel prices for the year
    fuel_prices = json.loads(session.fuel_prices) if session.fuel_prices else {}
    year_fuel_prices = fuel_prices.get(str(year), fuel_prices.get("2025", {}))
    
    # Calculate marginal cost
    marginal_cost = plant.variable_om_per_mwh
    fuel_costs = 0
    
    if plant.fuel_type and plant.heat_rate:
        fuel_price = year_fuel_prices.get(plant.fuel_type, 0)
        fuel_costs = (plant.heat_rate * fuel_price) / 1000  # Convert BTU to MMBtu
        marginal_cost += fuel_costs
    
    # Add carbon cost
    template = PLANT_TEMPLATES_DATA.get(plant.plant_type.value, {})
    carbon_cost = template.get("co2_emissions_tons_per_mwh", 0) * session.carbon_price_per_ton
    marginal_cost += carbon_cost
    
    return {
        "plant_id": plant_id,
        "year": year,
        "marginal_cost_per_mwh": marginal_cost,
        "fuel_costs": fuel_costs,
        "carbon_costs": carbon_cost,
        "variable_om": plant.variable_om_per_mwh,
        "fixed_om_annual": plant.fixed_om_annual,
        "capacity_factor": plant.capacity_factor,
        "annual_generation_mwh": plant.capacity_mw * plant.capacity_factor * 8760
    }

@app.put("/game-sessions/{session_id}/plants/{plant_id}/retire")
async def retire_plant(
    session_id: str,
    plant_id: str,
    retirement_year: int = Query(...),
    db: Session = Depends(get_db)
):
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == plant_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    if retirement_year <= plant.commissioning_year:
        raise HTTPException(status_code=400, detail="Retirement year must be after commissioning year")
    
    plant.retirement_year = retirement_year
    if retirement_year <= datetime.now().year:
        plant.status = PlantStatusEnum.retired
    
    db.commit()
    db.refresh(plant)
    
    return {"message": f"Plant retirement year updated to {retirement_year}", "plant": plant}

# Yearly Bid endpoints
@app.post("/game-sessions/{session_id}/bids", response_model=YearlyBidResponse)
async def submit_yearly_bid(
    session_id: str,
    bid: YearlyBidCreate,
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    # Verify game session and state
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if session.state != GameStateEnum.bidding_open:
        raise HTTPException(status_code=400, detail="Bidding is not currently open")
    
    # Verify plant exists and belongs to utility
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == bid.plant_id,
        DBPowerPlant.utility_id == utility_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or does not belong to utility")
    
    # Check if plant is available for bidding
    if plant.status != PlantStatusEnum.operating:
        raise HTTPException(status_code=400, detail="Plant is not operating and cannot submit bids")
    
    # Check if bid already exists for this plant and year
    existing_bid = db.query(DBYearlyBid).filter(
        DBYearlyBid.plant_id == bid.plant_id,
        DBYearlyBid.year == bid.year,
        DBYearlyBid.game_session_id == session_id
    ).first()
    
    if existing_bid:
        # Update existing bid
        existing_bid.off_peak_quantity = bid.off_peak_quantity
        existing_bid.shoulder_quantity = bid.shoulder_quantity
        existing_bid.peak_quantity = bid.peak_quantity
        existing_bid.off_peak_price = bid.off_peak_price
        existing_bid.shoulder_price = bid.shoulder_price
        existing_bid.peak_price = bid.peak_price
        existing_bid.timestamp = datetime.utcnow()
        
        db.commit()
        db.refresh(existing_bid)
        return existing_bid
    else:
        # Create new bid
        bid_id = str(uuid.uuid4())
        db_bid = DBYearlyBid(
            id=bid_id,
            utility_id=utility_id,
            plant_id=bid.plant_id,
            game_session_id=session_id,
            year=bid.year,
            off_peak_quantity=bid.off_peak_quantity,
            shoulder_quantity=bid.shoulder_quantity,
            peak_quantity=bid.peak_quantity,
            off_peak_price=bid.off_peak_price,
            shoulder_price=bid.shoulder_price,
            peak_price=bid.peak_price
        )
        
        db.add(db_bid)
        db.commit()
        db.refresh(db_bid)
        return db_bid

@app.get("/game-sessions/{session_id}/bids", response_model=List[YearlyBidResponse])
async def get_yearly_bids(
    session_id: str,
    year: Optional[int] = Query(None),
    utility_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DBYearlyBid).filter(DBYearlyBid.game_session_id == session_id)
    
    if year:
        query = query.filter(DBYearlyBid.year == year)
    
    if utility_id:
        query = query.filter(DBYearlyBid.utility_id == utility_id)
    
    return query.all()

# Market Data endpoints
@app.get("/game-sessions/{session_id}/fuel-prices/{year}")
async def get_fuel_prices(session_id: str, year: int, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    fuel_prices = json.loads(session.fuel_prices) if session.fuel_prices else DEFAULT_FUEL_PRICES
    year_prices = fuel_prices.get(str(year), fuel_prices.get("2025", {}))
    
    return {
        "year": year,
        "fuel_prices": year_prices,
        "last_updated": datetime.utcnow()
    }

@app.get("/game-sessions/{session_id}/renewable-availability/{year}")
async def get_renewable_availability(session_id: str, year: int, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    renewable_data = json.loads(session.renewable_availability) if session.renewable_availability else DEFAULT_RENEWABLE_AVAILABILITY
    year_data = renewable_data.get(str(year), renewable_data.get("2025", {}))
    
    # Generate impact analysis
    solar_impact = "positive" if year_data.get("solar_availability", 1.0) > 1.1 else "negative" if year_data.get("solar_availability", 1.0) < 0.9 else "neutral"
    wind_impact = "positive" if year_data.get("wind_availability", 1.0) > 1.1 else "negative" if year_data.get("wind_availability", 1.0) < 0.9 else "neutral"
    
    recommendations = []
    if solar_impact == "positive":
        recommendations.append("Consider increasing solar capacity utilization")
    elif solar_impact == "negative":
        recommendations.append("Plan for reduced solar output, increase backup capacity")
    
    if wind_impact == "positive":
        recommendations.append("Maximize wind generation during favorable conditions")
    elif wind_impact == "negative":
        recommendations.append("Prepare for lower wind generation, adjust bidding strategy")
    
    return {
        "year": year,
        "renewable_availability": year_data,
        "impact_analysis": {
            "solar_impact": solar_impact,
            "wind_impact": wind_impact,
            "recommendations": recommendations
        }
    }

@app.get("/game-sessions/{session_id}/market-results", response_model=List[MarketResultResponse])
async def get_market_results(
    session_id: str,
    year: Optional[int] = Query(None),
    period: Optional[LoadPeriodEnum] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DBMarketResult).filter(DBMarketResult.game_session_id == session_id)
    
    if year:
        query = query.filter(DBMarketResult.year == year)
    
    if period:
        query = query.filter(DBMarketResult.period == period)
    
    return query.order_by(DBMarketResult.timestamp.desc()).all()

# Sample Data endpoint
@app.post("/sample-data/create")
async def create_sample_data(db: Session = Depends(get_db)):
    try:
        # Check if sample data already exists
        existing_operator = db.query(DBUser).filter(DBUser.id == "operator_1").first()
        if existing_operator:
            return {
                "message": "Sample data already exists",
                "game_session_id": "sample_game_1",
                "operator_id": "operator_1",
                "utility_ids": ["utility_1", "utility_2", "utility_3"]
            }
        
        # Create sample operator
        operator = DBUser(
            id="operator_1",
            username="instructor",
            user_type=UserTypeEnum.operator,
            budget=10000000000,
            debt=0.0,
            equity=10000000000
        )
        db.add(operator)
        
        # Create sample utilities
        utilities = []
        for i in range(1, 4):
            utility = DBUser(
                id=f"utility_{i}",
                username=f"utility_{i}",
                user_type=UserTypeEnum.utility,
                budget=2000000000,
                debt=0.0,
                equity=2000000000
            )
            utilities.append(utility)
            db.add(utility)
        
        db.commit()
        
        # Create sample game session
        demand_profile = {
            "off_peak_hours": 5000,
            "shoulder_hours": 2500,
            "peak_hours": 1260,
            "off_peak_demand": 1200,
            "shoulder_demand": 1800,
            "peak_demand": 2400,
            "demand_growth_rate": 0.02
        }
        
        game_session = DBGameSession(
            id="sample_game_1",
            name="Advanced Electricity Market Simulation 2025-2035",
            operator_id="operator_1",
            start_year=2025,
            end_year=2035,
            current_year=2025,
            state=GameStateEnum.setup,
            carbon_price_per_ton=50.0,
            demand_profile=json.dumps(demand_profile),
            fuel_prices=json.dumps(DEFAULT_FUEL_PRICES),
            renewable_availability=json.dumps(DEFAULT_RENEWABLE_AVAILABILITY)
        )
        db.add(game_session)
        db.commit()
        
        # Create sample plants
        sample_plants = [
            ("utility_1", "Riverside Coal Plant", "coal", 600, 2020, 2023, 2050),
            ("utility_1", "Westside Gas CC", "natural_gas_cc", 400, 2021, 2024, 2049),
            ("utility_1", "Peak Gas CT", "natural_gas_ct", 150, 2022, 2025, 2045),
            ("utility_2", "Coastal Nuclear", "nuclear", 1000, 2018, 2025, 2075),
            ("utility_2", "Solar Farm Alpha", "solar", 250, 2023, 2025, 2045),
            ("utility_2", "Wind Farm Beta", "wind_onshore", 200, 2023, 2025, 2045),
            ("utility_3", "Mega Solar Project", "solar", 400, 2024, 2026, 2046),
            ("utility_3", "Offshore Wind", "wind_offshore", 300, 2024, 2027, 2047),
            ("utility_3", "Grid Battery Storage", "battery", 100, 2025, 2026, 2036),
        ]
        
        for utility_id, name, plant_type, capacity, start_year, commission_year, retire_year in sample_plants:
            template = PLANT_TEMPLATES_DATA[plant_type]
            capacity_kw = capacity * 1000
            
            status = PlantStatusEnum.operating if commission_year <= 2025 else PlantStatusEnum.under_construction
            
            plant = DBPowerPlant(
                id=f"plant_{name.replace(' ', '_').lower()}",
                utility_id=utility_id,
                game_session_id="sample_game_1",
                name=name,
                plant_type=PlantTypeEnum(plant_type),
                capacity_mw=capacity,
                construction_start_year=start_year,
                commissioning_year=commission_year,
                retirement_year=retire_year,
                status=status,
                capital_cost_total=capacity_kw * template["overnight_cost_per_kw"],
                fixed_om_annual=capacity_kw * template["fixed_om_per_kw_year"],
                variable_om_per_mwh=template["variable_om_per_mwh"],
                capacity_factor=template["capacity_factor_base"],
                heat_rate=template.get("heat_rate"),
                fuel_type=template.get("fuel_type"),
                min_generation_mw=capacity * template["min_generation_pct"],
                maintenance_years=json.dumps([])
            )
            db.add(plant)
        
        db.commit()
        
        return {
            "message": "Sample data created successfully",
            "game_session_id": "sample_game_1",
            "operator_id": "operator_1",
            "utility_ids": ["utility_1", "utility_2", "utility_3"]
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating sample data: {str(e)}")

# Portfolio Templates endpoint
@app.get("/portfolio-templates")
async def get_portfolio_templates():
    return [
        {
            "id": "traditional_utility",
            "name": "Traditional Utility",
            "description": "Coal and natural gas focused portfolio",
            "plants": [
                {"plant_type": "coal", "capacity_mw": 600, "name": "Coal Baseload Plant"},
                {"plant_type": "natural_gas_cc", "capacity_mw": 400, "name": "Gas Combined Cycle"},
                {"plant_type": "natural_gas_ct", "capacity_mw": 200, "name": "Gas Peaker"}
            ]
        },
        {
            "id": "clean_energy",
            "name": "Clean Energy Leader",
            "description": "Nuclear and renewable focused portfolio",
            "plants": [
                {"plant_type": "nuclear", "capacity_mw": 1000, "name": "Nuclear Baseload"},
                {"plant_type": "solar", "capacity_mw": 300, "name": "Solar Farm"},
                {"plant_type": "wind_onshore", "capacity_mw": 250, "name": "Wind Farm"}
            ]
        },
        {
            "id": "renewable_pioneer",
            "name": "Renewable Pioneer",
            "description": "100% renewable with storage",
            "plants": [
                {"plant_type": "solar", "capacity_mw": 500, "name": "Mega Solar Array"},
                {"plant_type": "wind_offshore", "capacity_mw": 400, "name": "Offshore Wind"},
                {"plant_type": "battery", "capacity_mw": 200, "name": "Grid Storage"}
            ]
        }
    ]

@app.post("/game-sessions/{session_id}/assign-portfolio")
async def assign_portfolio(
    session_id: str,
    portfolio: dict,
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    # This would assign a pre-built portfolio to a utility
    # Implementation would create plants based on portfolio template
    return {"message": "Portfolio assigned successfully"}

@app.post("/game-sessions/{session_id}/bulk-assign-portfolios")
async def bulk_assign_portfolios(session_id: str, assignments: dict, db: Session = Depends(get_db)):
    # This would assign portfolios to multiple utilities at once
    return {"message": "Portfolios assigned successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)