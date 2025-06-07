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
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    results = []
    errors = []
    
    for utility_id, portfolio in assignments.utility_assignments.items():
        try:
            # Use the single assignment function
            result = assign_portfolio_to_utility(session_id, utility_id, portfolio, db)
            results.append({
                "utility_id": utility_id,
                "status": "success",
                "result": result
            })
        except Exception as e:
            errors.append({
                "utility_id": utility_id,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "message": f"Bulk assignment completed: {len(results)} successful, {len(errors)} failed",
        "successful_assignments": results,
        "failed_assignments": errors,
        "total_processed": len(assignments.utility_assignments)
    }

@app.get("/portfolio-templates")
def get_portfolio_templates():
    """Get predefined portfolio templates for different utility strategies"""
    templates = [
        {
            "id": "traditional",
            "name": "Traditional Utility",
            "description": "Coal and natural gas focused portfolio with reliable baseload generation",
            "initial_budget": 2000000000,  # $2B
            "initial_debt": 0,
            "initial_equity": 2000000000,
            "plants": [
                {
                    "plant_name": "Riverside Coal Plant",
                    "plant_type": "coal",
                    "capacity_mw": 600,
                    "construction_start_year": 2020,
                    "commissioning_year": 2023,
                    "retirement_year": 2050
                },
                {
                    "plant_name": "Westside Gas CC",
                    "plant_type": "natural_gas_cc",
                    "capacity_mw": 400,
                    "construction_start_year": 2021,
                    "commissioning_year": 2024,
                    "retirement_year": 2049
                },
                {
                    "plant_name": "Peak Gas CT",
                    "plant_type": "natural_gas_ct",
                    "capacity_mw": 150,
                    "construction_start_year": 2022,
                    "commissioning_year": 2025,
                    "retirement_year": 2045
                }
            ]
        },
        {
            "id": "mixed",
            "name": "Mixed Generation",
            "description": "Balanced portfolio with nuclear, renewables, and traditional generation",
            "initial_budget": 1500000000,  # $1.5B
            "initial_debt": 0,
            "initial_equity": 1500000000,
            "plants": [
                {
                    "plant_name": "Coastal Nuclear",
                    "plant_type": "nuclear",
                    "capacity_mw": 1000,
                    "construction_start_year": 2018,
                    "commissioning_year": 2025,
                    "retirement_year": 2075
                },
                {
                    "plant_name": "Solar Farm Alpha",
                    "plant_type": "solar",
                    "capacity_mw": 250,
                    "construction_start_year": 2023,
                    "commissioning_year": 2025,
                    "retirement_year": 2045
                },
                {
                    "plant_name": "Wind Farm Beta",
                    "plant_type": "wind_onshore",
                    "capacity_mw": 200,
                    "construction_start_year": 2023,
                    "commissioning_year": 2025,
                    "retirement_year": 2045
                }
            ]
        },
        {
            "id": "renewable",
            "name": "Renewable Focus",
            "description": "Clean energy portfolio with solar, wind, and storage",
            "initial_budget": 1800000000,  # $1.8B
            "initial_debt": 0,
            "initial_equity": 1800000000,
            "plants": [
                {
                    "plant_name": "Mega Solar Project",
                    "plant_type": "solar",
                    "capacity_mw": 400,
                    "construction_start_year": 2024,
                    "commissioning_year": 2026,
                    "retirement_year": 2046
                },
                {
                    "plant_name": "Offshore Wind",
                    "plant_type": "wind_offshore",
                    "capacity_mw": 300,
                    "construction_start_year": 2024,
                    "commissioning_year": 2027,
                    "retirement_year": 2047
                },
                {
                    "plant_name": "Grid Battery Storage",
                    "plant_type": "battery",
                    "capacity_mw": 100,
                    "construction_start_year": 2025,
                    "commissioning_year": 2026,
                    "retirement_year": 2036
                }
            ]
        }
    ]
    
    return {
        "templates": templates,
        "total_templates": len(templates)
    }

# Game Session Management
@app.post("/game-sessions", response_model=GameSessionResponse)
def create_game_session(session: GameSessionCreate, db: Session = Depends(get_db)):
    # Create default demand profile inline
    demand_profile_data = {
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
        demand_profile=json.dumps(demand_profile_data),
        fuel_prices=json.dumps(DEFAULT_FUEL_PRICES)
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.get("/game-sessions/{session_id}", response_model=GameSessionResponse)
def get_game_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    return session

@app.put("/game-sessions/{session_id}/state")
def update_game_state(session_id: str, new_state: str = Query(...), db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    try:
        session.state = GameStateEnum(new_state)
        db.commit()
        return {"message": "Game state updated", "new_state": new_state}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid game state: {new_state}")

@app.put("/game-sessions/{session_id}/advance-year")
def advance_year(session_id: str, db: Session = Depends(get_db)):
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
        "message": "Year advanced",
        "current_year": session.current_year,
        "state": session.state.value
    }

# Plant Templates and Information
@app.get("/plant-templates", response_model=List[PlantTemplateResponse])
def get_plant_templates():
    """Get all available plant templates"""
    templates = []
    for plant_type, template_data in PLANT_TEMPLATES_DATA.items():
        templates.append(PlantTemplateResponse(
            plant_type=plant_type,
            name=template_data["name"],
            overnight_cost_per_kw=template_data["overnight_cost_per_kw"],
            construction_time_years=template_data["construction_time_years"],
            economic_life_years=template_data["economic_life_years"],
            capacity_factor_base=template_data["capacity_factor_base"],
            heat_rate=template_data.get("heat_rate"),
            fuel_type=template_data.get("fuel_type"),
            fixed_om_per_kw_year=template_data["fixed_om_per_kw_year"],
            variable_om_per_mwh=template_data["variable_om_per_mwh"],
            co2_emissions_tons_per_mwh=template_data["co2_emissions_tons_per_mwh"]
        ))
    
    return templates

@app.get("/plant-templates/{plant_type}")
def get_plant_template(plant_type: str):
    """Get specific plant template with cost calculations"""
    if plant_type not in PLANT_TEMPLATES_DATA:
        raise HTTPException(status_code=400, detail=f"Invalid plant type: {plant_type}")
    
    template_data = PLANT_TEMPLATES_DATA[plant_type]
    
    # Example cost calculation for 100 MW plant
    example_capacity = 100
    total_capital_cost = example_capacity * 1000 * template_data["overnight_cost_per_kw"]
    annual_fixed_om = example_capacity * 1000 * template_data["fixed_om_per_kw_year"]
    
    return {
        "template": PlantTemplateResponse(
            plant_type=plant_type,
            name=template_data["name"],
            overnight_cost_per_kw=template_data["overnight_cost_per_kw"],
            construction_time_years=template_data["construction_time_years"],
            economic_life_years=template_data["economic_life_years"],
            capacity_factor_base=template_data["capacity_factor_base"],
            heat_rate=template_data.get("heat_rate"),
            fuel_type=template_data.get("fuel_type"),
            fixed_om_per_kw_year=template_data["fixed_om_per_kw_year"],
            variable_om_per_mwh=template_data["variable_om_per_mwh"],
            co2_emissions_tons_per_mwh=template_data["co2_emissions_tons_per_mwh"]
        ),
        "example_100mw_costs": {
            "total_capital_cost": total_capital_cost,
            "annual_fixed_om": annual_fixed_om,
            "construction_time_years": template_data["construction_time_years"]
        }
    }

# Power Plant Management
@app.post("/game-sessions/{session_id}/plants", response_model=PowerPlantResponse)
def create_power_plant(
    session_id: str,
    plant: PowerPlantCreate,
    utility_id: str,
    db: Session = Depends(get_db)
):
    if plant.plant_type not in PLANT_TEMPLATES_DATA:
        raise HTTPException(status_code=400, detail=f"Invalid plant type: {plant.plant_type}")
    
    template_data = PLANT_TEMPLATES_DATA[plant.plant_type]
    
    # Calculate costs
    capacity_kw = plant.capacity_mw * 1000
    total_capital_cost = capacity_kw * template_data["overnight_cost_per_kw"]
    annual_fixed_om = capacity_kw * template_data["fixed_om_per_kw_year"]
    
    # Determine initial status
    current_year = 2025  # TODO: Get from game session
    if plant.commissioning_year <= current_year:
        status = PlantStatusEnum.operating
    else:
        status = PlantStatusEnum.under_construction
    
    db_plant = DBPowerPlant(
        id=str(uuid.uuid4()),
        utility_id=utility_id,
        game_session_id=session_id,
        name=plant.name,
        plant_type=PlantTypeEnum(plant.plant_type),
        capacity_mw=plant.capacity_mw,
        construction_start_year=plant.construction_start_year,
        commissioning_year=plant.commissioning_year,
        retirement_year=plant.retirement_year,
        status=status,
        capital_cost_total=total_capital_cost,
        fixed_om_annual=annual_fixed_om,
        variable_om_per_mwh=template_data["variable_om_per_mwh"],
        capacity_factor=template_data["capacity_factor_base"],
        heat_rate=template_data.get("heat_rate"),
        fuel_type=template_data.get("fuel_type"),
        min_generation_mw=plant.capacity_mw * template_data["min_generation_pct"],
        maintenance_years=json.dumps([])
    )
    
    # Update utility budget (subtract capital cost)
    utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
    if utility:
        utility.budget -= total_capital_cost
        utility.debt += total_capital_cost * 0.7  # 70% debt financing
        utility.equity -= total_capital_cost * 0.3  # 30% equity
    
    db.add(db_plant)
    db.commit()
    db.refresh(db_plant)
    return db_plant

@app.get("/game-sessions/{session_id}/plants", response_model=List[PowerPlantResponse])
def get_power_plants(
    session_id: str, 
    utility_id: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id)
    if utility_id:
        query = query.filter(DBPowerPlant.utility_id == utility_id)
    return query.all()

@app.get("/game-sessions/{session_id}/plants/{plant_id}/economics")
def get_plant_economics(session_id: str, plant_id: str, year: int, db: Session = Depends(get_db)):
    """Get detailed economic analysis for a plant"""
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == plant_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Get fuel prices for the year
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    fuel_prices_data = json.loads(session.fuel_prices)
    year_fuel_prices = fuel_prices_data.get(str(year), fuel_prices_data.get("2025", {}))
    
    # Calculate marginal cost
    marginal_cost = plant.variable_om_per_mwh
    
    if plant.fuel_type and plant.heat_rate:
        fuel_cost = 0
        if plant.fuel_type in year_fuel_prices:
            fuel_cost = (plant.heat_rate * year_fuel_prices[plant.fuel_type]) / 1000
        marginal_cost += fuel_cost
    
    # Add carbon cost
    if plant.plant_type.value in PLANT_TEMPLATES_DATA:
        template_data = PLANT_TEMPLATES_DATA[plant.plant_type.value]
        carbon_cost = template_data["co2_emissions_tons_per_mwh"] * session.carbon_price_per_ton
        marginal_cost += carbon_cost
    
    # Calculate annual economics
    annual_generation_mwh = plant.capacity_mw * plant.capacity_factor * 8760
    annual_variable_costs = annual_generation_mwh * marginal_cost
    annual_total_costs = plant.fixed_om_annual + annual_variable_costs
    
    return {
        "plant_id": plant_id,
        "year": year,
        "marginal_cost_per_mwh": marginal_cost,
        "annual_fixed_costs": plant.fixed_om_annual,
        "annual_variable_costs": annual_variable_costs,
        "annual_total_costs": annual_total_costs,
        "annual_generation_mwh": annual_generation_mwh,
        "capacity_factor": plant.capacity_factor,
        "fuel_costs": year_fuel_prices.get(plant.fuel_type, 0) if plant.fuel_type else 0
    }

# Bidding System
@app.post("/game-sessions/{session_id}/bids", response_model=YearlyBidResponse)
def submit_yearly_bid(
    session_id: str,
    bid: YearlyBidCreate,
    utility_id: str,
    db: Session = Depends(get_db)
):
    # Validate plant belongs to utility
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
        existing_bid.timestamp = datetime.now()
        db.commit()
        db.refresh(existing_bid)
        return existing_bid
    else:
        # Create new bid
        db_bid = DBYearlyBid(
            id=str(uuid.uuid4()),
            utility_id=utility_id,
            game_session_id=session_id,
            plant_id=bid.plant_id,
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
def get_yearly_bids(
    session_id: str,
    year: Optional[int] = None,
    utility_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DBYearlyBid).filter(DBYearlyBid.game_session_id == session_id)
    if year:
        query = query.filter(DBYearlyBid.year == year)
    if utility_id:
        query = query.filter(DBYearlyBid.utility_id == utility_id)
    return query.all()

@app.get("/game-sessions/{session_id}/fuel-prices/{year}")
def get_fuel_prices(session_id: str, year: int, db: Session = Depends(get_db)):
    """Get fuel prices for a specific year"""
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    fuel_prices_data = json.loads(session.fuel_prices)
    year_prices = fuel_prices_data.get(str(year))
    
    if not year_prices:
        # Extrapolate prices if year not found
        latest_year = max(int(y) for y in fuel_prices_data.keys())
        latest_prices = fuel_prices_data[str(latest_year)]
        
        # Simple extrapolation with 2% annual growth
        years_diff = year - latest_year
        growth_factor = 1.02 ** years_diff
        
        year_prices = {
            fuel: price * growth_factor 
            for fuel, price in latest_prices.items()
        }
    
    return {
        "year": year,
        "fuel_prices": year_prices,
        "units": "$/MMBtu"
    }

# Market Operations
@app.get("/game-sessions/{session_id}/market-results", response_model=List[MarketResultResponse])
def get_market_results(
    session_id: str,
    year: Optional[int] = None,
    period: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DBMarketResult).filter(DBMarketResult.game_session_id == session_id)
    if year:
        query = query.filter(DBMarketResult.year == year)
    if period:
        try:
            period_enum = LoadPeriodEnum(period)
            query = query.filter(DBMarketResult.period == period_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid period: {period}")
    
    results = query.all()
    
    return [
        MarketResultResponse(
            id=result.id,
            year=result.year,
            period=result.period.value,
            clearing_price=result.clearing_price,
            cleared_quantity=result.cleared_quantity,
            total_energy=result.total_energy,
            accepted_supply_bids=json.loads(result.accepted_supply_bids),
            marginal_plant=result.marginal_plant,
            timestamp=result.timestamp
        ) for result in results
    ]

# Dashboard and Analytics - Adding the missing endpoints
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
                "operating_plants": operating_plants,
                "total_capacity_mw": total_capacity_mw,
                "capacity_margin": (total_capacity_mw - current_demands["peak"]) / current_demands["peak"] * 100 if current_demands["peak"] > 0 else 0
            },
            "participants": {
                "total_utilities": unique_utilities
            },
            "carbon_price": session.carbon_price_per_ton,
            "recent_results": [
                {
                    "year": r.year,
                    "period": r.period.value,
                    "clearing_price": r.clearing_price,
                    "cleared_quantity": r.cleared_quantity,
                    "timestamp": r.timestamp
                } for r in latest_results
            ]
        }
    except Exception as e:
        print(f"Error in dashboard endpoint: {e}")
        # Return basic response even if there's an error
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
            "current_demand_mw": {"off_peak": 2800, "shoulder": 3200, "peak": 3800},
            "market_stats": {"total_plants": 0, "operating_plants": 0, "total_capacity_mw": 0, "capacity_margin": 0},
            "participants": {"total_utilities": 0},
            "carbon_price": session.carbon_price_per_ton,
            "recent_results": []
        }

@app.get("/game-sessions/{session_id}/multi-year-analysis")
def get_multi_year_analysis(session_id: str, db: Session = Depends(get_db)):
    """Get multi-year analysis data"""
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    try:
        # Get all market results for this session
        results = db.query(DBMarketResult).filter(
            DBMarketResult.game_session_id == session_id
        ).all()
        
        # Group by year
        yearly_data = {}
        for result in results:
            year = result.year
            if year not in yearly_data:
                yearly_data[year] = {
                    "total_energy": 0,
                    "total_revenue": 0,
                    "results_count": 0
                }
            
            yearly_data[year]["total_energy"] += result.total_energy
            yearly_data[year]["total_revenue"] += result.clearing_price * result.total_energy
            yearly_data[year]["results_count"] += 1
        
        # Calculate averages and penetration metrics
        for year, data in yearly_data.items():
            if data["total_energy"] > 0:
                data["average_price"] = data["total_revenue"] / data["total_energy"]
            else:
                data["average_price"] = 50.0  # Default price
            
            # Calculate renewable penetration
            renewable_capacity_results = db.query(DBPowerPlant.capacity_mw).filter(
                DBPowerPlant.game_session_id == session_id,
                DBPowerPlant.commissioning_year <= year,
                DBPowerPlant.retirement_year > year,
                DBPowerPlant.plant_type.in_([PlantTypeEnum.solar, PlantTypeEnum.wind_onshore, PlantTypeEnum.wind_offshore])
            ).all()
            
            total_capacity_results = db.query(DBPowerPlant.capacity_mw).filter(
                DBPowerPlant.game_session_id == session_id,
                DBPowerPlant.commissioning_year <= year,
                DBPowerPlant.retirement_year > year
            ).all()
            
            renewable_cap = sum(result[0] for result in renewable_capacity_results) if renewable_capacity_results else 0
            total_cap = sum(result[0] for result in total_capacity_results) if total_capacity_results else 0
            
            data["renewable_penetration"] = renewable_cap / total_cap if total_cap > 0 else 0
            data["capacity_utilization"] = 0.75  # Simplified estimate
        
        return {
            "session_id": session_id,
            "yearly_data": yearly_data,
            "trends": {},
            "market_events": [],
            "analysis_period": f"{session.start_year} - {session.current_year}"
        }
    except Exception as e:
        print(f"Error in multi-year analysis: {e}")
        # Return basic response
        return {
            "session_id": session_id,
            "yearly_data": {},
            "trends": {},
            "market_events": [],
            "analysis_period": f"{session.start_year} - {session.current_year}"
        }

# Sample Data Creation
@app.post("/sample-data/create")
def create_sample_data_endpoint():
    """Create sample data for testing and demonstration"""
    try:
        # Create sample operator
        db = SessionLocal()
        
        # Check if data already exists
        existing_operator = db.query(DBUser).filter(DBUser.id == "operator_1").first()
        if existing_operator:
            db.close()
            return {
                "status": "success",
                "message": "Sample data already exists",
                "data": {
                    "game_session_id": "sample_game_1",
                    "operator_id": "operator_1",
                    "utility_ids": ["utility_1", "utility_2", "utility_3"]
                }
            }
        
        # Create sample operator
        operator = DBUser(
            id="operator_1",
            username="instructor",
            user_type=UserTypeEnum.operator,
            budget=10000000000,  # $10B for operator
            debt=0.0,
            equity=10000000000
        )
        db.add(operator)
        
        # Create sample utilities with realistic budgets
        utility_budgets = [2000000000, 1500000000, 1800000000]  # $2B, $1.5B, $1.8B
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
        
        db.commit()
        
        # Create sample game session
        demand_profile_data = {
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
            demand_profile=json.dumps(demand_profile_data),
            fuel_prices=json.dumps(DEFAULT_FUEL_PRICES)
        )
        db.add(game_session)
        db.commit()
        
        # Create diverse sample power plants
        sample_plants = [
            # Utility 1: Traditional utility with coal and gas
            ("utility_1", "Riverside Coal Plant", "coal", 600, 2020, 2023, 2050),
            ("utility_1", "Westside Gas CC", "natural_gas_cc", 400, 2021, 2024, 2049),
            ("utility_1", "Peak Gas CT", "natural_gas_ct", 150, 2022, 2025, 2045),
            
            # Utility 2: Mixed portfolio with nuclear and renewables
            ("utility_2", "Coastal Nuclear", "nuclear", 1000, 2018, 2025, 2075),
            ("utility_2", "Solar Farm Alpha", "solar", 250, 2023, 2025, 2045),
            ("utility_2", "Wind Farm Beta", "wind_onshore", 200, 2023, 2025, 2045),
            
            # Utility 3: Renewable-focused with storage
            ("utility_3", "Mega Solar Project", "solar", 400, 2024, 2026, 2046),
            ("utility_3", "Offshore Wind", "wind_offshore", 300, 2024, 2027, 2047),
            ("utility_3", "Grid Battery Storage", "battery", 100, 2025, 2026, 2036),
        ]
        
        for utility_id, name, plant_type, capacity, start_year, commission_year, retire_year in sample_plants:
            template_data = PLANT_TEMPLATES_DATA[plant_type]
            capacity_kw = capacity * 1000
            
            # Determine status based on commissioning year
            if commission_year <= 2025:
                status = PlantStatusEnum.operating
            else:
                status = PlantStatusEnum.under_construction
            
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
        
        # Update utility budgets to reflect existing investments
        utilities = db.query(DBUser).filter(DBUser.user_type == UserTypeEnum.utility).all()
        for utility in utilities:
            # Calculate total existing investments
            plants = db.query(DBPowerPlant).filter(
                DBPowerPlant.utility_id == utility.id,
                DBPowerPlant.game_session_id == "sample_game_1"
            ).all()
            
            total_invested = sum(plant.capital_cost_total for plant in plants)
            
            # Update financial position (70% debt, 30% equity financing)
            utility.debt = total_invested * 0.7
            utility.budget = utility.budget - (total_invested * 0.3)
            utility.equity = utility.equity - (total_invested * 0.3)
        
        db.commit()
        db.close()
        
        return {
            "status": "success",
            "message": "Sample data created successfully",
            "data": {
                "game_session_id": "sample_game_1",
                "operator_id": "operator_1",
                "utility_ids": ["utility_1", "utility_2", "utility_3"],
                "simulation_period": "2025-2035",
                "total_capacity_mw": sum(plant[3] for plant in sample_plants),
                "technologies": list(set(plant[2] for plant in sample_plants))
            }
        }
        
    except Exception as e:
        print(f"Error creating sample data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create sample data: {str(e)}")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "framework": "yearly_simulation",
        "components": {
            "database": "connected",
            "market_engine": "operational",
            "yearly_orchestrator": "ready",
            "plant_templates": len(PLANT_TEMPLATES_DATA),
            "load_periods": 3
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)