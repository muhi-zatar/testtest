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
    DBUser,
    DBGameSession,
    DBPowerPlant,
    DBYearlyBid,
    DBMarketResult,
    UserTypeEnum,
    GameStateEnum,
    PlantTypeEnum,
    PlantStatusEnum,
    LoadPeriodEnum,
    MarketTypeEnum,
    PLANT_TEMPLATES_DATA,
    DEFAULT_FUEL_PRICES,
    DEFAULT_RENEWABLE_AVAILABILITY
)

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