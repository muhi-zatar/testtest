from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, Enum as SQLEnum, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import json
import uuid

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./electricity_market_yearly.db"
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
    budget = Column(Float, default=2000000000.0)  # $2B default
    debt = Column(Float, default=0.0)
    equity = Column(Float, default=2000000000.0)  # $2B default
    created_at = Column(DateTime, default=datetime.utcnow)

class DBGameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    operator_id = Column(String)
    current_year = Column(Integer, default=2025)
    start_year = Column(Integer, default=2025)
    end_year = Column(Integer, default=2035)
    state = Column(SQLEnum(GameStateEnum), default=GameStateEnum.setup)
    carbon_price_per_ton = Column(Float, default=50.0)
    demand_profile = Column(Text)  # JSON string
    fuel_prices = Column(Text)     # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

class DBPowerPlant(Base):
    __tablename__ = "power_plants"
    
    id = Column(String, primary_key=True, index=True)
    utility_id = Column(String)
    game_session_id = Column(String)
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
    maintenance_years = Column(Text, nullable=True)  # JSON string

class DBYearlyBid(Base):
    __tablename__ = "yearly_bids"
    
    id = Column(String, primary_key=True, index=True)
    utility_id = Column(String)
    plant_id = Column(String)
    game_session_id = Column(String)
    year = Column(Integer)
    market_type = Column(SQLEnum(MarketTypeEnum), default=MarketTypeEnum.day_ahead)
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
    game_session_id = Column(String)
    year = Column(Integer)
    period = Column(SQLEnum(LoadPeriodEnum))
    clearing_price = Column(Float)
    cleared_quantity = Column(Float)
    total_energy = Column(Float)
    accepted_supply_bids = Column(Text)  # JSON string
    marginal_plant = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

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

class GameSessionCreate(BaseModel):
    name: str
    operator_id: str
    start_year: Optional[int] = 2025
    end_year: Optional[int] = 2035
    carbon_price_per_ton: Optional[float] = 50.0

class GameSessionResponse(BaseModel):
    id: str
    name: str
    operator_id: str
    current_year: int
    start_year: int
    end_year: int
    state: GameStateEnum
    carbon_price_per_ton: float

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

# Plant templates data
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

# Default fuel prices
DEFAULT_FUEL_PRICES = {
    "2025": {"coal": 2.50, "natural_gas": 4.00, "uranium": 0.75},
    "2026": {"coal": 2.55, "natural_gas": 4.20, "uranium": 0.76},
    "2027": {"coal": 2.60, "natural_gas": 4.50, "uranium": 0.77},
    "2028": {"coal": 2.65, "natural_gas": 4.80, "uranium": 0.78},
    "2029": {"coal": 2.70, "natural_gas": 5.00, "uranium": 0.79},
    "2030": {"coal": 2.75, "natural_gas": 5.20, "uranium": 0.80}
}

# Default renewable availability
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

# Create FastAPI app
app = FastAPI(title="Electricity Market Game API", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "framework": "FastAPI",
        "database": "SQLite",
        "features": ["yearly_simulation", "renewable_availability", "plant_retirement"]
    }

@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Generate unique ID
    user_id = f"{user.user_type}_{user.username}_{str(uuid.uuid4())[:8]}"
    
    db_user = DBUser(
        id=user_id,
        username=user.username,
        user_type=user.user_type
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return UserResponse(
        id=db_user.id,
        username=db_user.username,
        user_type=db_user.user_type,
        budget=db_user.budget,
        debt=db_user.debt,
        equity=db_user.equity
    )

@app.get("/users", response_model=List[UserResponse])
async def get_all_users(db: Session = Depends(get_db)):
    users = db.query(DBUser).all()
    return [UserResponse(
        id=user.id,
        username=user.username,
        user_type=user.user_type,
        budget=user.budget,
        debt=user.debt,
        equity=user.equity
    ) for user in users]

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        username=user.username,
        user_type=user.user_type,
        budget=user.budget,
        debt=user.debt,
        equity=user.equity
    )

@app.get("/users/{user_id}/financial-summary")
async def get_user_financial_summary(user_id: str, game_session_id: str = Query(...), db: Session = Depends(get_db)):
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

@app.post("/game-sessions", response_model=GameSessionResponse)
async def create_game_session(session: GameSessionCreate, db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    
    # Create default demand profile
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
        fuel_prices=json.dumps(DEFAULT_FUEL_PRICES)
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return GameSessionResponse(
        id=db_session.id,
        name=db_session.name,
        operator_id=db_session.operator_id,
        current_year=db_session.current_year,
        start_year=db_session.start_year,
        end_year=db_session.end_year,
        state=db_session.state,
        carbon_price_per_ton=db_session.carbon_price_per_ton
    )

@app.get("/game-sessions/{session_id}", response_model=GameSessionResponse)
async def get_game_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    return GameSessionResponse(
        id=session.id,
        name=session.name,
        operator_id=session.operator_id,
        current_year=session.current_year,
        start_year=session.start_year,
        end_year=session.end_year,
        state=session.state,
        carbon_price_per_ton=session.carbon_price_per_ton
    )

@app.get("/game-sessions/{session_id}/dashboard")
async def get_game_dashboard(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get all plants in this session
    plants = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id).all()
    
    # Get all utilities
    utilities = db.query(DBUser).filter(DBUser.user_type == UserTypeEnum.utility).all()
    
    # Calculate summary statistics
    total_capacity = sum(plant.capacity_mw for plant in plants if plant.status == PlantStatusEnum.operating)
    total_investment = sum(plant.capital_cost_total for plant in plants)
    
    return {
        "session": {
            "id": session.id,
            "name": session.name,
            "current_year": session.current_year,
            "state": session.state,
            "carbon_price_per_ton": session.carbon_price_per_ton
        },
        "market_stats": {
            "total_capacity_mw": total_capacity,
            "total_plants": len(plants),
            "active_utilities": len(utilities),
            "total_investment": total_investment
        },
        "recent_investments": [
            {
                "plant_type": plant.plant_type.value,
                "capacity_mw": plant.capacity_mw,
                "utility_id": plant.utility_id,
                "commissioning_year": plant.commissioning_year
            }
            for plant in plants[-5:]  # Last 5 plants
        ]
    }

@app.get("/plant-templates")
async def get_plant_templates():
    templates = []
    for plant_type, data in PLANT_TEMPLATES_DATA.items():
        template = {
            "plant_type": plant_type,
            **data
        }
        templates.append(template)
    return templates

@app.get("/plant-templates/{plant_type}")
async def get_plant_template(plant_type: str):
    if plant_type not in PLANT_TEMPLATES_DATA:
        raise HTTPException(status_code=404, detail="Plant template not found")
    
    return {
        "plant_type": plant_type,
        **PLANT_TEMPLATES_DATA[plant_type]
    }

@app.post("/game-sessions/{session_id}/plants", response_model=PowerPlantResponse)
async def create_power_plant(
    session_id: str, 
    plant: PowerPlantCreate, 
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    # Verify session exists
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Verify utility exists
    utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
    if not utility:
        raise HTTPException(status_code=404, detail="Utility not found")
    
    # Get plant template
    template_data = PLANT_TEMPLATES_DATA.get(plant.plant_type.value)
    if not template_data:
        raise HTTPException(status_code=404, detail="Plant template not found")
    
    # Calculate costs
    capacity_kw = plant.capacity_mw * 1000
    capital_cost = capacity_kw * template_data["overnight_cost_per_kw"]
    fixed_om_annual = capacity_kw * template_data["fixed_om_per_kw_year"]
    
    # Check if utility has enough budget (30% equity requirement)
    equity_required = capital_cost * 0.3
    if utility.budget < equity_required:
        raise HTTPException(status_code=400, detail="Insufficient budget for this investment")
    
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
        variable_om_per_mwh=template_data["variable_om_per_mwh"],
        capacity_factor=template_data["capacity_factor_base"],
        heat_rate=template_data.get("heat_rate"),
        fuel_type=template_data.get("fuel_type"),
        min_generation_mw=plant.capacity_mw * template_data["min_generation_pct"]
    )
    
    # Update utility finances
    debt_financing = capital_cost * 0.7
    utility.budget -= equity_required
    utility.debt += debt_financing
    utility.equity -= equity_required
    
    db.add(db_plant)
    db.commit()
    db.refresh(db_plant)
    
    return PowerPlantResponse(
        id=db_plant.id,
        utility_id=db_plant.utility_id,
        name=db_plant.name,
        plant_type=db_plant.plant_type,
        capacity_mw=db_plant.capacity_mw,
        construction_start_year=db_plant.construction_start_year,
        commissioning_year=db_plant.commissioning_year,
        retirement_year=db_plant.retirement_year,
        status=db_plant.status,
        capital_cost_total=db_plant.capital_cost_total,
        fixed_om_annual=db_plant.fixed_om_annual,
        variable_om_per_mwh=db_plant.variable_om_per_mwh,
        capacity_factor=db_plant.capacity_factor,
        heat_rate=db_plant.heat_rate,
        fuel_type=db_plant.fuel_type
    )

@app.get("/game-sessions/{session_id}/plants", response_model=List[PowerPlantResponse])
async def get_power_plants(
    session_id: str, 
    utility_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id)
    
    if utility_id:
        query = query.filter(DBPowerPlant.utility_id == utility_id)
    
    plants = query.all()
    
    return [PowerPlantResponse(
        id=plant.id,
        utility_id=plant.utility_id,
        name=plant.name,
        plant_type=plant.plant_type,
        capacity_mw=plant.capacity_mw,
        construction_start_year=plant.construction_start_year,
        commissioning_year=plant.commissioning_year,
        retirement_year=plant.retirement_year,
        status=plant.status,
        capital_cost_total=plant.capital_cost_total,
        fixed_om_annual=plant.fixed_om_annual,
        variable_om_per_mwh=plant.variable_om_per_mwh,
        capacity_factor=plant.capacity_factor,
        heat_rate=plant.heat_rate,
        fuel_type=plant.fuel_type
    ) for plant in plants]

@app.put("/game-sessions/{session_id}/plants/{plant_id}/retire")
async def retire_plant(
    session_id: str, 
    plant_id: str, 
    retirement_year: int = Query(...),
    db: Session = Depends(get_db)
):
    # Verify session exists
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get the plant
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == plant_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Validate retirement year
    if retirement_year <= session.current_year:
        raise HTTPException(status_code=400, detail="Retirement year must be in the future")
    
    if retirement_year >= plant.retirement_year:
        raise HTTPException(status_code=400, detail="New retirement year must be earlier than current retirement year")
    
    # Update retirement year
    old_retirement = plant.retirement_year
    plant.retirement_year = retirement_year
    
    # If retiring immediately, update status
    if retirement_year <= session.current_year:
        plant.status = PlantStatusEnum.retired
    
    db.commit()
    
    return {
        "message": f"Plant {plant.name} retirement moved from {old_retirement} to {retirement_year}",
        "plant_id": plant_id,
        "old_retirement_year": old_retirement,
        "new_retirement_year": retirement_year,
        "status": plant.status.value
    }

@app.post("/game-sessions/{session_id}/bids", response_model=YearlyBidResponse)
async def submit_yearly_bid(
    session_id: str,
    bid: YearlyBidCreate,
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    # Verify session and plant exist
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == bid.plant_id,
        DBPowerPlant.utility_id == utility_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or not owned by utility")
    
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
        
        return YearlyBidResponse(
            id=existing_bid.id,
            utility_id=existing_bid.utility_id,
            plant_id=existing_bid.plant_id,
            year=existing_bid.year,
            off_peak_quantity=existing_bid.off_peak_quantity,
            shoulder_quantity=existing_bid.shoulder_quantity,
            peak_quantity=existing_bid.peak_quantity,
            off_peak_price=existing_bid.off_peak_price,
            shoulder_price=existing_bid.shoulder_price,
            peak_price=existing_bid.peak_price
        )
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
        
        return YearlyBidResponse(
            id=db_bid.id,
            utility_id=db_bid.utility_id,
            plant_id=db_bid.plant_id,
            year=db_bid.year,
            off_peak_quantity=db_bid.off_peak_quantity,
            shoulder_quantity=db_bid.shoulder_quantity,
            peak_quantity=db_bid.peak_quantity,
            off_peak_price=db_bid.off_peak_price,
            shoulder_price=db_bid.shoulder_price,
            peak_price=db_bid.peak_price
        )

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
    
    bids = query.all()
    
    return [YearlyBidResponse(
        id=bid.id,
        utility_id=bid.utility_id,
        plant_id=bid.plant_id,
        year=bid.year,
        off_peak_quantity=bid.off_peak_quantity,
        shoulder_quantity=bid.shoulder_quantity,
        peak_quantity=bid.peak_quantity,
        off_peak_price=bid.off_peak_price,
        shoulder_price=bid.shoulder_price,
        peak_price=bid.peak_price
    ) for bid in bids]

@app.get("/game-sessions/{session_id}/fuel-prices/{year}")
async def get_fuel_prices(session_id: str, year: int, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    fuel_prices_data = json.loads(session.fuel_prices)
    year_prices = fuel_prices_data.get(str(year), fuel_prices_data.get("2025", {}))
    
    return {
        "year": year,
        "fuel_prices": year_prices,
        "currency": "USD/MMBtu"
    }

@app.get("/game-sessions/{session_id}/renewable-availability/{year}")
async def get_renewable_availability(session_id: str, year: int, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get renewable availability for the year
    availability_data = DEFAULT_RENEWABLE_AVAILABILITY.get(str(year), DEFAULT_RENEWABLE_AVAILABILITY.get("2025", {}))
    
    # Generate impact analysis
    solar_impact = "positive" if availability_data["solar_availability"] > 1.05 else "negative" if availability_data["solar_availability"] < 0.95 else "neutral"
    wind_impact = "positive" if availability_data["wind_availability"] > 1.05 else "negative" if availability_data["wind_availability"] < 0.95 else "neutral"
    
    recommendations = []
    if solar_impact == "positive":
        recommendations.append("Consider increasing solar capacity bids due to favorable conditions")
    elif solar_impact == "negative":
        recommendations.append("Reduce solar capacity bids due to poor weather conditions")
    
    if wind_impact == "positive":
        recommendations.append("Wind conditions are excellent - maximize wind generation bids")
    elif wind_impact == "negative":
        recommendations.append("Wind conditions are poor - consider backup thermal generation")
    
    if solar_impact == "negative" and wind_impact == "negative":
        recommendations.append("Both solar and wind conditions are challenging - thermal plants may see higher prices")
    
    return {
        "year": year,
        "renewable_availability": availability_data,
        "impact_analysis": {
            "solar_impact": solar_impact,
            "wind_impact": wind_impact,
            "recommendations": recommendations
        }
    }

@app.get("/game-sessions/{session_id}/market-results")
async def get_market_results(
    session_id: str,
    year: Optional[int] = Query(None),
    period: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DBMarketResult).filter(DBMarketResult.game_session_id == session_id)
    
    if year:
        query = query.filter(DBMarketResult.year == year)
    
    if period:
        query = query.filter(DBMarketResult.period == period)
    
    results = query.all()
    
    return [
        {
            "year": result.year,
            "period": result.period.value,
            "clearing_price": result.clearing_price,
            "cleared_quantity": result.cleared_quantity,
            "total_energy": result.total_energy,
            "accepted_supply_bids": json.loads(result.accepted_supply_bids) if result.accepted_supply_bids else [],
            "marginal_plant": result.marginal_plant,
            "timestamp": result.timestamp.isoformat()
        }
        for result in results
    ]

@app.put("/game-sessions/{session_id}/state")
async def update_game_state(session_id: str, new_state: GameStateEnum = Query(...), db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    session.state = new_state
    db.commit()
    
    return {
        "message": f"Game state updated to {new_state.value}",
        "session_id": session_id,
        "new_state": new_state.value
    }

@app.put("/game-sessions/{session_id}/advance-year")
async def advance_year(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if session.current_year >= session.end_year:
        session.state = GameStateEnum.game_complete
        db.commit()
        return {
            "message": "Game completed",
            "session_id": session_id,
            "current_year": session.current_year,
            "state": session.state.value
        }
    
    session.current_year += 1
    session.state = GameStateEnum.year_planning
    db.commit()
    
    return {
        "message": f"Advanced to year {session.current_year}",
        "session_id": session_id,
        "current_year": session.current_year,
        "state": session.state.value
    }

@app.post("/sample-data/create")
async def create_sample_data(db: Session = Depends(get_db)):
    try:
        # Check if sample data already exists
        existing_session = db.query(DBGameSession).filter(DBGameSession.id == "sample_game_1").first()
        if existing_session:
            return {
                "message": "Sample data already exists",
                "game_session_id": "sample_game_1",
                "operator_id": "operator_1",
                "utility_ids": ["utility_1", "utility_2", "utility_3"]
            }
        
        # Create operator
        operator = DBUser(
            id="operator_1",
            username="instructor",
            user_type=UserTypeEnum.operator,
            budget=10000000000,
            debt=0.0,
            equity=10000000000
        )
        db.add(operator)
        
        # Create utilities
        utility_budgets = [2000000000, 1500000000, 1800000000]
        for i in range(1, 4):
            utility = DBUser(
                id=f"utility_{i}",
                username=f"utility_{i}",
                user_type=UserTypeEnum.utility,
                budget=utility_budgets[i-1],
                debt=0.0,
                equity=utility_budgets[i-1]
            )
            db.add(utility)
        
        # Create game session
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
            fuel_prices=json.dumps(DEFAULT_FUEL_PRICES)
        )
        db.add(game_session)
        
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
            template_data = PLANT_TEMPLATES_DATA[plant_type]
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
                capital_cost_total=capacity_kw * template_data["overnight_cost_per_kw"],
                fixed_om_annual=capacity_kw * template_data["fixed_om_per_kw_year"],
                variable_om_per_mwh=template_data["variable_om_per_mwh"],
                capacity_factor=template_data["capacity_factor_base"],
                heat_rate=template_data.get("heat_rate"),
                fuel_type=template_data.get("fuel_type"),
                min_generation_mw=capacity * template_data["min_generation_pct"],
                maintenance_years=json.dumps([])
            )
            db.add(plant)
        
        db.commit()
        
        return {
            "message": "Sample data created successfully",
            "game_session_id": "sample_game_1",
            "operator_id": "operator_1",
            "utility_ids": ["utility_1", "utility_2", "utility_3"],
            "simulation_period": "2025-2035",
            "total_capacity_mw": 3200,
            "technologies": ["coal", "natural_gas_cc", "natural_gas_ct", "nuclear", "solar", "wind_onshore", "wind_offshore", "battery"]
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating sample data: {str(e)}")

# Create tables
Base.metadata.create_all(bind=engine)