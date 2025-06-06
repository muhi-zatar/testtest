from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
from datetime import datetime, timedelta
import uuid
import random
from abc import ABC, abstractmethod

class UserType(Enum):
    OPERATOR = "operator"
    UTILITY = "utility"

class MarketType(Enum):
    DAY_AHEAD = "day_ahead"
    REAL_TIME = "real_time"

class BidType(Enum):
    SUPPLY = "supply"
    DEMAND = "demand"

class LoadPeriod(Enum):
    OFF_PEAK = "off_peak"      # 5000 hours (~57% of year)
    SHOULDER = "shoulder"       # 2500 hours (~29% of year) 
    PEAK = "peak"              # 1260 hours (~14% of year)

class PlantType(Enum):
    COAL = "coal"
    NATURAL_GAS_CC = "natural_gas_cc"  # Combined cycle
    NATURAL_GAS_CT = "natural_gas_ct"  # Combustion turbine
    NUCLEAR = "nuclear"
    SOLAR = "solar"
    WIND_ONSHORE = "wind_onshore"
    WIND_OFFSHORE = "wind_offshore"
    BATTERY = "battery"
    HYDRO = "hydro"
    BIOMASS = "biomass"

class PlantStatus(Enum):
    OPERATING = "operating"
    UNDER_CONSTRUCTION = "under_construction"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"
    PLANNED = "planned"

@dataclass
class FuelPrice:
    """Fuel pricing for different fuel types"""
    fuel_type: str
    price_per_mmbtu: float  # $/MMBtu
    year: int
    volatility: float = 0.15  # Price volatility factor
    
    def get_price_with_volatility(self) -> float:
        """Get fuel price with random volatility"""
        variation = random.uniform(-self.volatility, self.volatility)
        return self.price_per_mmbtu * (1 + variation)

@dataclass
class PlantTemplate:
    """Template for different plant types with realistic costs and characteristics"""
    plant_type: PlantType
    name: str
    
    # Capital costs
    overnight_cost_per_kw: float  # $/kW overnight cost
    construction_time_years: int
    economic_life_years: int
    
    # Operating characteristics  
    capacity_factor_base: float  # Base capacity factor (0-1)
    heat_rate: Optional[float]   # BTU/kWh (for thermal plants)
    fuel_type: Optional[str]     # Fuel type
    
    # Operating costs
    fixed_om_per_kw_year: float  # Fixed O&M $/kW-year
    variable_om_per_mwh: float   # Variable O&M $/MWh
    
    # Operational limits
    min_generation_pct: float = 0.0  # Minimum generation as % of capacity
    ramp_rate_pct_per_min: float = 100.0  # % of capacity per minute
    startup_cost_per_mw: float = 0.0
    
    # Environmental
    co2_emissions_tons_per_mwh: float = 0.0

# Realistic plant templates based on EIA data
PLANT_TEMPLATES = {
    PlantType.COAL: PlantTemplate(
        plant_type=PlantType.COAL,
        name="Supercritical Coal",
        overnight_cost_per_kw=4500,
        construction_time_years=4,
        economic_life_years=40,
        capacity_factor_base=0.85,
        heat_rate=8800,  # BTU/kWh
        fuel_type="coal",
        fixed_om_per_kw_year=45,
        variable_om_per_mwh=4.5,
        min_generation_pct=0.4,
        ramp_rate_pct_per_min=3.0,
        startup_cost_per_mw=150,
        co2_emissions_tons_per_mwh=0.95
    ),
    
    PlantType.NATURAL_GAS_CC: PlantTemplate(
        plant_type=PlantType.NATURAL_GAS_CC,
        name="Natural Gas Combined Cycle",
        overnight_cost_per_kw=1200,
        construction_time_years=3,
        economic_life_years=30,
        capacity_factor_base=0.87,
        heat_rate=6400,
        fuel_type="natural_gas",
        fixed_om_per_kw_year=15,
        variable_om_per_mwh=3.0,
        min_generation_pct=0.3,
        ramp_rate_pct_per_min=5.0,
        startup_cost_per_mw=80,
        co2_emissions_tons_per_mwh=0.35
    ),
    
    PlantType.NATURAL_GAS_CT: PlantTemplate(
        plant_type=PlantType.NATURAL_GAS_CT,
        name="Natural Gas Combustion Turbine",
        overnight_cost_per_kw=800,
        construction_time_years=2,
        economic_life_years=25,
        capacity_factor_base=0.15,  # Peaker plant
        heat_rate=10500,
        fuel_type="natural_gas",
        fixed_om_per_kw_year=12,
        variable_om_per_mwh=8.0,
        min_generation_pct=0.0,
        ramp_rate_pct_per_min=15.0,
        startup_cost_per_mw=25,
        co2_emissions_tons_per_mwh=0.55
    ),
    
    PlantType.NUCLEAR: PlantTemplate(
        plant_type=PlantType.NUCLEAR,
        name="Advanced Nuclear",
        overnight_cost_per_kw=8500,
        construction_time_years=7,
        economic_life_years=60,
        capacity_factor_base=0.92,
        heat_rate=10400,
        fuel_type="uranium",
        fixed_om_per_kw_year=95,
        variable_om_per_mwh=2.0,
        min_generation_pct=0.7,
        ramp_rate_pct_per_min=0.5,
        startup_cost_per_mw=500,
        co2_emissions_tons_per_mwh=0.0
    ),
    
    PlantType.SOLAR: PlantTemplate(
        plant_type=PlantType.SOLAR,
        name="Utility Scale Solar PV",
        overnight_cost_per_kw=1400,
        construction_time_years=2,
        economic_life_years=25,
        capacity_factor_base=0.27,
        heat_rate=None,
        fuel_type=None,
        fixed_om_per_kw_year=18,
        variable_om_per_mwh=0.0,
        min_generation_pct=0.0,
        ramp_rate_pct_per_min=100.0,
        startup_cost_per_mw=0,
        co2_emissions_tons_per_mwh=0.0
    ),
    
    PlantType.WIND_ONSHORE: PlantTemplate(
        plant_type=PlantType.WIND_ONSHORE,
        name="Onshore Wind",
        overnight_cost_per_kw=1650,
        construction_time_years=2,
        economic_life_years=25,
        capacity_factor_base=0.35,
        heat_rate=None,
        fuel_type=None,
        fixed_om_per_kw_year=28,
        variable_om_per_mwh=0.0,
        min_generation_pct=0.0,
        ramp_rate_pct_per_min=100.0,
        startup_cost_per_mw=0,
        co2_emissions_tons_per_mwh=0.0
    ),
    
    PlantType.WIND_OFFSHORE: PlantTemplate(
        plant_type=PlantType.WIND_OFFSHORE,
        name="Offshore Wind",
        overnight_cost_per_kw=4200,
        construction_time_years=4,
        economic_life_years=25,
        capacity_factor_base=0.45,
        heat_rate=None,
        fuel_type=None,
        fixed_om_per_kw_year=80,
        variable_om_per_mwh=0.0,
        min_generation_pct=0.0,
        ramp_rate_pct_per_min=100.0,
        startup_cost_per_mw=0,
        co2_emissions_tons_per_mwh=0.0
    ),
    
    PlantType.BATTERY: PlantTemplate(
        plant_type=PlantType.BATTERY,
        name="Lithium-Ion Battery Storage",
        overnight_cost_per_kw=1500,  # Plus storage cost
        construction_time_years=1,
        economic_life_years=15,
        capacity_factor_base=0.85,  # When operated
        heat_rate=None,
        fuel_type=None,
        fixed_om_per_kw_year=25,
        variable_om_per_mwh=2.0,
        min_generation_pct=-1.0,  # Can charge (negative generation)
        ramp_rate_pct_per_min=100.0,
        startup_cost_per_mw=0,
        co2_emissions_tons_per_mwh=0.0
    )
}

@dataclass
class User:
    id: str
    username: str
    user_type: UserType
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class PowerPlant:
    # All required fields first (no defaults)
    id: str
    utility_id: str
    name: str
    plant_type: PlantType
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int
    capital_cost_total: float
    fixed_om_annual: float
    variable_om_per_mwh: float
    capacity_factor: float
    heat_rate: Optional[float]
    fuel_type: Optional[str]
    min_generation_mw: float
    
    # All optional fields with defaults last
    status: PlantStatus = PlantStatus.PLANNED
    maintenance_weeks_per_year: int = 4
    maintenance_years: List[int] = field(default_factory=list)
    
    def __post_init__(self):
        """Calculate derived values after initialization"""
        template = PLANT_TEMPLATES[self.plant_type]
        self.min_generation_mw = self.capacity_mw * template.min_generation_pct
        
        # Schedule random maintenance years (every 3-5 years)
        if not self.maintenance_years:
            current_year = self.commissioning_year
            while current_year < self.retirement_year:
                current_year += random.randint(3, 5)
                if current_year < self.retirement_year:
                    self.maintenance_years.append(current_year)
    
    def is_available(self, year: int) -> bool:
        """Check if plant is available for operation"""
        return (
            self.status == PlantStatus.OPERATING and
            year >= self.commissioning_year and
            year < self.retirement_year and
            year not in self.maintenance_years
        )
    
    def get_capacity_factor(self, year: int, period: LoadPeriod) -> float:
        """Get capacity factor for specific year and period"""
        if not self.is_available(year):
            return 0.0
        
        base_cf = self.capacity_factor
        
        # Renewable capacity factors vary by period
        if self.plant_type in [PlantType.SOLAR, PlantType.WIND_ONSHORE, PlantType.WIND_OFFSHORE]:
            # Solar peaks during shoulder/peak hours
            if self.plant_type == PlantType.SOLAR:
                factors = {
                    LoadPeriod.OFF_PEAK: 0.1,    # Night time
                    LoadPeriod.SHOULDER: 1.2,    # Day time9
                    LoadPeriod.PEAK: 1.4         # Peak sun hours
                }
            # Wind is more consistent but varies
            else:
                factors = {
                    LoadPeriod.OFF_PEAK: 1.1,
                    LoadPeriod.SHOULDER: 0.9,
                    LoadPeriod.PEAK: 1.0
                }
            return min(1.0, base_cf * factors[period])
        
        return base_cf
    
    def calculate_marginal_cost(self, fuel_prices: Dict[str, float], carbon_price: float = 0.0) -> float:
        """Calculate marginal cost including fuel and carbon costs"""
        marginal_cost = self.variable_om_per_mwh
        
        # Add fuel cost
        if self.fuel_type and self.heat_rate:
            fuel_price = fuel_prices.get(self.fuel_type, 0.0)
            fuel_cost_per_mwh = (self.heat_rate * fuel_price) / 1000  # Convert BTU to MMBtu
            marginal_cost += fuel_cost_per_mwh
        
        # Add carbon cost
        template = PLANT_TEMPLATES[self.plant_type]
        carbon_cost = template.co2_emissions_tons_per_mwh * carbon_price
        marginal_cost += carbon_cost
        
        return marginal_cost

@dataclass
class YearlyBid:
    """Bid for entire year by load period"""
    id: str
    utility_id: str
    plant_id: str
    year: int
    market_type: MarketType
    
    # Bids by period (MW capacity offered)
    off_peak_quantity: float
    shoulder_quantity: float  
    peak_quantity: float
    
    # Prices by period ($/MWh)
    off_peak_price: float
    shoulder_price: float
    peak_price: float
    
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class AnnualDemandProfile:
    """Annual demand profile by load periods"""
    year: int
    
    # Hours in each period
    off_peak_hours: int = 5000
    shoulder_hours: int = 2500  
    peak_hours: int = 1260
    
    # Base demand by period (MW average)
    off_peak_demand: float = 1200
    shoulder_demand: float = 1800
    peak_demand: float = 2400
    
    # Growth rates
    demand_growth_rate: float = 0.02  # 2% annual growth
    
    def get_period_demand(self, period: LoadPeriod, year_offset: int = 0) -> float:
        """Get demand for specific period with growth"""
        growth_factor = (1 + self.demand_growth_rate) ** year_offset
        
        demands = {
            LoadPeriod.OFF_PEAK: self.off_peak_demand,
            LoadPeriod.SHOULDER: self.shoulder_demand,
            LoadPeriod.PEAK: self.peak_demand
        }
        
        return demands[period] * growth_factor
    
    def get_period_hours(self, period: LoadPeriod) -> int:
        """Get number of hours in each period"""
        hours = {
            LoadPeriod.OFF_PEAK: self.off_peak_hours,
            LoadPeriod.SHOULDER: self.shoulder_hours,
            LoadPeriod.PEAK: self.peak_hours
        }
        return hours[period]

@dataclass
class MarketResult:
    year: int
    period: LoadPeriod
    market_type: MarketType
    clearing_price: float  # $/MWh
    cleared_quantity: float  # MW
    total_energy: float  # MWh (quantity * hours in period)
    accepted_supply_bids: List[str]  # Bid IDs
    marginal_plant: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)

class GameState(Enum):
    SETUP = "setup"
    YEAR_PLANNING = "year_planning"     # Utilities plan investments
    BIDDING_OPEN = "bidding_open"       # Submit yearly bids
    MARKET_CLEARING = "market_clearing"  # Clear markets
    YEAR_COMPLETE = "year_complete"     # Show results
    GAME_COMPLETE = "game_complete"

@dataclass
class GameSession:
    id: str
    name: str
    operator_id: str
    
    # Game timing
    current_year: int = 2025
    start_year: int = 2025
    end_year: int = 2035  # 10-year simulation
    
    state: GameState = GameState.SETUP
    utilities: List[str] = field(default_factory=list)
    
    # Market parameters
    demand_profile: AnnualDemandProfile = field(default_factory=AnnualDemandProfile)
    carbon_price_per_ton: float = 50.0  # $/ton CO2
    
    # Economic parameters
    discount_rate: float = 0.08  # 8% cost of capital
    inflation_rate: float = 0.025  # 2.5% inflation
    
    created_at: datetime = field(default_factory=datetime.now)

class MarketEngine:
    """Enhanced market clearing engine for yearly operations"""
    
    @staticmethod
    def clear_period_market(
        supply_bids: List[YearlyBid], 
        demand_profile: AnnualDemandProfile,
        period: LoadPeriod,
        year: int,
        fuel_prices: Dict[str, float],
        carbon_price: float,
        plants: Dict[str, PowerPlant]
    ) -> MarketResult:
        """
        Clear market for a specific load period
        """
        target_demand = demand_profile.get_period_demand(period)
        period_hours = demand_profile.get_period_hours(period)
        
        # Extract period-specific bids and sort by price
        period_bids = []
        for bid in supply_bids:
            # Get the right price and quantity for this period
            if period == LoadPeriod.OFF_PEAK:
                price = bid.off_peak_price
                quantity = bid.off_peak_quantity
            elif period == LoadPeriod.SHOULDER:
                price = bid.shoulder_price
                quantity = bid.shoulder_quantity
            else:  # PEAK
                price = bid.peak_price
                quantity = bid.peak_quantity
            
            if quantity > 0:  # Only include positive bids
                period_bids.append({
                    'bid_id': bid.id,
                    'plant_id': bid.plant_id,
                    'utility_id': bid.utility_id,
                    'price': price,
                    'quantity': quantity
                })
        
        # Sort by price (merit order)
        period_bids.sort(key=lambda x: x['price'])
        
        # Clear the market
        cumulative_supply = 0
        clearing_price = 0
        accepted_bids = []
        marginal_plant = None
        
        for bid in period_bids:
            cumulative_supply += bid['quantity']
            
            if cumulative_supply >= target_demand:
                # Market clears
                clearing_price = bid['price']
                marginal_plant = bid['plant_id']
                accepted_bids.append(bid['bid_id'])
                break
            else:
                accepted_bids.append(bid['bid_id'])
        
        # If we can't meet demand, clear at highest price
        if cumulative_supply < target_demand and period_bids:
            clearing_price = period_bids[-1]['price'] * 2  # Scarcity pricing
        
        cleared_quantity = min(target_demand, cumulative_supply)
        total_energy = cleared_quantity * period_hours
        
        return MarketResult(
            year=year,
            period=period,
            market_type=MarketType.DAY_AHEAD,
            clearing_price=clearing_price,
            cleared_quantity=cleared_quantity,
            total_energy=total_energy,
            accepted_supply_bids=accepted_bids,
            marginal_plant=marginal_plant
        )

# Fuel price scenarios
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

# Example usage
if __name__ == "__main__":
    # Create a game session
    game = GameSession(
        id=str(uuid.uuid4()),
        name="Advanced Electricity Market Simulation",
        operator_id="instructor_1",
        start_year=2025,
        end_year=2030
    )
    
    print(f"Game: {game.name}")
    print(f"Years: {game.start_year} - {game.end_year}")
    print(f"Demand Growth: {game.demand_profile.demand_growth_rate:.1%} annually")
    print(f"Carbon Price: ${game.carbon_price_per_ton}/ton CO2")
    
    # Example plant
    coal_plant = PowerPlant(
        id="coal_1",
        utility_id="utility_1", 
        name="Coal Plant Alpha",
        plant_type=PlantType.COAL,
        capacity_mw=500,
        construction_start_year=2023,
        commissioning_year=2025,
        retirement_year=2055,
        status=PlantStatus.OPERATING,
        capital_cost_total=500 * PLANT_TEMPLATES[PlantType.COAL].overnight_cost_per_kw,
        fixed_om_annual=500 * PLANT_TEMPLATES[PlantType.COAL].fixed_om_per_kw_year,
        variable_om_per_mwh=PLANT_TEMPLATES[PlantType.COAL].variable_om_per_mwh,
        capacity_factor=PLANT_TEMPLATES[PlantType.COAL].capacity_factor_base,
        heat_rate=PLANT_TEMPLATES[PlantType.COAL].heat_rate,
        fuel_type="coal"
    )
    
    print(f"\nExample Plant: {coal_plant.name}")
    print(f"Capacity: {coal_plant.capacity_mw} MW")
    print(f"Marginal Cost: ${coal_plant.calculate_marginal_cost(DEFAULT_FUEL_PRICES[2025], 50):.2f}/MWh")
    print(f"Available in 2025: {coal_plant.is_available(2025)}")