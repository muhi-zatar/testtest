from typing import Dict, List, Optional
from datetime import datetime
import asyncio
from dataclasses import dataclass
import json
import random

from electricity_market_backend import (
    GameState, MarketType, MarketEngine, AnnualDemandProfile, 
    YearlyBid, LoadPeriod, MarketResult, PowerPlant, PlantType, PLANT_TEMPLATES
)

@dataclass
class YearlyGameOrchestrator:
    """
    Orchestrates the yearly electricity market game flow
    Handles multi-year capacity planning and investment decisions
    """
    
    def __init__(self, db_session):
        self.db = db_session
        self.active_games: Dict[str, 'YearlyGameFlowManager'] = {}
        
        # Initialize sample game if it exists
        self._initialize_existing_games()

    def _initialize_existing_games(self):
        """Initialize any existing game sessions"""
        try:
            from market_game_api import DBGameSession
            
            existing_sessions = self.db.query(DBGameSession).all()
            for session in existing_sessions:
                if session.id not in self.active_games:
                    flow_manager = YearlyGameFlowManager(session.id, self.db)
                    self.active_games[session.id] = flow_manager
                    print(f"✅ Initialized game flow for session: {session.name}")
        except Exception as e:
            print(f"⚠️ Error initializing existing games: {e}")
    
    def create_game_flow(self, game_session_id: str) -> 'YearlyGameFlowManager':
        """Create a new yearly game flow manager"""
        flow_manager = YearlyGameFlowManager(game_session_id, self.db)
        self.active_games[game_session_id] = flow_manager
        return flow_manager
    
    def get_game_flow(self, game_session_id: str) -> Optional['YearlyGameFlowManager']:
        """Get existing game flow manager"""
        return self.active_games.get(game_session_id)

class YearlyGameFlowManager:
    """
    Manages the flow of a multi-year electricity market simulation
    """
    
    def __init__(self, game_session_id: str, db_session):
        self.game_session_id = game_session_id
        self.db = db_session
        self.yearly_results: Dict[int, Dict[LoadPeriod, MarketResult]] = {}
        self.investment_decisions: Dict[str, List[str]] = {}  # utility_id -> plant_ids
        self.market_events: List[Dict] = []  # Store random events (outages, fuel shocks, etc.)
        
        # Verify the session exists
        self._verify_session()
    
    def _verify_session(self):
        """Verify that the game session exists and has required data"""
        try:
            from market_game_api import DBGameSession, DBPowerPlant
            
            session = self.db.query(DBGameSession).filter(
                DBGameSession.id == self.game_session_id
            ).first()
            
            if not session:
                print(f"⚠️ Game session {self.game_session_id} not found")
                return
            
            # Check if session has plants
            plant_count = self.db.query(DBPowerPlant).filter(
                DBPowerPlant.game_session_id == self.game_session_id
            ).count()
            
            if plant_count == 0:
                print(f"⚠️ Game session {self.game_session_id} has no plants")
            else:
                print(f"✅ Game session {self.game_session_id} verified with {plant_count} plants")
                
        except Exception as e:
            print(f"❌ Error verifying session {self.game_session_id}: {e}")

    async def start_year_planning(self, year: int) -> Dict[str, any]:
            """
            Start the year planning phase where utilities can invest in new capacity
            """
            from market_game_api import DBGameSession, GameStateEnum
            
            session = self.db.query(DBGameSession).filter(
                DBGameSession.id == self.game_session_id
            ).first()
            
            if not session:
                raise ValueError("Game session not found")
            
            # Update the current year and state
            session.current_year = year
            session.state = GameStateEnum.year_planning
            self.db.commit()
            
            # Generate market events for this year
            events = self._generate_market_events(year)
            self.market_events.extend(events)
            
            # Update plant statuses (new plants coming online, retirements, maintenance)
            plant_updates = await self._update_plant_statuses(year)
            
            # Get updated demand forecast
            demand_forecast = self._get_demand_forecast(year)
            
            # Get fuel price projections
            fuel_prices = self._get_fuel_prices(year)
            
            return {
                "status": "year_planning_started",
                "year": year,
                "message": f"Year {year} planning phase is open",
                "planning_period_ends": "Utilities can build new plants and plan operations",
                "demand_forecast": demand_forecast,
                "fuel_prices": fuel_prices,
                "market_events": events,
                "plant_updates": plant_updates,
                "investment_opportunities": self._get_investment_opportunities()
            }
    
    async def open_annual_bidding(self, year: int) -> Dict[str, any]:
        """
        Open bidding for the entire year (all three load periods)
        """
        from market_game_api import DBGameSession, GameStateEnum
        
        session = self.db.query(DBGameSession).filter(
            DBGameSession.id == self.game_session_id
        ).first()
        
        if not session:
            raise ValueError("Game session not found")
        
        # Update the current year if needed
        if session.current_year != year:
            session.current_year = year
        
        session.state = GameStateEnum.bidding_open
        self.db.commit()
        
        # Get available plants for bidding
        available_plants = self._get_available_plants(year)
        
        # Calculate recommended bid prices based on marginal costs
        bid_guidance = self._calculate_bid_guidance(year, available_plants)
        
        return {
            "status": "annual_bidding_open",
            "year": year,
            "message": f"Submit bids for all load periods in {year}",
            "load_periods": {
                "off_peak": {"hours": 5000, "description": "Night and weekend hours"},
                "shoulder": {"hours": 2500, "description": "Daytime non-peak hours"},
                "peak": {"hours": 1260, "description": "Evening and high-demand hours"}
            },
            "available_plants": available_plants,
            "bid_guidance": bid_guidance,
            "bidding_deadline": "All utilities must submit bids for all periods"
        }
    
    async def clear_annual_markets(self, year: int) -> Dict[str, any]:
        """
        Clear all markets for the year (off-peak, shoulder, peak)
        """
        from market_game_api import DBGameSession, DBYearlyBid, DBMarketResult, GameStateEnum, LoadPeriodEnum
        
        session = self.db.query(DBGameSession).filter(
            DBGameSession.id == self.game_session_id
        ).first()
        
        if not session:
            raise ValueError("Game session not found")
        
        # Check if we're in the right state to clear markets
        if session.state != GameStateEnum.bidding_open:
            raise ValueError(f"Cannot clear markets in state: {session.state}. Markets must be in bidding_open state.")
        
        # Get demand profile and fuel prices
        demand_data = json.loads(session.demand_profile)
        fuel_prices_data = json.loads(session.fuel_prices)
        year_fuel_prices = fuel_prices_data.get(str(year), fuel_prices_data.get("2025", {}))
        
        # Create demand profile for this year
        demand_profile = AnnualDemandProfile(year=year)
        demand_profile.off_peak_demand = demand_data["off_peak_demand"]
        demand_profile.shoulder_demand = demand_data["shoulder_demand"]
        demand_profile.peak_demand = demand_data["peak_demand"]
        demand_profile.demand_growth_rate = demand_data["demand_growth_rate"]
        
        # Get all bids for this year
        db_bids = self.db.query(DBYearlyBid).filter(
            DBYearlyBid.game_session_id == self.game_session_id,
            DBYearlyBid.year == year
        ).all()
        
        if not db_bids:
            # Instead of raising an error, return a message indicating no bids
            session.state = GameStateEnum.year_complete
            self.db.commit()
            
            return {
                "status": "no_bids_submitted",
                "year": year,
                "message": f"No bids were submitted for year {year}. Markets cannot clear without bids.",
                "results": {},
                "summary": {
                    "total_market_revenue": 0,
                    "average_price_weighted": 0,
                    "capacity_utilization": 0,
                    "renewable_penetration": 0
                },
                "utility_performance": {},
                "market_insights": [
                    "No market activity occurred this year due to lack of bids",
                    "Utilities should submit bids during the bidding phase",
                    "Consider reviewing bidding strategies for future years"
                ]
            }
        
        # Convert to domain objects
        yearly_bids = [
            YearlyBid(
                id=bid.id,
                utility_id=bid.utility_id,
                plant_id=bid.plant_id,
                year=bid.year,
                market_type=MarketType.DAY_AHEAD,
                off_peak_quantity=bid.off_peak_quantity,
                shoulder_quantity=bid.shoulder_quantity,
                peak_quantity=bid.peak_quantity,
                off_peak_price=bid.off_peak_price,
                shoulder_price=bid.shoulder_price,
                peak_price=bid.peak_price
            ) for bid in db_bids
        ]
        
        # Get plant data for calculations
        plants = self._get_plants_dict(year)
        
        # Clear each period
        results = {}
        total_revenue = 0
        
        for period in [LoadPeriod.OFF_PEAK, LoadPeriod.SHOULDER, LoadPeriod.PEAK]:
            market_result = MarketEngine.clear_period_market(
                yearly_bids,
                demand_profile,
                period,
                year,
                year_fuel_prices,
                session.carbon_price_per_ton,
                plants
            )
            
            results[period.value] = {
                "clearing_price": market_result.clearing_price,
                "cleared_quantity": market_result.cleared_quantity,
                "total_energy": market_result.total_energy,
                "accepted_bids": len(market_result.accepted_supply_bids),
                "marginal_plant": market_result.marginal_plant
            }
            
            total_revenue += market_result.clearing_price * market_result.total_energy
            
            # Store result in database
            self._store_market_result(market_result)
            
            # Store in memory
            if year not in self.yearly_results:
                self.yearly_results[year] = {}
            self.yearly_results[year][period] = market_result
        
        # Update game state
        session.state = GameStateEnum.market_clearing
        self.db.commit()
        
        # Calculate utility performance
        utility_performance = await self._calculate_annual_utility_performance(year)
        
        # Generate insights
        market_insights = self._generate_market_insights(year, results)
        
        return {
            "status": "annual_markets_cleared",
            "year": year,
            "results": results,
            "summary": {
                "total_market_revenue": total_revenue,
                "average_price_weighted": total_revenue / sum(r.total_energy for r in self.yearly_results[year].values()) if year in self.yearly_results else 0,
                "capacity_utilization": self._calculate_capacity_utilization(year),
                "renewable_penetration": self._calculate_renewable_penetration(year)
            },
            "utility_performance": utility_performance,
            "market_insights": market_insights
        }
    
    async def complete_year(self, year: int) -> Dict[str, any]:
        """
        Complete year operations and prepare for next year
        """
        from market_game_api import DBGameSession, GameStateEnum
        
        session = self.db.query(DBGameSession).filter(
            DBGameSession.id == self.game_session_id
        ).first()
        
        # Check if game should continue
        if year >= session.end_year:
            session.state = GameStateEnum.game_complete
            final_rankings = self._calculate_final_rankings()
            message = f"Game completed! Final results for {session.start_year}-{session.end_year}"
            additional_data = {"final_rankings": final_rankings}
        else:
            session.state = GameStateEnum.year_complete
            message = f"Year {year} completed. Preparing for {year + 1}"
            additional_data = {"next_year_preview": self._preview_next_year(year + 1)}
        
        self.db.commit()
        
        return {
            "status": "year_completed",
            "year": year,
            "message": message,
            **additional_data
        }
    
    def _generate_market_events(self, year: int) -> List[Dict]:
        """Generate random market events (plant outages, fuel shocks, weather)"""
        events = []
        
        # 20% chance of a major plant outage
        if random.random() < 0.20:
            events.append({
                "type": "plant_outage",
                "description": f"Major plant outage affects capacity in {year}",
                "impact": "Reduced supply capacity for 2-4 weeks",
                "severity": random.choice(["moderate", "severe"])
            })
        
        # 15% chance of fuel price shock
        if random.random() < 0.15:
            fuel_type = random.choice(["natural_gas", "coal"])
            direction = random.choice(["spike", "drop"])
            events.append({
                "type": "fuel_shock",
                "description": f"{fuel_type.replace('_', ' ').title()} prices {direction} unexpectedly",
                "impact": f"{'Higher' if direction == 'spike' else 'Lower'} operating costs for thermal plants",
                "fuel_affected": fuel_type,
                "magnitude": random.uniform(0.15, 0.40)  # 15-40% change
            })
        
        # 25% chance of extreme weather affecting renewables
        if random.random() < 0.25:
            weather_type = random.choice(["drought", "low_wind", "exceptional_solar"])
            events.append({
                "type": "weather_event",
                "description": f"Extreme weather: {weather_type.replace('_', ' ')} conditions",
                "impact": "Altered renewable energy production patterns",
                "affected_technologies": ["solar", "wind", "hydro"],
                "duration_months": random.randint(1, 6)
            })
        
        return events
    
    async def _update_plant_statuses(self, year: int) -> List[Dict]:
        """Update plant statuses for new year"""
        from market_game_api import DBPowerPlant, PlantStatusEnum
        
        updates = []
        
        plants = self.db.query(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == self.game_session_id
        ).all()
        
        for plant in plants:
            old_status = plant.status
            
            # Check if plant should come online
            if plant.status == PlantStatusEnum.under_construction and year >= plant.commissioning_year:
                plant.status = PlantStatusEnum.operating
                updates.append({
                    "plant_id": plant.id,
                    "plant_name": plant.name,
                    "utility_id": plant.utility_id,
                    "change": "commissioned",
                    "message": f"{plant.name} comes online with {plant.capacity_mw} MW capacity"
                })
            
            # Check if plant goes into maintenance
            maintenance_years = json.loads(plant.maintenance_years) if plant.maintenance_years else []
            if year in maintenance_years and plant.status == PlantStatusEnum.operating:
                plant.status = PlantStatusEnum.maintenance
                updates.append({
                    "plant_id": plant.id,
                    "plant_name": plant.name,
                    "utility_id": plant.utility_id,
                    "change": "maintenance",
                    "message": f"{plant.name} scheduled for maintenance (unavailable for 4 weeks)"
                })
            elif plant.status == PlantStatusEnum.maintenance and year not in maintenance_years:
                plant.status = PlantStatusEnum.operating
                updates.append({
                    "plant_id": plant.id,
                    "plant_name": plant.name,
                    "utility_id": plant.utility_id,
                    "change": "maintenance_complete",
                    "message": f"{plant.name} returns from maintenance"
                })
            
            # Check if plant should retire
            if year >= plant.retirement_year and plant.status != PlantStatusEnum.retired:
                plant.status = PlantStatusEnum.retired
                updates.append({
                    "plant_id": plant.id,
                    "plant_name": plant.name,
                    "utility_id": plant.utility_id,
                    "change": "retired",
                    "message": f"{plant.name} reaches end of economic life and retires"
                })
        
        self.db.commit()
        return updates
    
    def _get_demand_forecast(self, year: int) -> Dict[str, float]:
        """Get demand forecast for the year"""
        from market_game_api import DBGameSession
        
        session = self.db.query(DBGameSession).filter(
            DBGameSession.id == self.game_session_id
        ).first()
        
        demand_data = json.loads(session.demand_profile)
        year_offset = year - session.start_year
        growth_factor = (1 + demand_data["demand_growth_rate"]) ** year_offset
        
        return {
            "off_peak": demand_data["off_peak_demand"] * growth_factor,
            "shoulder": demand_data["shoulder_demand"] * growth_factor,
            "peak": demand_data["peak_demand"] * growth_factor,
            "growth_rate": demand_data["demand_growth_rate"],
            "total_annual_energy": (
                demand_data["off_peak_demand"] * 5000 +
                demand_data["shoulder_demand"] * 2500 +
                demand_data["peak_demand"] * 1260
            ) * growth_factor
        }
    
    def _get_fuel_prices(self, year: int) -> Dict[str, float]:
        """Get fuel prices for the year"""
        from market_game_api import DBGameSession
        
        session = self.db.query(DBGameSession).filter(
            DBGameSession.id == self.game_session_id
        ).first()
        
        fuel_prices_data = json.loads(session.fuel_prices)
        return fuel_prices_data.get(str(year), fuel_prices_data.get("2025", {}))
    
    def _get_available_plants(self, year: int) -> List[Dict]:
        """Get plants available for bidding"""
        from market_game_api import DBPowerPlant, PlantStatusEnum
        
        plants = self.db.query(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == self.game_session_id,
            DBPowerPlant.status == PlantStatusEnum.operating,
            DBPowerPlant.commissioning_year <= year,
            DBPowerPlant.retirement_year > year
        ).all()
        
        return [
            {
                "plant_id": plant.id,
                "plant_name": plant.name,
                "utility_id": plant.utility_id,
                "plant_type": plant.plant_type.value,
                "capacity_mw": plant.capacity_mw,
                "marginal_cost_estimate": plant.variable_om_per_mwh,
                "fuel_type": plant.fuel_type
            } for plant in plants
        ]
    
    def _calculate_bid_guidance(self, year: int, available_plants: List[Dict]) -> Dict[str, Dict]:
        """Calculate recommended bid prices based on marginal costs"""
        fuel_prices = self._get_fuel_prices(year)
        
        from market_game_api import DBGameSession
        session = self.db.query(DBGameSession).filter(
            DBGameSession.id == self.game_session_id
        ).first()
        
        guidance = {}
        
        for plant_info in available_plants:
            plant_id = plant_info["plant_id"]
            
            # Get the actual plant from database
            from market_game_api import DBPowerPlant
            plant = self.db.query(DBPowerPlant).filter(DBPowerPlant.id == plant_id).first()
            
            if plant and plant.fuel_type:
                fuel_cost = 0
                if plant.heat_rate and plant.fuel_type in fuel_prices:
                    fuel_cost = (plant.heat_rate * fuel_prices[plant.fuel_type]) / 1000
                
                marginal_cost = plant.variable_om_per_mwh + fuel_cost
                
                # Add carbon cost
                from electricity_market_backend import PLANT_TEMPLATES, PlantType
                try:
                    plant_type = PlantType(plant.plant_type.value)
                    template = PLANT_TEMPLATES[plant_type]
                    carbon_cost = template.co2_emissions_tons_per_mwh * session.carbon_price_per_ton
                    marginal_cost += carbon_cost
                except:
                    carbon_cost = 0
                
                guidance[plant_id] = {
                    "marginal_cost": marginal_cost,
                    "recommended_bid_range": {
                        "minimum": marginal_cost,
                        "competitive": marginal_cost * 1.1,
                        "premium": marginal_cost * 1.25
                    },
                    "fuel_cost_component": fuel_cost,
                    "carbon_cost_component": carbon_cost
                }
            else:
                # For plants without fuel (renewables, storage)
                guidance[plant_id] = {
                    "marginal_cost": plant_info["marginal_cost_estimate"],
                    "recommended_bid_range": {
                        "minimum": 0,
                        "competitive": 10,
                        "premium": 25
                    },
                    "fuel_cost_component": 0,
                    "carbon_cost_component": 0
                }
        
        return guidance
    
    def _get_plants_dict(self, year: int) -> Dict[str, PowerPlant]:
        """Get plants as domain objects for calculations"""
        from market_game_api import DBPowerPlant, PlantStatusEnum
        
        plants = self.db.query(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == self.game_session_id,
            DBPowerPlant.commissioning_year <= year,
            DBPowerPlant.retirement_year > year
        ).all()
        
        plants_dict = {}
        for plant in plants:
            # Convert to domain object
            try:
                domain_plant = PowerPlant(
                    id=plant.id,
                    utility_id=plant.utility_id,
                    name=plant.name,
                    plant_type=PlantType(plant.plant_type.value),
                    capacity_mw=plant.capacity_mw,
                    construction_start_year=plant.construction_start_year,
                    commissioning_year=plant.commissioning_year,
                    retirement_year=plant.retirement_year,
                    capital_cost_total=plant.capital_cost_total,
                    fixed_om_annual=plant.fixed_om_annual,
                    variable_om_per_mwh=plant.variable_om_per_mwh,
                    capacity_factor=plant.capacity_factor,
                    heat_rate=plant.heat_rate,
                    fuel_type=plant.fuel_type,
                    min_generation_mw=plant.min_generation_mw
                )
                plants_dict[plant.id] = domain_plant
            except Exception as e:
                print(f"Error converting plant {plant.id}: {e}")
                continue
        
        return plants_dict
    
    def _store_market_result(self, result: MarketResult):
        """Store market result in database"""
        from market_game_api import DBMarketResult, LoadPeriodEnum
        
        db_result = DBMarketResult(
            game_session_id=self.game_session_id,
            year=result.year,
            period=LoadPeriodEnum(result.period.value),
            clearing_price=result.clearing_price,
            cleared_quantity=result.cleared_quantity,
            total_energy=result.total_energy,
            accepted_supply_bids=json.dumps(result.accepted_supply_bids),
            marginal_plant=result.marginal_plant
        )
        self.db.add(db_result)
        self.db.commit()
    
    async def _calculate_annual_utility_performance(self, year: int) -> Dict[str, Dict]:
        """Calculate performance metrics for each utility"""
        from market_game_api import DBUser, DBPowerPlant, DBYearlyBid
        
        performance = {}
        
        # Get all utilities in this game
        utilities = self.db.query(DBUser).join(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == self.game_session_id
        ).distinct().all()
        
        for utility in utilities:
            utility_plants = self.db.query(DBPowerPlant).filter(
                DBPowerPlant.utility_id == utility.id,
                DBPowerPlant.game_session_id == self.game_session_id
            ).all()
            
            total_revenue = 0
            total_generation = 0
            total_capacity = sum(plant.capacity_mw for plant in utility_plants)
            
            # Calculate revenue from accepted bids
            for period, market_result in self.yearly_results.get(year, {}).items():
                for bid_id in market_result.accepted_supply_bids:
                    bid = self.db.query(DBYearlyBid).filter(DBYearlyBid.id == bid_id).first()
                    if bid and bid.utility_id == utility.id:
                        # Get quantity for this period
                        if period == LoadPeriod.OFF_PEAK:
                            quantity = bid.off_peak_quantity
                            hours = 5000
                        elif period == LoadPeriod.SHOULDER:
                            quantity = bid.shoulder_quantity
                            hours = 2500
                        else:  # PEAK
                            quantity = bid.peak_quantity
                            hours = 1260
                        
                        period_generation = quantity * hours
                        period_revenue = period_generation * market_result.clearing_price
                        
                        total_generation += period_generation
                        total_revenue += period_revenue
            
            # Calculate costs
            total_fixed_costs = sum(plant.fixed_om_annual for plant in utility_plants)
            
            performance[utility.id] = {
                "utility_name": utility.username,
                "total_revenue": total_revenue,
                "total_generation_mwh": total_generation,
                "total_capacity_mw": total_capacity,
                "capacity_factor": total_generation / (total_capacity * 8760) if total_capacity > 0 else 0,
                "total_fixed_costs": total_fixed_costs,
                "gross_profit": total_revenue - total_fixed_costs,
                "revenue_per_mwh": total_revenue / total_generation if total_generation > 0 else 0,
                "plant_count": len(utility_plants)
            }
        
        return performance
    
    def _generate_market_insights(self, year: int, results: Dict) -> List[str]:
        """Generate educational insights about market results"""
        insights = []
        
        # Price analysis
        prices = [results[period]["clearing_price"] for period in results.keys()]
        avg_price = sum(prices) / len(prices)
        max_price = max(prices)
        min_price = min(prices)
        
        insights.append(f"Average clearing price across all periods: ${avg_price:.2f}/MWh")
        
        if max_price > min_price * 2:
            insights.append("Significant price volatility between load periods - peak hours command premium prices")
        
        # Capacity analysis
        total_cleared = sum(results[period]["cleared_quantity"] for period in results.keys())
        peak_demand = results.get("peak", {}).get("cleared_quantity", 0)
        
        if peak_demand > 0:
            capacity_margin = (total_cleared - peak_demand) / peak_demand
            if capacity_margin < 0.15:
                insights.append("⚠️ Low capacity margin - market may be tight, consider new investments")
            elif capacity_margin > 0.30:
                insights.append("High capacity margin - excess generation capacity in the market")
        
        return insights
    
    def _calculate_capacity_utilization(self, year: int) -> float:
        """Calculate system-wide capacity utilization"""
        if year not in self.yearly_results:
            return 0.0
        
        total_energy = sum(result.total_energy for result in self.yearly_results[year].values())
        
        # Get total system capacity
        from market_game_api import DBPowerPlant, PlantStatusEnum
        plants = self.db.query(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == self.game_session_id,
            DBPowerPlant.status == PlantStatusEnum.operating
        ).all()
        
        total_capacity = sum(plant.capacity_mw for plant in plants)
        max_possible_energy = total_capacity * 8760  # All plants at 100% CF
        
        return total_energy / max_possible_energy if max_possible_energy > 0 else 0
    
    def _calculate_renewable_penetration(self, year: int) -> float:
        """Calculate renewable energy penetration"""
        renewable_types = ["solar", "wind_onshore", "wind_offshore", "hydro"]
        
        from market_game_api import DBPowerPlant, PlantStatusEnum
        all_plants = self.db.query(DBPowerPlant).filter(
            DBPowerPlant.game_session_id == self.game_session_id,
            DBPowerPlant.status == PlantStatusEnum.operating
        ).all()
        
        renewable_capacity = sum(
            plant.capacity_mw for plant in all_plants 
            if plant.plant_type.value in renewable_types
        )
        total_capacity = sum(plant.capacity_mw for plant in all_plants)
        
        return renewable_capacity / total_capacity if total_capacity > 0 else 0
    
    def _calculate_final_rankings(self):
        """Calculate final utility rankings"""
        return {"message": "Final rankings calculated based on ROI, market share, and sustainability"}
    
    def _preview_next_year(self, next_year: int):
        """Preview upcoming year conditions"""
        return {
            "year": next_year,
            "expected_demand_growth": "2% annual growth continues",
            "fuel_price_outlook": "Stable with some volatility",
            "regulatory_changes": "Carbon price may increase"
        }
    
    def _get_investment_opportunities(self):
        """Get available investment opportunities"""
        from electricity_market_backend import PLANT_TEMPLATES
        
        opportunities = []
        for plant_type, template in PLANT_TEMPLATES.items():
            opportunities.append({
                "plant_type": plant_type.value,
                "name": template.name,
                "overnight_cost_per_kw": template.overnight_cost_per_kw,
                "construction_time": template.construction_time_years,
                "economic_life": template.economic_life_years,
                "capacity_factor": template.capacity_factor_base,
                "emissions": template.co2_emissions_tons_per_mwh
            })
        
        return opportunities

# Integration with FastAPI
GameOrchestrator = YearlyGameOrchestrator  # Alias for backward compatibility

def add_orchestration_endpoints(app, orchestrator: YearlyGameOrchestrator):
    """Add yearly game orchestration endpoints to FastAPI app"""
    from fastapi import HTTPException
    
    @app.post("/game-sessions/{session_id}/start-year-planning/{year}")
    async def start_year_planning(session_id: str, year: int):
        flow_manager = orchestrator.get_game_flow(session_id)
        if not flow_manager:
            flow_manager = orchestrator.create_game_flow(session_id)
        
        return await flow_manager.start_year_planning(year)
    
    @app.post("/game-sessions/{session_id}/open-annual-bidding/{year}")
    async def open_annual_bidding(session_id: str, year: int):
        flow_manager = orchestrator.get_game_flow(session_id)
        if not flow_manager:
            raise HTTPException(status_code=404, detail="Game flow not found")
        
        return await flow_manager.open_annual_bidding(year)
    
    @app.post("/game-sessions/{session_id}/clear-annual-markets/{year}")
    async def clear_annual_markets(session_id: str, year: int):
        flow_manager = orchestrator.get_game_flow(session_id)
        if not flow_manager:
            raise HTTPException(status_code=404, detail="Game flow not found")
        
        return await flow_manager.clear_annual_markets(year)
    
    @app.post("/game-sessions/{session_id}/complete-year/{year}")
    async def complete_year(session_id: str, year: int):
        flow_manager = orchestrator.get_game_flow(session_id)
        if not flow_manager:
            raise HTTPException(status_code=404, detail="Game flow not found")
        
        return await flow_manager.complete_year(year)
    
    @app.get("/game-sessions/{session_id}/yearly-summary/{year}")
    async def get_yearly_summary(session_id: str, year: int):
        flow_manager = orchestrator.get_game_flow(session_id)
        if not flow_manager:
            raise HTTPException(status_code=404, detail="Game flow not found")
        
        if year not in flow_manager.yearly_results:
            raise HTTPException(status_code=404, detail=f"No results found for year {year}")
        
        results = flow_manager.yearly_results[year]
        
        # Calculate summary metrics
        total_energy = sum(result.total_energy for result in results.values())
        weighted_avg_price = sum(
            result.clearing_price * result.total_energy for result in results.values()
        ) / total_energy if total_energy > 0 else 0
        
        period_results = {}
        for period, result in results.items():
            period_results[period.value] = {
                "clearing_price": result.clearing_price,
                "cleared_quantity": result.cleared_quantity,
                "total_energy": result.total_energy,
                "marginal_plant": result.marginal_plant
            }
        
        return {
            "year": year,
            "period_results": period_results,
            "annual_summary": {
                "total_energy_mwh": total_energy,
                "weighted_average_price": weighted_avg_price,
                "total_market_value": sum(
                    result.clearing_price * result.total_energy for result in results.values()
                ),
                "capacity_utilization": flow_manager._calculate_capacity_utilization(year),
                "renewable_penetration": flow_manager._calculate_renewable_penetration(year)
            }
        }
    
    @app.get("/game-sessions/{session_id}/multi-year-analysis")
    async def get_multi_year_analysis(session_id: str):
        flow_manager = orchestrator.get_game_flow(session_id)
        if not flow_manager:
            raise HTTPException(status_code=404, detail="Game flow not found")
        
        # Analyze trends across all completed years
        yearly_data = {}
        for year, results in flow_manager.yearly_results.items():
            total_energy = sum(result.total_energy for result in results.values())
            weighted_avg_price = sum(
                result.clearing_price * result.total_energy for result in results.values()
            ) / total_energy if total_energy > 0 else 0
            
            yearly_data[year] = {
                "total_energy": total_energy,
                "average_price": weighted_avg_price,
                "capacity_utilization": flow_manager._calculate_capacity_utilization(year),
                "renewable_penetration": flow_manager._calculate_renewable_penetration(year)
            }
        
        # Calculate trends
        years = sorted(yearly_data.keys())
        trends = {}
        
        if len(years) > 1:
            price_trend = (yearly_data[years[-1]]["average_price"] - yearly_data[years[0]]["average_price"]) / len(years)
            renewable_trend = (yearly_data[years[-1]]["renewable_penetration"] - yearly_data[years[0]]["renewable_penetration"]) / len(years)
            
            trends = {
                "price_trend_per_year": price_trend,
                "renewable_growth_per_year": renewable_trend,
                "years_analyzed": len(years)
            }
        
        return {
            "session_id": session_id,
            "yearly_data": yearly_data,
            "trends": trends,
            "market_events": flow_manager.market_events,
            "analysis_period": f"{min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}"
        }
    
    @app.get("/game-sessions/{session_id}/investment-analysis")
    async def get_investment_analysis(session_id: str, utility_id: str):
        """Analyze investment opportunities for a specific utility"""
        from market_game_api import DBUser, DBPowerPlant, DBGameSession
        
        # Get utility financial position
        utility = orchestrator.db.query(DBUser).filter(DBUser.id == utility_id).first()
        if not utility:
            raise HTTPException(status_code=404, detail="Utility not found")
        
        # Get game session for parameters
        session = orchestrator.db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        # Get current portfolio
        current_plants = orchestrator.db.query(DBPowerPlant).filter(
            DBPowerPlant.utility_id == utility_id,
            DBPowerPlant.game_session_id == session_id
        ).all()
        
        portfolio_summary = {
            "total_capacity_mw": sum(plant.capacity_mw for plant in current_plants),
            "total_capital_invested": sum(plant.capital_cost_total for plant in current_plants),
            "annual_fixed_costs": sum(plant.fixed_om_annual for plant in current_plants),
            "plant_count": len(current_plants),
            "technology_mix": {}
        }
        
        # Calculate technology mix
        for plant in current_plants:
            tech = plant.plant_type.value
            if tech not in portfolio_summary["technology_mix"]:
                portfolio_summary["technology_mix"][tech] = 0
            portfolio_summary["technology_mix"][tech] += plant.capacity_mw
        
        # Investment capacity analysis
        debt_to_equity_ratio = utility.debt / utility.equity if utility.equity > 0 else float('inf')
        max_additional_debt = utility.equity * 2 - utility.debt  # 2:1 debt to equity limit
        available_investment_capacity = utility.budget + max(0, max_additional_debt)
        
        # Get investment opportunities
        flow_manager = orchestrator.get_game_flow(session_id)
        if not flow_manager:
            flow_manager = orchestrator.create_game_flow(session_id)
        
        opportunities = flow_manager._get_investment_opportunities()
        
        # Calculate potential returns for each opportunity (simplified)
        for opportunity in opportunities:
            # Estimate annual revenue potential (very simplified)
            capacity_mw = 100  # Example 100 MW plant
            annual_generation = capacity_mw * opportunity["capacity_factor"] * 8760
            estimated_price = 60  # Rough market price estimate
            annual_revenue = annual_generation * estimated_price
            
            # Estimate costs
            total_capex = capacity_mw * 1000 * opportunity["overnight_cost_per_kw"]
            annual_fixed_costs = capacity_mw * 1000 * 20  # Rough estimate
            
            # Simple ROI calculation
            annual_profit = annual_revenue - annual_fixed_costs
            simple_payback = total_capex / annual_profit if annual_profit > 0 else float('inf')
            
            opportunity.update({
                "example_100mw_analysis": {
                    "total_capex": total_capex,
                    "annual_revenue_estimate": annual_revenue,
                    "annual_profit_estimate": annual_profit,
                    "simple_payback_years": min(simple_payback, 99)  # Cap at 99 years
                }
            })
        
        return {
            "utility_id": utility_id,
            "financial_position": {
                "available_budget": utility.budget,
                "current_debt": utility.debt,
                "current_equity": utility.equity,
                "debt_to_equity_ratio": debt_to_equity_ratio,
                "available_investment_capacity": available_investment_capacity
            },
            "current_portfolio": portfolio_summary,
            "investment_opportunities": opportunities,
            "recommendations": [
                "Diversify technology portfolio to manage risk",
                "Consider renewable investments for long-term competitiveness",
                "Monitor debt levels to maintain financial flexibility",
                "Plan investments 3-5 years ahead due to construction lead times"
            ]
        }
    
    @app.post("/game-sessions/{session_id}/simulate-investment")
    async def simulate_investment(
        session_id: str, 
        utility_id: str, 
        plant_type: str, 
        capacity_mw: float,
        construction_start_year: int
    ):
        """Simulate the financial impact of a potential investment"""
        from electricity_market_backend import PLANT_TEMPLATES, PlantType
        
        try:
            plant_type_enum = PlantType(plant_type)
            template = PLANT_TEMPLATES[plant_type_enum]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid plant type: {plant_type}")
        
        # Calculate investment costs
        capacity_kw = capacity_mw * 1000
        total_capex = capacity_kw * template.overnight_cost_per_kw
        annual_fixed_om = capacity_kw * template.fixed_om_per_kw_year
        commissioning_year = construction_start_year + template.construction_time_years
        
        # Get utility current position
        from market_game_api import DBUser
        utility = orchestrator.db.query(DBUser).filter(DBUser.id == utility_id).first()
        if not utility:
            raise HTTPException(status_code=404, detail="Utility not found")
        
        # Financial impact analysis
        debt_financing = total_capex * 0.7  # 70% debt
        equity_financing = total_capex * 0.3  # 30% equity
        
        post_investment_budget = utility.budget - equity_financing
        post_investment_debt = utility.debt + debt_financing
        post_investment_equity = utility.equity - equity_financing
        
        # Revenue projection (simplified)
        annual_generation = capacity_mw * template.capacity_factor_base * 8760
        estimated_revenue_per_mwh = 55  # Market estimate
        annual_revenue_projection = annual_generation * estimated_revenue_per_mwh
        
        # Calculate financial metrics
        annual_ebitda = annual_revenue_projection - annual_fixed_om
        annual_debt_service = debt_financing * 0.06  # 6% interest rate
        annual_cash_flow = annual_ebitda - annual_debt_service
        
        return {
            "investment_summary": {
                "plant_type": plant_type,
                "capacity_mw": capacity_mw,
                "total_capex": total_capex,
                "construction_start": construction_start_year,
                "commissioning_year": commissioning_year,
                "economic_life": template.economic_life_years
            },
            "financing_structure": {
                "debt_financing": debt_financing,
                "equity_financing": equity_financing,
                "debt_percentage": 70,
                "equity_percentage": 30
            },
            "financial_impact": {
                "current_budget": utility.budget,
                "post_investment_budget": post_investment_budget,
                "current_debt": utility.debt,
                "post_investment_debt": post_investment_debt,
                "budget_sufficient": post_investment_budget >= 0
            },
            "revenue_projections": {
                "annual_generation_mwh": annual_generation,
                "estimated_revenue_per_mwh": estimated_revenue_per_mwh,
                "annual_revenue_projection": annual_revenue_projection,
                "annual_fixed_costs": annual_fixed_om,
                "annual_ebitda": annual_ebitda,
                "annual_cash_flow": annual_cash_flow
            },
            "key_metrics": {
                "capacity_factor": template.capacity_factor_base,
                "heat_rate": template.heat_rate,
                "emissions_per_mwh": template.co2_emissions_tons_per_mwh,
                "construction_time_years": template.construction_time_years
            },
            "recommendation": (
                "Proceed with investment" if post_investment_budget >= 0 and annual_cash_flow > 0
                else "Consider alternative financing or smaller capacity"
            )
        }

# Example usage and testing
if __name__ == "__main__":
    print("Yearly Electricity Market Game Orchestrator")
    print("Features:")
    print("- Multi-year capacity planning")
    print("- Annual bidding by load periods")
    print("- Investment analysis and plant construction")
    print("- Fuel price volatility and market events")
    print("- Comprehensive financial modeling")
    print("- Technology mix optimization")
    print("- Long-term strategic decision making")