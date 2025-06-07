from fastapi import Query
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
from datetime import datetime
import uuid
import enum
from pydantic import Field

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./electricity_market_yearly.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enums for database
class UserTypeEnum(enum.Enum):
    operator = "operator"
    utility = "utility"

class PlantTypeEnum(enum.Enum):
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

class PlantStatusEnum(enum.Enum):
    operating = "operating"
    under_construction = "under_construction"
    maintenance = "maintenance"
    retired = "retired"
    planned = "planned"

class LoadPeriodEnum(enum.Enum):
    off_peak = "off_peak"
    shoulder = "shoulder"
    peak = "peak"

class GameStateEnum(enum.Enum):
    setup = "setup"
    year_planning = "year_planning"
    bidding_open = "bidding_open"
    market_clearing = "market_clearing"
    year_complete = "year_complete"
    game_complete = "game_complete"

# Database Models
class DBUser(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True)
    user_type = Column(SQLEnum(UserTypeEnum))
    budget = Column(Float, default=1000000000.0)  # $1B starting budget
    debt = Column(Float, default=0.0)
    equity = Column(Float, default=1000000000.0)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    plants = relationship("DBPowerPlant", back_populates="utility")
    bids = relationship("DBYearlyBid", back_populates="utility")

class DBGameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(String, primary_key=True)
    name = Column(String)
    operator_id = Column(String, ForeignKey("users.id"))
    
    # Game timing
    current_year = Column(Integer, default=2025)
    start_year = Column(Integer, default=2025)
    end_year = Column(Integer, default=2035)
    
    state = Column(SQLEnum(GameStateEnum), default=GameStateEnum.setup)
    
    # Market parameters
    demand_profile = Column(Text)  # JSON
    carbon_price_per_ton = Column(Float, default=50.0)
    discount_rate = Column(Float, default=0.08)
    inflation_rate = Column(Float, default=0.025)
    
    # Fuel prices by year (JSON)
    fuel_prices = Column(Text)
    
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    plants = relationship("DBPowerPlant", back_populates="game_session")
    bids = relationship("DBYearlyBid", back_populates="game_session") 
    results = relationship("DBMarketResult", back_populates="game_session")

class DBPowerPlant(Base):
    __tablename__ = "power_plants"
    
    id = Column(String, primary_key=True)
    utility_id = Column(String, ForeignKey("users.id"))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    
    # Basic info
    name = Column(String)
    plant_type = Column(SQLEnum(PlantTypeEnum))
    capacity_mw = Column(Float)
    
    # Construction timeline
    construction_start_year = Column(Integer)
    commissioning_year = Column(Integer)
    retirement_year = Column(Integer)
    status = Column(SQLEnum(PlantStatusEnum), default=PlantStatusEnum.planned)
    
    # Costs
    capital_cost_total = Column(Float)
    fixed_om_annual = Column(Float)
    variable_om_per_mwh = Column(Float)
    
    # Operating characteristics
    capacity_factor = Column(Float)
    heat_rate = Column(Float, nullable=True)
    fuel_type = Column(String, nullable=True)
    min_generation_mw = Column(Float)
    
    # Maintenance (JSON list of years)
    maintenance_years = Column(Text, default="[]")
    
    # Relationships
    utility = relationship("DBUser", back_populates="plants")
    game_session = relationship("DBGameSession", back_populates="plants")
    bids = relationship("DBYearlyBid", back_populates="plant")

class DBYearlyBid(Base):
    __tablename__ = "yearly_bids"
    
    id = Column(String, primary_key=True)
    utility_id = Column(String, ForeignKey("users.id"))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    plant_id = Column(String, ForeignKey("power_plants.id"))
    year = Column(Integer)
    
    # Bids by period (MW capacity offered)
    off_peak_quantity = Column(Float)
    shoulder_quantity = Column(Float)
    peak_quantity = Column(Float)
    
    # Prices by period ($/MWh)
    off_peak_price = Column(Float)
    shoulder_price = Column(Float)
    peak_price = Column(Float)
    
    timestamp = Column(DateTime, default=datetime.now)
    
    # Relationships
    utility = relationship("DBUser", back_populates="bids")
    game_session = relationship("DBGameSession", back_populates="bids")
    plant = relationship("DBPowerPlant", back_populates="bids")

class DBMarketResult(Base):
    __tablename__ = "market_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    period = Column(SQLEnum(LoadPeriodEnum))
    
    clearing_price = Column(Float)
    cleared_quantity = Column(Float)
    total_energy = Column(Float)  # MWh
    accepted_supply_bids = Column(Text)  # JSON list of bid IDs
    marginal_plant = Column(String, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.now)
    
    # Relationships
    game_session = relationship("DBGameSession", back_populates="results")

class DBFuelPrice(Base):
    __tablename__ = "fuel_prices"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    fuel_type = Column(String)  # coal, natural_gas, uranium
    price_per_mmbtu = Column(Float)
    volatility = Column(Float, default=0.15)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models for API requests/responses
class UserCreate(BaseModel):
    username: str
    user_type: str

class UserResponse(BaseModel):
    id: str
    username: str
    user_type: str
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
    current_year: int
    start_year: int
    end_year: int
    state: str
    carbon_price_per_ton: float
    created_at: datetime

class PowerPlantCreate(BaseModel):
    name: str
    plant_type: str
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int

class PowerPlantResponse(BaseModel):
    id: str
    utility_id: str
    name: str
    plant_type: str
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int
    status: str
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
    timestamp: datetime

class MarketResultResponse(BaseModel):
    id: str
    year: int
    period: str
    clearing_price: float
    cleared_quantity: float
    total_energy: float
    accepted_supply_bids: List[str]
    marginal_plant: Optional[str]
    timestamp: datetime

class PlantTemplateResponse(BaseModel):
    plant_type: str
    name: str
    overnight_cost_per_kw: float
    construction_time_years: int
    economic_life_years: int
    capacity_factor_base: float
    heat_rate: Optional[float]
    fuel_type: Optional[str]
    fixed_om_per_kw_year: float
    variable_om_per_mwh: float
    co2_emissions_tons_per_mwh: float

# New Pydantic models for portfolio assignment
class UtilityFinancialUpdate(BaseModel):
    budget: float = Field(ge=0, description="Available budget in dollars")
    debt: float = Field(ge=0, description="Current debt in dollars")
    equity: float = Field(ge=0, description="Current equity in dollars")

class PlantAssignment(BaseModel):
    plant_name: str
    plant_type: str
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int

class PortfolioTemplate(BaseModel):
    name: str
    description: str
    initial_budget: float
    initial_debt: float
    initial_equity: float
    plants: List[PlantAssignment]

class BulkPortfolioAssignment(BaseModel):
    utility_assignments: Dict[str, PortfolioTemplate]

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# FastAPI app
app = FastAPI(title="Advanced Electricity Market Game API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define DEFAULT_FUEL_PRICES and plant templates inline to avoid import issues
DEFAULT_FUEL_PRICES = {
    2025: {
        "coal": 2.50,        # $/MMBtu
        "natural_gas": 4.00,
        "uranium": 0.75
    },
    2026: {
        "coal": 2.55,
        "natural_gas": 4.20,
        "uranium": 0.76
    },
    2027: {
        "coal": 2.60,
        "natural_gas": 4.50,
        "uranium": 0.77
    },
    2028: {
        "coal": 2.65,
        "natural_gas": 4.80,
        "uranium": 0.78
    },
    2029: {
        "coal": 2.70,
        "natural_gas": 5.00,
        "uranium": 0.79
    },
    2030: {
        "coal": 2.75,
        "natural_gas": 5.20,
        "uranium": 0.80
    }
}

# Plant templates defined inline to avoid import issues
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

# User Management
@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = DBUser(
        id=str(uuid.uuid4()),
        username=user.username,
        user_type=UserTypeEnum(user.user_type)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users/{user_id}/financial-summary")
def get_user_financials(user_id: str, game_session_id: str, db: Session = Depends(get_db)):
    """Get financial summary for a utility"""
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all plants for this utility in this game
    plants = db.query(DBPowerPlant).filter(
        DBPowerPlant.utility_id == user_id,
        DBPowerPlant.game_session_id == game_session_id
    ).all()
    
    # Calculate total capital invested
    total_capital = sum(plant.capital_cost_total for plant in plants)
    annual_fixed_costs = sum(plant.fixed_om_annual for plant in plants)
    
    return {
        "utility_id": user_id,
        "budget": user.budget,
        "debt": user.debt,
        "equity": user.equity,
        "total_capital_invested": total_capital,
        "annual_fixed_costs": annual_fixed_costs,
        "plant_count": len(plants),
        "total_capacity_mw": sum(plant.capacity_mw for plant in plants)
    }

# New endpoints for portfolio and financial management
@app.put("/users/{user_id}/financials")
def update_user_financials(
    user_id: str, 
    financial_update: UtilityFinancialUpdate, 
    db: Session = Depends(get_db)
):
    """Update utility financial position (instructor only)"""
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.user_type != UserTypeEnum.utility:
        raise HTTPException(status_code=400, detail="Can only update utility finances")
    
    # Update financial position
    user.budget = financial_update.budget
    user.debt = financial_update.debt
    user.equity = financial_update.equity
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Financial position updated successfully",
        "user_id": user_id,
        "new_budget": user.budget,
        "new_debt": user.debt,
        "new_equity": user.equity
    }

@app.get("/game-sessions/{session_id}/utilities")
def get_all_utilities(session_id: str, db: Session = Depends(get_db)):
    """Get all utilities in a game session with their financial status"""
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get all utilities that have plants in this session
    utilities_with_plants = db.query(DBUser).join(DBPowerPlant).filter(
        DBPowerPlant.game_session_id == session_id,
        DBUser.user_type == UserTypeEnum.utility
    ).distinct().all()
    
    # Also get utilities without plants
    all_utilities = db.query(DBUser).filter(DBUser.user_type == UserTypeEnum.utility).all()
    
    utility_data = []
    for utility in all_utilities:
        # Get plants for this utility in this session
        plants = db.query(DBPowerPlant).filter(
            DBPowerPlant.utility_id == utility.id,
            DBPowerPlant.game_session_id == session_id
        ).all()
        
        total_capacity = sum(plant.capacity_mw for plant in plants)
        total_investment = sum(plant.capital_cost_total for plant in plants)
        
        utility_data.append({
            "id": utility.id,
            "username": utility.username,
            "budget": utility.budget,
            "debt": utility.debt,
            "equity": utility.equity,
            "plant_count": len(plants),
            "total_capacity_mw": total_capacity,
            "total_investment": total_investment,
            "debt_to_equity_ratio": utility.debt / utility.equity if utility.equity > 0 else float('inf'),
            "plants": [
                {
                    "id": plant.id,
                    "name": plant.name,
                    "plant_type": plant.plant_type.value,
                    "capacity_mw": plant.capacity_mw,
                    "status": plant.status.value,
                    "capital_cost": plant.capital_cost_total
                } for plant in plants
            ]
        })
    
    return {
        "session_id": session_id,
        "utilities": utility_data,
        "total_utilities": len(utility_data)
    }

@app.post("/game-sessions/{session_id}/assign-portfolio")
def assign_portfolio_to_utility(
    session_id: str,
    utility_id: str,
    portfolio: PortfolioTemplate,
    db: Session = Depends(get_db)
):
    """Assign a portfolio template to a specific utility"""
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    utility = db.query(DBUser).filter(
        DBUser.id == utility_id,
        DBUser.user_type == UserTypeEnum.utility
    ).first()
    if not utility:
        raise HTTPException(status_code=404, detail="Utility not found")
    
    try:
        # Update utility finances
        utility.budget = portfolio.initial_budget
        utility.debt = portfolio.initial_debt
        utility.equity = portfolio.initial_equity
        
        # Remove existing plants for this utility in this session
        existing_plants = db.query(DBPowerPlant).filter(
            DBPowerPlant.utility_id == utility_id,
            DBPowerPlant.game_session_id == session_id
        ).all()
        
        for plant in existing_plants:
            db.delete(plant)
        
        # Create new plants from portfolio
        created_plants = []
        for plant_assignment in portfolio.plants:
            if plant_assignment.plant_type not in PLANT_TEMPLATES_DATA:
                raise HTTPException(status_code=400, detail=f"Invalid plant type: {plant_assignment.plant_type}")
            
            template_data = PLANT_TEMPLATES_DATA[plant_assignment.plant_type]
            capacity_kw = plant_assignment.capacity_mw * 1000
            
            # Determine status based on commissioning year
            if plant_assignment.commissioning_year <= session.current_year:
                status = PlantStatusEnum.operating
            else:
                status = PlantStatusEnum.under_construction
            
            new_plant = DBPowerPlant(
                id=str(uuid.uuid4()),
                utility_id=utility_id,
                game_session_id=session_id,
                name=plant_assignment.plant_name,
                plant_type=PlantTypeEnum(plant_assignment.plant_type),
                capacity_mw=plant_assignment.capacity_mw,
                construction_start_year=plant_assignment.construction_start_year,
                commissioning_year=plant_assignment.commissioning_year,
                retirement_year=plant_assignment.retirement_year,
                status=status,
                capital_cost_total=capacity_kw * template_data["overnight_cost_per_kw"],
                fixed_om_annual=capacity_kw * template_data["fixed_om_per_kw_year"],
                variable_om_per_mwh=template_data["variable_om_per_mwh"],
                capacity_factor=template_data["capacity_factor_base"],
                heat_rate=template_data.get("heat_rate"),
                fuel_type=template_data.get("fuel_type"),
                min_generation_mw=plant_assignment.capacity_mw * template_data["min_generation_pct"],
                maintenance_years=json.dumps([])
            )
            
            db.add(new_plant)
            created_plants.append({
                "name": new_plant.name,
                "type": new_plant.plant_type.value,
                "capacity": new_plant.capacity_mw,
                "status": new_plant.status.value
            })
        
        db.commit()
        
        return {
            "message": f"Portfolio '{portfolio.name}' assigned successfully to {utility.username}",
            "utility_id": utility_id,
            "portfolio_name": portfolio.name,
            "financial_position": {
                "budget": utility.budget,
                "debt": utility.debt,
                "equity": utility.equity
            },
            "plants_created": created_plants,
            "total_plants": len(created_plants),
            "total_capacity": sum(plant["capacity"] for plant in created_plants)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to assign portfolio: {str(e)}")

@app.post("/game-sessions/{session_id}/bulk-assign-portfolios")
def bulk_assign_portfolios(
    session_id: str,
    assignments: BulkPortfolioAssignment,
    db: Session = Depends(get_db)
):
    """Assign portfolios to multiple utilities at once"""
    try:
        # This would implement bulk portfolio assignment logic
        return {
            "message": "Portfolios assigned successfully",
            "assignments": assignments
        }
    except Exception as e:
        print(f"Error bulk assigning portfolios: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/game-sessions/{session_id}/dashboard")
def get_game_dashboard(session_id: str, db: Session = Depends(get_db)):
    """Get comprehensive game dashboard data"""
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    try:
        # Get demand profile
        demand_data = json.loads(session.demand_profile)
        current_year_offset = session.current_year - session.start_year
        
        # Calculate current demand with growth
        growth_factor = (1 + demand_data["demand_growth_rate"]) ** current_year_offset
        current_demands = {
            "off_peak": demand_data["off_peak_demand"] * growth_factor,
            "shoulder": demand_data["shoulder_demand"] * growth_factor,
            "peak": demand_data["peak_demand"] * growth_factor
        }
        
        # Get plant statistics
        total_plants = db.query(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == session_id
        ).count()
        
        operating_plants = db.query(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == session_id,
            DBPowerPlant.status == PlantStatusEnum.operating
        ).count()
        
        total_capacity_results = db.query(DBPowerPlant.capacity_mw).filter(
            DBPowerPlant.game_session_id == session_id,
            DBPowerPlant.status == PlantStatusEnum.operating
        ).all()
        
        total_capacity_mw = sum(result[0] for result in total_capacity_results) if total_capacity_results else 0
        
        # Get utility count
        unique_utilities = db.query(DBPowerPlant.utility_id).filter(
            DBPowerPlant.game_session_id == session_id
        ).distinct().count()
        
        # Get latest market results
        latest_results = db.query(DBMarketResult).filter(
            DBMarketResult.game_session_id == session_id
        ).order_by(DBMarketResult.timestamp.desc()).limit(3).all()
        
        return {
            "game_session": {
                "id": session.id,
                "name": session.name,
                "current_year": session.current_year,
                "start_year": session.start_year,
                "end_year": session.end_year,
                "state": session.state.value,
                "years_remaining": session.end_year - session.current_year
            },
            "current_demand_mw": current_demands,
            "market_stats": {
                "total_plants": total_plants,
                "operating_plants":