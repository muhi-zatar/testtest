#!/usr/bin/env python3
"""
Electricity Market Game Backend - Main Startup Script
Run this to start the complete backend server with all components
"""

import uvicorn
import sys
import os
from pathlib import Path
from datetime import datetime

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

def create_sample_data():
    """Create sample users and game session for testing"""
    try:
        from market_game_api import (
            DBUser, DBGameSession, DBPowerPlant, SessionLocal, 
            PlantTypeEnum, PlantStatusEnum, UserTypeEnum, GameStateEnum,
            PLANT_TEMPLATES_DATA, DEFAULT_FUEL_PRICES
        )
        import uuid
        import json
        
        db = SessionLocal()
        
        # Check if sample data already exists
        existing_operator = db.query(DBUser).filter(DBUser.id == "operator_1").first()
        if existing_operator:
            print("ℹ️  Sample data already exists")
            # But let's check if we have plants
            plant_count = db.query(DBPowerPlant).filter(
                DBPowerPlant.game_session_id == "sample_game_1"
            ).count()
            
            if plant_count == 0:
                print("⚠️  No plants found, creating sample plants...")
                _create_sample_plants(db)
            
            db.close()
            return {
                "game_session_id": "sample_game_1",
                "operator_id": "operator_1",
                "utility_ids": ["utility_1", "utility_2", "utility_3"]
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
        print("✅ Sample users created with realistic budgets")
        
        # Create sample game session for 10-year simulation
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
        print("✅ Sample game session created (2025-2035)")
        
        # Create sample plants
        _create_sample_plants(db)
        
        db.close()
        return {
            "game_session_id": "sample_game_1",
            "operator_id": "operator_1",
            "utility_ids": ["utility_1", "utility_2", "utility_3"],
            "simulation_period": "2025-2035",
            "total_capacity_mw": 3200,
            "technologies": ["coal", "natural_gas_cc", "natural_gas_ct", "nuclear", "solar", "wind_onshore", "wind_offshore", "battery"]
        }
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        import traceback
        traceback.print_exc()
        return None

def _create_sample_plants(db):
    """Helper function to create sample plants"""
    try:
        from market_game_api import (
            DBPowerPlant, PlantTypeEnum, PlantStatusEnum, UserTypeEnum,
            PLANT_TEMPLATES_DATA
        )
        import json
        
        # Diverse sample power plants
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
        print("✅ Sample power plants created with diverse technology mix")
        
        # Update utility budgets to reflect existing investments
        from market_game_api import DBUser
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
        print("✅ Utility finances updated to reflect existing investments")
        
    except Exception as e:
        print(f"❌ Error creating sample plants: {e}")
        import traceback
        traceback.print_exc()

def create_app():
    """Create and configure the FastAPI application"""
    try:
        from market_game_api import app, SessionLocal, Base, engine
        
        # Setup database
        print("Setting up database...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
        
        # Try to initialize game orchestrator if available
        try:
            from game_orchestrator import YearlyGameOrchestrator, add_orchestration_endpoints
            print("Initializing yearly game orchestrator...")
            orchestrator = YearlyGameOrchestrator(SessionLocal())
            add_orchestration_endpoints(app, orchestrator)
            print("✅ Yearly game orchestrator initialized and endpoints added")
        except ImportError as e:
            print(f"⚠️ Game orchestrator not available: {e}")
            print("   API will work without orchestrator features")
        
        print("✅ Application created successfully")
        return app
        
    except Exception as e:
        print(f"❌ Error creating application: {e}")
        import traceback
        traceback.print_exc()
        # Return a basic app if there's an error
        from market_game_api import app
        return app

# Create the app at module level for uvicorn
app = create_app()

def print_startup_info():
    """Print helpful startup information"""
    print("\n" + "="*70)
    print("🔌 ADVANCED ELECTRICITY MARKET GAME BACKEND v2.0")
    print("   Multi-Year Capacity Planning & Investment Simulation")
    print("="*70)
    print("🚀 Server starting on: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔄 Alternative docs: http://localhost:8000/redoc")
    print("\n📋 KEY FEATURES:")
    print("="*70)
    print("🎯 YEARLY SIMULATION FRAMEWORK:")
    print("   • 10-year market simulation (2025-2035)")
    print("   • 3 load periods: Off-Peak (5000h), Shoulder (2500h), Peak (1260h)")
    print("   • Annual bidding by load period (not hourly!)")
    print("   • Long-term capacity planning and investment decisions")
    
    print("\n🏭 POWER PLANT ECONOMICS:")
    print("   • 8 realistic plant types with authentic costs")
    print("   • Capital costs, O&M costs, fuel costs, carbon costs")
    print("   • Construction lead times (1-7 years)")
    print("   • Plant maintenance schedules and retirements")
    print("   • Technology-specific capacity factors")
    
    print("\n💰 FINANCIAL MODELING:")
    print("   • Utility budgets and debt/equity financing")
    print("   • Multi-billion dollar investment decisions")
    print("   • ROI analysis and payback calculations")
    print("   • Credit ratings and financial constraints")
    
    print("\n⚡ MARKET DYNAMICS:")
    print("   • Fuel price volatility (coal, natural gas, uranium)")
    print("   • Carbon pricing ($50/ton CO2)")
    print("   • Weather events affecting renewables")
    print("   • Plant outages and market shocks")
    print("   • Merit order dispatch and marginal pricing")
    
    print("\n📊 AVAILABLE ENDPOINTS:")
    print("="*70)
    
    endpoints = [
        ("Core API", [
            "GET /health - System health check",
            "GET /game-sessions/{id}/dashboard - Game overview",
            "GET /game-sessions/{id}/multi-year-analysis - Trend analysis",
            "POST /sample-data/create - Initialize demo data"
        ]),
        ("User & Session Management", [
            "POST /users - Create operator/utility users",
            "GET /users/{id}/financial-summary - Get utility finances",
            "POST /game-sessions - Create 10-year simulation"
        ]),
        ("Plant Templates & Investment", [
            "GET /plant-templates - View all plant types & costs",
            "GET /plant-templates/{type} - Detailed plant economics",
            "POST /game-sessions/{id}/plants - Invest in new capacity",
            "GET /game-sessions/{id}/plants/{id}/economics - Plant analysis"
        ]),
        ("Market Operations", [
            "POST /game-sessions/{id}/bids - Submit yearly bids",
            "GET /game-sessions/{id}/bids - View submitted bids",
            "GET /game-sessions/{id}/fuel-prices/{year} - Fuel market data",
            "GET /game-sessions/{id}/market-results - Market outcomes"
        ])
    ]
    
    for category, endpoint_list in endpoints:
        print(f"\n📂 {category}:")
        for endpoint in endpoint_list:
            print(f"   • {endpoint}")
    
    print("\n" + "="*70)
    print("🎮 QUICK START:")
    print("="*70)
    print("1️⃣  SETUP: POST /sample-data/create (creates demo data)")
    print("2️⃣  VERIFY: GET /game-sessions/sample_game_1/dashboard")
    print("3️⃣  FRONTEND: Start React app and navigate to instructor mode")
    print("4️⃣  EXPLORE: View plants, utilities, and market data")
    
    print("\n💡 EDUCATIONAL FOCUS:")
    print("="*70)
    print("✅ Long-term capacity planning (not day-to-day operations)")
    print("✅ Investment decisions under uncertainty") 
    print("✅ Technology portfolio optimization")
    print("✅ Financial risk management")
    print("✅ Market fundamentals and price formation")
    print("✅ Renewable energy integration strategies")
    print("✅ Carbon pricing and environmental policy")
    print("✅ Realistic utility business model")
    
    print("\n✨ Ready for advanced electricity market education!")
    print("="*70)

def main():
    """Enhanced main function with development options"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Advanced Electricity Market Game Backend v2.0')
    parser.add_argument('--dev', action='store_true', help='Run in development mode with sample data')
    parser.add_argument('--port', type=int, default=8000, help='Port to run the server on')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind the server to')
    
    args = parser.parse_args()
    
    try:
        # Development mode setup
        if args.dev:
            print("🔧 DEVELOPMENT MODE - YEARLY SIMULATION")
            print("Creating comprehensive sample data...")
            result = create_sample_data()
            if result:
                print(f"✅ Sample 10-year simulation created:")
                print(f"   📅 Period: {result['simulation_period']}")
                print(f"   🏭 Total Capacity: {result['total_capacity_mw']} MW")
                print(f"   🔋 Technologies: {', '.join(result['technologies'])}")
                print(f"   🎯 Game ID: {result['game_session_id']}")
        
        # Print startup information
        print_startup_info()
        
        if args.dev:
            print("\n🔧 DEVELOPMENT MODE ACTIVE")
            print("   📊 Sample 10-year simulation ready for testing")
            print("   🔄 Auto-reload enabled for development")
            print("   💡 Try the investment analysis endpoints!")
        
        # Start the server
        print(f"\n🚀 Starting advanced market server on {args.host}:{args.port}...")
        
        if args.dev:
            # Development mode with reload
            uvicorn.run(
                "startup:app",
                host=args.host, 
                port=args.port,
                log_level="info",
                reload=True,
                reload_dirs=["."]
            )
        else:
            # Production mode
            uvicorn.run(
                app, 
                host=args.host, 
                port=args.port,
                log_level="info",
                reload=False
            )
        
    except KeyboardInterrupt:
        print("\n👋 Advanced market server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()