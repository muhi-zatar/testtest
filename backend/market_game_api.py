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

# Try to import and setup game orchestrator
try:
    from game_orchestrator import YearlyGameOrchestrator, add_orchestration_endpoints
    print("✅ Game orchestrator imported successfully")
    
    # Initialize orchestrator
    orchestrator = YearlyGameOrchestrator(SessionLocal())
    print("✅ Game orchestrator initialized")
    
    # This will be called after app is created
    _orchestrator = orchestrator
except ImportError as e:
    print(f"⚠️ Game orchestrator not available: {e}")
    _orchestrator = None
except Exception as e:
    print(f"❌ Error setting up game orchestrator: {e}")
    _orchestrator = None

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

# Add orchestration endpoints if available
if _orchestrator:
    try:
        add_orchestration_endpoints(app, _orchestrator)
        print("✅ Orchestration endpoints added successfully")
    except Exception as e:
        print(f"❌ Error adding orchestration endpoints: {e}")

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

# Manual orchestration endpoints (fallback if orchestrator import fails)
@app.post("/game-sessions/{session_id}/start-year-planning/{year}")
async def start_year_planning_fallback(session_id: str, year: int, db: Session = Depends(get_db)):
    """Fallback endpoint for starting year planning"""
    try:
        session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        session.state = GameStateEnum.year_planning
        session.current_year = year
        db.commit()
        
        return {
            "status": "year_planning_started",
            "year": year,
            "message": f"Year {year} planning phase is open",
            "session_state": session.state
        }
    except Exception as e:
        print(f"Error in start_year_planning: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/game-sessions/{session_id}/open-annual-bidding/{year}")
async def open_annual_bidding_fallback(session_id: str, year: int, db: Session = Depends(get_db)):
    """Fallback endpoint for opening annual bidding"""
    try:
        session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        session.state = GameStateEnum.bidding_open
        db.commit()
        
        # Get available plants for bidding
        plants = db.query(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == session_id,
            DBPowerPlant.status == PlantStatusEnum.operating,
            DBPowerPlant.commissioning_year <= year,
            DBPowerPlant.retirement_year > year
        ).all()
        
        return {
            "status": "annual_bidding_open",
            "year": year,
            "message": f"Submit bids for all load periods in {year}",
            "load_periods": {
                "off_peak": {"hours": 5000, "description": "Night and weekend hours"},
                "shoulder": {"hours": 2500, "description": "Daytime non-peak hours"},
                "peak": {"hours": 1260, "description": "Evening and high-demand hours"}
            },
            "available_plants": len(plants),
            "session_state": session.state
        }
    except Exception as e:
        print(f"Error in open_annual_bidding: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/game-sessions/{session_id}/clear-annual-markets/{year}")
async def clear_annual_markets_fallback(session_id: str, year: int, db: Session = Depends(get_db)):
    """Fallback endpoint for clearing annual markets"""
    try:
        session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        # Get all bids for this year
        bids = db.query(DBYearlyBid).filter(
            DBYearlyBid.game_session_id == session_id,
            DBYearlyBid.year == year
        ).all()
        
        if not bids:
            raise HTTPException(status_code=400, detail=f"No bids found for year {year}")
        
        # Simple market clearing (just set some mock results)
        session.state = GameStateEnum.market_clearing
        db.commit()
        
        # Create mock market results for each period
        periods = ['off_peak', 'shoulder', 'peak']
        clearing_prices = [45.0, 55.0, 75.0]  # Mock prices
        
        results = {}
        for i, period in enumerate(periods):
            # Calculate total quantity bid for this period
            if period == 'off_peak':
                total_quantity = sum(bid.off_peak_quantity for bid in bids)
            elif period == 'shoulder':
                total_quantity = sum(bid.shoulder_quantity for bid in bids)
            else:  # peak
                total_quantity = sum(bid.peak_quantity for bid in bids)
            
            # Create market result
            market_result = DBMarketResult(
                game_session_id=session_id,
                year=year,
                period=LoadPeriodEnum(period),
                clearing_price=clearing_prices[i],
                cleared_quantity=total_quantity,
                total_energy=total_quantity * (5000 if period == 'off_peak' else 2500 if period == 'shoulder' else 1260),
                accepted_supply_bids=json.dumps([bid.id for bid in bids])
            )
            db.add(market_result)
            
            results[period] = {
                "clearing_price": clearing_prices[i],
                "cleared_quantity": total_quantity,
                "total_energy": market_result.total_energy,
                "accepted_bids": len(bids)
            }
        
        db.commit()
        
        return {
            "status": "annual_markets_cleared",
            "year": year,
            "results": results,
            "message": f"Markets cleared for year {year}",
            "session_state": session.state
        }
    except Exception as e:
        print(f"Error in clear_annual_markets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/game-sessions/{session_id}/complete-year/{year}")
async def complete_year_fallback(session_id: str, year: int, db: Session = Depends(get_db)):
    """Fallback endpoint for completing a year"""
    try:
        session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        # Check if game should continue
        if year >= session.end_year:
            session.state = GameStateEnum.game_complete
            message = f"Game completed! Final results for {session.start_year}-{session.end_year}"
        else:
            session.state = GameStateEnum.year_complete
            message = f"Year {year} completed. Preparing for {year + 1}"
        
        db.commit()
        
        return {
            "status": "year_completed",
            "year": year,
            "message": message,
            "session_state": session.state
        }
    except Exception as e:
        print(f"Error in complete_year: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
            "start_year": session.start_year,
            "end_year": session.end_year,
            "state": session.state,
            "carbon_price_per_ton": session.carbon_price_per_ton
        },
        "market_stats": {
            "total_capacity_mw": total_capacity,
            "operating_plants": operating_plants,
            "capacity_margin": (total_capacity - max(current_demand.values())) / max(current_demand.values()) if max(current_demand.values()) > 0 else 0
        },
        "participants": {
            "total_utilities": utility_count,
            "utilities": [{"id": u.id, "username": u.username} for u in utilities]
        },
        "current_demand_mw": current_demand,
        "recent_results": [
            {
                "year": result.year,
                "period": result.period.value,
                "clearing_price": result.clearing_price,
                "cleared_quantity": result.cleared_quantity,
                "total_energy": result.total_energy,
                "timestamp": result.timestamp.isoformat()
            } for result in recent_results
        ]
    }

# Plant Templates
@app.get("/plant-templates")
async def get_plant_templates():
    return list(PLANT_TEMPLATES_DATA.values())

@app.get("/plant-templates/{plant_type}")
async def get_plant_template(plant_type: str):
    if plant_type not in PLANT_TEMPLATES_DATA:
        raise HTTPException(status_code=404, detail="Plant template not found")
    return PLANT_TEMPLATES_DATA[plant_type]

# Power Plant Management
@app.post("/game-sessions/{session_id}/plants")
async def create_power_plant(
    session_id: str,
    plant: PowerPlantCreate,
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        # Get the plant template for cost calculations
        if plant.plant_type.value not in PLANT_TEMPLATES_DATA:
            raise HTTPException(status_code=400, detail="Invalid plant type")
        
        template = PLANT_TEMPLATES_DATA[plant.plant_type.value]
        capacity_kw = plant.capacity_mw * 1000
        
        # Calculate costs based on template
        capital_cost_total = capacity_kw * template["overnight_cost_per_kw"]
        fixed_om_annual = capacity_kw * template["fixed_om_per_kw_year"]
        
        # Determine initial status
        session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        status = PlantStatusEnum.under_construction if plant.commissioning_year > session.current_year else PlantStatusEnum.operating
        
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
            status=status,
            capital_cost_total=capital_cost_total,
            fixed_om_annual=fixed_om_annual,
            variable_om_per_mwh=template["variable_om_per_mwh"],
            capacity_factor=template["capacity_factor_base"],
            heat_rate=template.get("heat_rate"),
            fuel_type=template.get("fuel_type"),
            min_generation_mw=plant.capacity_mw * template["min_generation_pct"],
            maintenance_years=json.dumps([])
        )
        
        db.add(db_plant)
        
        # Update utility finances (70% debt, 30% equity financing)
        utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
        if utility:
            debt_financing = capital_cost_total * 0.7
            equity_financing = capital_cost_total * 0.3
            
            utility.debt += debt_financing
            utility.budget -= equity_financing
            utility.equity -= equity_financing
        
        db.commit()
        db.refresh(db_plant)
        
        return {
            "id": db_plant.id,
            "name": db_plant.name,
            "plant_type": db_plant.plant_type,
            "capacity_mw": db_plant.capacity_mw,
            "capital_cost_total": db_plant.capital_cost_total,
            "status": db_plant.status,
            "commissioning_year": db_plant.commissioning_year
        }
    except Exception as e:
        print(f"Error creating power plant: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/game-sessions/{session_id}/plants")
async def get_power_plants(
    session_id: str,
    utility_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id)
    
    if utility_id:
        query = query.filter(DBPowerPlant.utility_id == utility_id)
    
    plants = query.all()
    
    return [
        {
            "id": plant.id,
            "utility_id": plant.utility_id,
            "name": plant.name,
            "plant_type": plant.plant_type,
            "capacity_mw": plant.capacity_mw,
            "construction_start_year": plant.construction_start_year,
            "commissioning_year": plant.commissioning_year,
            "retirement_year": plant.retirement_year,
            "status": plant.status,
            "capital_cost_total": plant.capital_cost_total,
            "fixed_om_annual": plant.fixed_om_annual,
            "variable_om_per_mwh": plant.variable_om_per_mwh,
            "capacity_factor": plant.capacity_factor,
            "heat_rate": plant.heat_rate,
            "fuel_type": plant.fuel_type,
            "min_generation_mw": plant.min_generation_mw
        } for plant in plants
    ]

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
    template = PLANT_TEMPLATES_DATA.get(plant.plant_type.value, {})
    carbon_cost = template.get("co2_emissions_tons_per_mwh", 0) * session.carbon_price_per_ton
    marginal_cost += carbon_cost
    
    # Calculate annual metrics
    annual_generation = plant.capacity_mw * plant.capacity_factor * 8760
    annual_revenue = annual_generation * 55  # Assume $55/MWh average price
    annual_profit = annual_revenue - plant.fixed_om_annual - (annual_generation * marginal_cost)
    
    return {
        "plant_id": plant_id,
        "year": year,
        "marginal_cost_per_mwh": marginal_cost,
        "fuel_costs": fuel_costs,
        "carbon_costs": carbon_cost,
        "annual_generation_mwh": annual_generation,
        "annual_revenue_estimate": annual_revenue,
        "annual_fixed_costs": plant.fixed_om_annual,
        "annual_profit_estimate": annual_profit,
        "capacity_factor": plant.capacity_factor
    }

# Bidding System
@app.post("/game-sessions/{session_id}/bids")
async def submit_yearly_bid(
    session_id: str,
    bid: YearlyBidCreate,
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        # Check if bid already exists for this plant and year
        existing_bid = db.query(DBYearlyBid).filter(
            DBYearlyBid.game_session_id == session_id,
            DBYearlyBid.utility_id == utility_id,
            DBYearlyBid.plant_id == bid.plant_id,
            DBYearlyBid.year == bid.year
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
            db_bid = existing_bid
        else:
            # Create new bid
            db_bid = DBYearlyBid(
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
        
        return {
            "id": db_bid.id,
            "plant_id": db_bid.plant_id,
            "year": db_bid.year,
            "message": "Bid submitted successfully"
        }
    except Exception as e:
        print(f"Error submitting bid: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/game-sessions/{session_id}/bids")
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
    
    return [
        {
            "id": bid.id,
            "utility_id": bid.utility_id,
            "plant_id": bid.plant_id,
            "year": bid.year,
            "off_peak_quantity": bid.off_peak_quantity,
            "shoulder_quantity": bid.shoulder_quantity,
            "peak_quantity": bid.peak_quantity,
            "off_peak_price": bid.off_peak_price,
            "shoulder_price": bid.shoulder_price,
            "peak_price": bid.peak_price,
            "timestamp": bid.timestamp.isoformat()
        } for bid in bids
    ]

# Market Operations
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
        "carbon_price_per_ton": session.carbon_price_per_ton
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
        query = query.filter(DBMarketResult.period == LoadPeriodEnum(period))
    
    results = query.order_by(DBMarketResult.timestamp.desc()).all()
    
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
        } for result in results
    ]

# Sample Data Creation
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
        
        # Create sample operator
        operator = DBUser(
            id="operator_1",
            username="instructor",
            user_type=UserTypeEnum.operator,
            budget=10000000000,  # $10B
            debt=0.0,
            equity=10000000000
        )
        db.add(operator)
        
        # Create sample utilities
        utility_budgets = [2000000000, 1500000000, 1800000000]  # $2B, $1.5B, $1.8B
        utility_names = ["PowerCorp Alpha", "EnergyTech Beta", "GreenGrid Gamma"]
        
        for i in range(3):
            utility = DBUser(
                id=f"utility_{i+1}",
                username=utility_names[i],
                user_type=UserTypeEnum.utility,
                budget=utility_budgets[i],
                debt=0.0,
                equity=utility_budgets[i]
            )
            db.add(utility)
        
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
        
        # Create sample plants
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
        
        # Update utility finances to reflect existing investments
        utilities = db.query(DBUser).filter(DBUser.user_type == UserTypeEnum.utility).all()
        for utility in utilities:
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
        print(f"Error creating sample data: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Portfolio Templates
PORTFOLIO_TEMPLATES = [
    {
        "id": "traditional",
        "name": "Traditional Utility",
        "description": "Coal and natural gas focused portfolio with reliable baseload generation",
        "plants": [
            {"plant_type": "coal", "capacity_mw": 600, "name": "Coal Baseload Plant"},
            {"plant_type": "natural_gas_cc", "capacity_mw": 400, "name": "Gas Combined Cycle"},
            {"plant_type": "natural_gas_ct", "capacity_mw": 150, "name": "Gas Peaker"}
        ]
    },
    {
        "id": "mixed",
        "name": "Mixed Generation",
        "description": "Balanced portfolio with nuclear, renewables, and thermal generation",
        "plants": [
            {"plant_type": "nuclear", "capacity_mw": 1000, "name": "Nuclear Baseload"},
            {"plant_type": "solar", "capacity_mw": 250, "name": "Solar Farm"},
            {"plant_type": "wind_onshore", "capacity_mw": 200, "name": "Wind Farm"}
        ]
    },
    {
        "id": "renewable",
        "name": "Renewable Focus",
        "description": "Clean energy portfolio with solar, wind, and battery storage",
        "plants": [
            {"plant_type": "solar", "capacity_mw": 400, "name": "Large Solar Project"},
            {"plant_type": "wind_offshore", "capacity_mw": 300, "name": "Offshore Wind"},
            {"plant_type": "battery", "capacity_mw": 100, "name": "Grid Battery Storage"}
        ]
    },
    {
        "id": "balanced",
        "name": "Balanced Portfolio",
        "description": "Diversified mix across all major technologies",
        "plants": [
            {"plant_type": "natural_gas_cc", "capacity_mw": 300, "name": "Gas CC Unit"},
            {"plant_type": "solar", "capacity_mw": 200, "name": "Solar Array"},
            {"plant_type": "wind_onshore", "capacity_mw": 150, "name": "Wind Turbines"},
            {"plant_type": "battery", "capacity_mw": 50, "name": "Energy Storage"}
        ]
    }
]

@app.get("/portfolio-templates")
async def get_portfolio_templates():
    """Get available portfolio templates for game setup"""
    return PORTFOLIO_TEMPLATES

@app.post("/game-sessions/{session_id}/assign-portfolio")
async def assign_portfolio(
    session_id: str,
    portfolio_data: Dict[str, Any],
    utility_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """Assign a portfolio template to a utility"""
    try:
        # Find the portfolio template
        template = next((t for t in PORTFOLIO_TEMPLATES if t["id"] == portfolio_data.get("template_id")), None)
        if not template:
            raise HTTPException(status_code=404, detail="Portfolio template not found")
        
        # Create plants for the utility
        created_plants = []
        for plant_config in template["plants"]:
            template_data = PLANT_TEMPLATES_DATA[plant_config["plant_type"]]
            capacity_kw = plant_config["capacity_mw"] * 1000
            
            plant = DBPowerPlant(
                id=str(uuid.uuid4()),
                utility_id=utility_id,
                game_session_id=session_id,
                name=plant_config["name"],
                plant_type=PlantTypeEnum(plant_config["plant_type"]),
                capacity_mw=plant_config["capacity_mw"],
                construction_start_year=2020,
                commissioning_year=2025,
                retirement_year=2025 + template_data["economic_life_years"],
                status=PlantStatusEnum.operating,
                capital_cost_total=capacity_kw * template_data["overnight_cost_per_kw"],
                fixed_om_annual=capacity_kw * template_data["fixed_om_per_kw_year"],
                variable_om_per_mwh=template_data["variable_om_per_mwh"],
                capacity_factor=template_data["capacity_factor_base"],
                heat_rate=template_data.get("heat_rate"),
                fuel_type=template_data.get("fuel_type"),
                min_generation_mw=plant_config["capacity_mw"] * template_data["min_generation_pct"],
                maintenance_years=json.dumps([])
            )
            db.add(plant)
            created_plants.append(plant)
        
        # Update utility finances
        utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
        if utility:
            total_investment = sum(plant.capital_cost_total for plant in created_plants)
            debt_financing = total_investment * 0.7
            equity_financing = total_investment * 0.3
            
            utility.debt += debt_financing
            utility.budget -= equity_financing
            utility.equity -= equity_financing
        
        db.commit()
        
        return {
            "message": f"Portfolio '{template['name']}' assigned successfully",
            "plants_created": len(created_plants),
            "total_capacity": sum(plant.capacity_mw for plant in created_plants),
            "total_investment": sum(plant.capital_cost_total for plant in created_plants)
        }
        
    except Exception as e:
        print(f"Error assigning portfolio: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/game-sessions/{session_id}/bulk-assign-portfolios")
async def bulk_assign_portfolios(
    session_id: str,
    assignments: Dict[str, str],
    db: Session = Depends(get_db)
):
    """Assign portfolios to multiple utilities at once"""
    try:
        results = []
        
        for utility_id, template_id in assignments.items():
            # Find the portfolio template
            template = next((t for t in PORTFOLIO_TEMPLATES if t["id"] == template_id), None)
            if not template:
                continue
            
            # Create plants for the utility
            created_plants = []
            for plant_config in template["plants"]:
                template_data = PLANT_TEMPLATES_DATA[plant_config["plant_type"]]
                capacity_kw = plant_config["capacity_mw"] * 1000
                
                plant = DBPowerPlant(
                    id=str(uuid.uuid4()),
                    utility_id=utility_id,
                    game_session_id=session_id,
                    name=f"{plant_config['name']} ({utility_id})",
                    plant_type=PlantTypeEnum(plant_config["plant_type"]),
                    capacity_mw=plant_config["capacity_mw"],
                    construction_start_year=2020,
                    commissioning_year=2025,
                    retirement_year=2025 + template_data["economic_life_years"],
                    status=PlantStatusEnum.operating,
                    capital_cost_total=capacity_kw * template_data["overnight_cost_per_kw"],
                    fixed_om_annual=capacity_kw * template_data["fixed_om_per_kw_year"],
                    variable_om_per_mwh=template_data["variable_om_per_mwh"],
                    capacity_factor=template_data["capacity_factor_base"],
                    heat_rate=template_data.get("heat_rate"),
                    fuel_type=template_data.get("fuel_type"),
                    min_generation_mw=plant_config["capacity_mw"] * template_data["min_generation_pct"],
                    maintenance_years=json.dumps([])
                )
                db.add(plant)
                created_plants.append(plant)
            
            # Update utility finances
            utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
            if utility:
                total_investment = sum(plant.capital_cost_total for plant in created_plants)
                debt_financing = total_investment * 0.7
                equity_financing = total_investment * 0.3
                
                utility.debt += debt_financing
                utility.budget -= equity_financing
                utility.equity -= equity_financing
            
            results.append({
                "utility_id": utility_id,
                "template": template["name"],
                "plants_created": len(created_plants),
                "total_capacity": sum(plant.capacity_mw for plant in created_plants)
            })
        
        db.commit()
        
        return {
            "message": "Portfolios assigned successfully",
            "assignments": results,
            "total_utilities": len(results)
        }
        
    except Exception as e:
        print(f"Error bulk assigning portfolios: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Electricity Market Game API v2.0", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)