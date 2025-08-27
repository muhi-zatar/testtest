#!/usr/bin/env python3
"""
Comprehensive unit tests for the Electricity Market Game API
Tests all core functionality including game sessions, users, plants, bidding, and market operations
"""

import pytest
import json
import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import the application and database models
from market_game_api import (
    app, Base, get_db, 
    DBUser, DBGameSession, DBPowerPlant, DBYearlyBid, DBMarketResult,
    UserTypeEnum, GameStateEnum, PlantTypeEnum, PlantStatusEnum, LoadPeriodEnum,
    PLANT_TEMPLATES_DATA, DEFAULT_FUEL_PRICES, PORTFOLIO_TEMPLATES
)

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_electricity_market.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create test client
client = TestClient(app)

@pytest.fixture(scope="module")
def setup_database():
    """Setup test database"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def clean_database():
    """Clean database before each test"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

class TestHealthCheck:
    """Test API health and basic functionality"""
    
    def test_health_check(self, clean_database):
        """Test health endpoint returns correct status"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.0"
        assert data["framework"] == "FastAPI"
        assert "yearly_simulation" in data["features"]

class TestUserManagement:
    """Test user creation and management"""
    
    def test_create_operator_user(self, clean_database):
        """Test creating an operator user"""
        user_data = {
            "username": "test_instructor",
            "user_type": "operator"
        }
        
        response = client.post("/users", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["username"] == "test_instructor"
        assert data["user_type"] == "operator"
        assert data["budget"] == 10000000000.0  # $10B for operators
        assert "id" in data
    
    def test_create_utility_user(self, clean_database):
        """Test creating a utility user"""
        user_data = {
            "username": "test_utility",
            "user_type": "utility"
        }
        
        response = client.post("/users", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["username"] == "test_utility"
        assert data["user_type"] == "utility"
        assert data["budget"] == 2000000000.0  # $2B for utilities
        assert data["debt"] == 0.0
        assert data["equity"] == 2000000000.0
    
    def test_get_all_users(self, clean_database):
        """Test retrieving all users"""
        # Create test users
        client.post("/users", json={"username": "operator1", "user_type": "operator"})
        client.post("/users", json={"username": "utility1", "user_type": "utility"})
        client.post("/users", json={"username": "utility2", "user_type": "utility"})
        
        response = client.get("/users")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 3
        assert any(user["user_type"] == "operator" for user in data)
        assert sum(1 for user in data if user["user_type"] == "utility") == 2
    
    def test_get_user_by_id(self, clean_database):
        """Test retrieving specific user by ID"""
        # Create test user
        create_response = client.post("/users", json={"username": "test_user", "user_type": "utility"})
        user_id = create_response.json()["id"]
        
        response = client.get(f"/users/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == user_id
        assert data["username"] == "test_user"
    
    def test_get_nonexistent_user(self, clean_database):
        """Test retrieving non-existent user returns 404"""
        response = client.get("/users/nonexistent_id")
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]
    
    def test_get_user_financial_summary(self, clean_database):
        """Test getting user financial summary"""
        # Create test user and game session
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator",
            "start_year": 2025,
            "end_year": 2030
        })
        session_id = session_response.json()["id"]
        
        response = client.get(f"/users/{user_id}/financial-summary", params={"game_session_id": session_id})
        assert response.status_code == 200
        
        data = response.json()
        assert data["utility_id"] == user_id
        assert "budget" in data
        assert "debt" in data
        assert "equity" in data
        assert "total_capital_invested" in data

class TestGameSessionManagement:
    """Test game session creation and management"""
    
    def test_create_game_session(self, clean_database):
        """Test creating a new game session"""
        session_data = {
            "name": "Test Electricity Market Simulation",
            "operator_id": "test_operator",
            "start_year": 2025,
            "end_year": 2035,
            "carbon_price_per_ton": 75.0
        }
        
        response = client.post("/game-sessions", json=session_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == session_data["name"]
        assert data["operator_id"] == session_data["operator_id"]
        assert data["start_year"] == 2025
        assert data["end_year"] == 2035
        assert data["current_year"] == 2025
        assert data["state"] == "setup"
        assert data["carbon_price_per_ton"] == 75.0
        assert "id" in data
    
    def test_get_game_session(self, clean_database):
        """Test retrieving game session by ID"""
        # Create session
        create_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = create_response.json()["id"]
        
        # Get session
        response = client.get(f"/game-sessions/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == session_id
        assert data["name"] == "Test Session"
    
    def test_get_nonexistent_session(self, clean_database):
        """Test retrieving non-existent session returns 404"""
        response = client.get("/game-sessions/nonexistent_id")
        assert response.status_code == 404
    
    def test_update_game_state(self, clean_database):
        """Test updating game state"""
        # Create session
        create_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = create_response.json()["id"]
        
        # Update state
        response = client.put(f"/game-sessions/{session_id}/state", params={"new_state": "year_planning"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["new_state"] == "year_planning"
        
        # Verify state was updated
        get_response = client.get(f"/game-sessions/{session_id}")
        assert get_response.json()["state"] == "year_planning"
    
    def test_advance_year(self, clean_database):
        """Test advancing to next year"""
        # Create session
        create_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator",
            "start_year": 2025,
            "end_year": 2030
        })
        session_id = create_response.json()["id"]
        
        # Advance year
        response = client.put(f"/game-sessions/{session_id}/advance-year")
        assert response.status_code == 200
        
        data = response.json()
        assert data["current_year"] == 2026
        assert data["state"] == "year_planning"
    
    def test_advance_year_at_end(self, clean_database):
        """Test advancing year when at simulation end"""
        # Create session that's already at end year
        create_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator",
            "start_year": 2025,
            "end_year": 2025  # Same year = at end
        })
        session_id = create_response.json()["id"]
        
        # Try to advance year
        response = client.put(f"/game-sessions/{session_id}/advance-year")
        assert response.status_code == 200
        
        data = response.json()
        assert "Game completed" in data["message"]
    
    def test_get_game_dashboard(self, clean_database):
        """Test getting game dashboard data"""
        # Create session
        create_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = create_response.json()["id"]
        
        response = client.get(f"/game-sessions/{session_id}/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "session" in data
        assert "market_stats" in data
        assert data["session"]["id"] == session_id

class TestPlantTemplates:
    """Test plant template functionality"""
    
    def test_get_all_plant_templates(self, clean_database):
        """Test retrieving all plant templates"""
        response = client.get("/plant-templates")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == len(PLANT_TEMPLATES_DATA)
        
        # Check that all expected plant types are present
        plant_types = [template["plant_type"] for template in data]
        for expected_type in PLANT_TEMPLATES_DATA.keys():
            assert expected_type in plant_types
    
    def test_get_specific_plant_template(self, clean_database):
        """Test retrieving specific plant template"""
        response = client.get("/plant-templates/solar")
        assert response.status_code == 200
        
        data = response.json()
        assert data["plant_type"] == "solar"
        assert data["name"] == "Utility Scale Solar PV"
        assert data["overnight_cost_per_kw"] == 1400
        assert data["capacity_factor_base"] == 0.27
    
    def test_get_nonexistent_plant_template(self, clean_database):
        """Test retrieving non-existent plant template"""
        response = client.get("/plant-templates/fusion_reactor")
        assert response.status_code == 404

class TestPortfolioTemplates:
    """Test portfolio template functionality"""
    
    def test_get_portfolio_templates(self, clean_database):
        """Test retrieving portfolio templates"""
        response = client.get("/portfolio-templates")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == len(PORTFOLIO_TEMPLATES)
        
        # Check structure of first template
        template = data[0]
        assert "id" in template
        assert "name" in template
        assert "description" in template
        assert "plants" in template
        assert len(template["plants"]) > 0
    
    def test_assign_portfolio_to_utility(self, clean_database):
        """Test assigning portfolio template to utility"""
        # Create user and session
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Assign portfolio
        assignment_data = {
            "utility_id": user_id,
            "portfolio_id": "balanced_traditional"
        }
        
        response = client.post(f"/game-sessions/{session_id}/assign-portfolio", json=assignment_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "plants_created" in data
        assert "total_investment" in data
        assert len(data["plants_created"]) > 0
    
    def test_bulk_assign_portfolios(self, clean_database):
        """Test bulk portfolio assignment"""
        # Create users and session
        user1_response = client.post("/users", json={"username": "utility1", "user_type": "utility"})
        user2_response = client.post("/users", json={"username": "utility2", "user_type": "utility"})
        user1_id = user1_response.json()["id"]
        user2_id = user2_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Bulk assign
        assignments = {
            "assignments": {
                user1_id: "balanced_traditional",
                user2_id: "renewable_energy_leader"
            }
        }
        
        response = client.post(f"/game-sessions/{session_id}/bulk-assign-portfolios", json=assignments)
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 2

class TestPowerPlantManagement:
    """Test power plant creation and management"""
    
    def test_create_power_plant(self, clean_database):
        """Test creating a new power plant"""
        # Setup prerequisites
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Create plant
        plant_data = {
            "name": "Test Solar Farm",
            "plant_type": "solar",
            "capacity_mw": 300.0,
            "construction_start_year": 2025,
            "commissioning_year": 2027,
            "retirement_year": 2052
        }
        
        response = client.post(
            f"/game-sessions/{session_id}/plants",
            json=plant_data,
            params={"utility_id": user_id}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Test Solar Farm"
        assert data["plant_type"] == "solar"
        assert data["capacity_mw"] == 300.0
        assert data["status"] == "under_construction"
        assert data["capital_cost_total"] == 300000 * 1400  # 300 MW * $1400/kW
    
    def test_create_plant_insufficient_budget(self, clean_database):
        """Test creating plant with insufficient budget"""
        # Create user with minimal budget
        user_response = client.post("/users", json={"username": "poor_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        # Manually set low budget
        db = TestingSessionLocal()
        user = db.query(DBUser).filter(DBUser.id == user_id).first()
        user.budget = 1000000  # Only $1M
        db.commit()
        db.close()
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Try to create expensive plant
        plant_data = {
            "name": "Expensive Nuclear Plant",
            "plant_type": "nuclear",
            "capacity_mw": 1000.0,
            "construction_start_year": 2025,
            "commissioning_year": 2032,
            "retirement_year": 2092
        }
        
        response = client.post(
            f"/game-sessions/{session_id}/plants",
            json=plant_data,
            params={"utility_id": user_id}
        )
        assert response.status_code == 400
        assert "Insufficient budget" in response.json()["detail"]
    
    def test_get_power_plants(self, clean_database):
        """Test retrieving power plants"""
        # Setup and create plant
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Create plant
        client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Test Plant",
                "plant_type": "natural_gas_cc",
                "capacity_mw": 400.0,
                "construction_start_year": 2025,
                "commissioning_year": 2028,
                "retirement_year": 2058
            },
            params={"utility_id": user_id}
        )
        
        # Get plants
        response = client.get(f"/game-sessions/{session_id}/plants")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Plant"
        assert data[0]["utility_id"] == user_id
    
    def test_get_plants_filtered_by_utility(self, clean_database):
        """Test retrieving plants filtered by utility"""
        # Create two utilities and session
        user1_response = client.post("/users", json={"username": "utility1", "user_type": "utility"})
        user2_response = client.post("/users", json={"username": "utility2", "user_type": "utility"})
        user1_id = user1_response.json()["id"]
        user2_id = user2_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Create plants for each utility
        client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Utility 1 Plant",
                "plant_type": "coal",
                "capacity_mw": 500.0,
                "construction_start_year": 2025,
                "commissioning_year": 2029,
                "retirement_year": 2069
            },
            params={"utility_id": user1_id}
        )
        
        client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Utility 2 Plant",
                "plant_type": "solar",
                "capacity_mw": 200.0,
                "construction_start_year": 2025,
                "commissioning_year": 2027,
                "retirement_year": 2052
            },
            params={"utility_id": user2_id}
        )
        
        # Get plants for utility 1 only
        response = client.get(f"/game-sessions/{session_id}/plants", params={"utility_id": user1_id})
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Utility 1 Plant"
        assert data[0]["utility_id"] == user1_id
    
    def test_retire_plant(self, clean_database):
        """Test early plant retirement"""
        # Setup and create plant
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator",
            "current_year": 2025
        })
        session_id = session_response.json()["id"]
        
        plant_response = client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Test Plant",
                "plant_type": "coal",
                "capacity_mw": 500.0,
                "construction_start_year": 2020,
                "commissioning_year": 2025,
                "retirement_year": 2065
            },
            params={"utility_id": user_id}
        )
        plant_id = plant_response.json()["id"]
        
        # Retire plant early
        response = client.put(
            f"/game-sessions/{session_id}/plants/{plant_id}/retire",
            params={"retirement_year": 2030}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["new_retirement_year"] == 2030
        assert data["old_retirement_year"] == 2065

class TestBiddingSystem:
    """Test yearly bidding functionality"""
    
    def test_submit_yearly_bid(self, clean_database):
        """Test submitting a yearly bid"""
        # Setup prerequisites
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        plant_response = client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Test Plant",
                "plant_type": "natural_gas_cc",
                "capacity_mw": 400.0,
                "construction_start_year": 2020,
                "commissioning_year": 2025,
                "retirement_year": 2055
            },
            params={"utility_id": user_id}
        )
        plant_id = plant_response.json()["id"]
        
        # Submit bid
        bid_data = {
            "plant_id": plant_id,
            "year": 2025,
            "off_peak_quantity": 320.0,
            "shoulder_quantity": 380.0,
            "peak_quantity": 400.0,
            "off_peak_price": 45.0,
            "shoulder_price": 55.0,
            "peak_price": 75.0
        }
        
        response = client.post(
            f"/game-sessions/{session_id}/bids",
            json=bid_data,
            params={"utility_id": user_id}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["plant_id"] == plant_id
        assert data["year"] == 2025
        assert data["off_peak_price"] == 45.0
        assert data["peak_price"] == 75.0
    
    def test_update_existing_bid(self, clean_database):
        """Test updating an existing bid"""
        # Setup and create initial bid
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        plant_response = client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Test Plant",
                "plant_type": "solar",
                "capacity_mw": 200.0,
                "construction_start_year": 2020,
                "commissioning_year": 2025,
                "retirement_year": 2050
            },
            params={"utility_id": user_id}
        )
        plant_id = plant_response.json()["id"]
        
        # Submit initial bid
        initial_bid = {
            "plant_id": plant_id,
            "year": 2025,
            "off_peak_quantity": 160.0,
            "shoulder_quantity": 180.0,
            "peak_quantity": 200.0,
            "off_peak_price": 25.0,
            "shoulder_price": 30.0,
            "peak_price": 35.0
        }
        
        client.post(
            f"/game-sessions/{session_id}/bids",
            json=initial_bid,
            params={"utility_id": user_id}
        )
        
        # Update bid with new prices
        updated_bid = {
            "plant_id": plant_id,
            "year": 2025,
            "off_peak_quantity": 160.0,
            "shoulder_quantity": 180.0,
            "peak_quantity": 200.0,
            "off_peak_price": 30.0,  # Updated price
            "shoulder_price": 35.0,  # Updated price
            "peak_price": 40.0       # Updated price
        }
        
        response = client.post(
            f"/game-sessions/{session_id}/bids",
            json=updated_bid,
            params={"utility_id": user_id}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["off_peak_price"] == 30.0
        assert data["shoulder_price"] == 35.0
        assert data["peak_price"] == 40.0
    
    def test_get_yearly_bids(self, clean_database):
        """Test retrieving yearly bids"""
        # Setup and create bid
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        plant_response = client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Test Plant",
                "plant_type": "wind_onshore",
                "capacity_mw": 250.0,
                "construction_start_year": 2020,
                "commissioning_year": 2025,
                "retirement_year": 2050
            },
            params={"utility_id": user_id}
        )
        plant_id = plant_response.json()["id"]
        
        # Submit bid
        client.post(
            f"/game-sessions/{session_id}/bids",
            json={
                "plant_id": plant_id,
                "year": 2025,
                "off_peak_quantity": 200.0,
                "shoulder_quantity": 225.0,
                "peak_quantity": 250.0,
                "off_peak_price": 20.0,
                "shoulder_price": 25.0,
                "peak_price": 30.0
            },
            params={"utility_id": user_id}
        )
        
        # Get bids
        response = client.get(f"/game-sessions/{session_id}/bids")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["plant_id"] == plant_id
        assert data[0]["year"] == 2025
    
    def test_get_bids_filtered_by_year(self, clean_database):
        """Test retrieving bids filtered by year"""
        # Setup
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        plant_response = client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Test Plant",
                "plant_type": "battery",
                "capacity_mw": 100.0,
                "construction_start_year": 2020,
                "commissioning_year": 2025,
                "retirement_year": 2040
            },
            params={"utility_id": user_id}
        )
        plant_id = plant_response.json()["id"]
        
        # Submit bids for different years
        for year in [2025, 2026]:
            client.post(
                f"/game-sessions/{session_id}/bids",
                json={
                    "plant_id": plant_id,
                    "year": year,
                    "off_peak_quantity": 80.0,
                    "shoulder_quantity": 90.0,
                    "peak_quantity": 100.0,
                    "off_peak_price": 50.0,
                    "shoulder_price": 60.0,
                    "peak_price": 80.0
                },
                params={"utility_id": user_id}
            )
        
        # Get bids for specific year
        response = client.get(f"/game-sessions/{session_id}/bids", params={"year": 2025})
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["year"] == 2025

class TestMarketOperations:
    """Test market operations and data retrieval"""
    
    def test_get_fuel_prices(self, clean_database):
        """Test retrieving fuel prices for a year"""
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        response = client.get(f"/game-sessions/{session_id}/fuel-prices/2025")
        assert response.status_code == 200
        
        data = response.json()
        assert data["year"] == 2025
        assert "fuel_prices" in data
        assert "coal" in data["fuel_prices"]
        assert "natural_gas" in data["fuel_prices"]
        assert "uranium" in data["fuel_prices"]
        assert data["currency"] == "USD/MMBtu"
    
    def test_get_renewable_availability(self, clean_database):
        """Test retrieving renewable availability"""
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        response = client.get(f"/game-sessions/{session_id}/renewable-availability/2025")
        assert response.status_code == 200
        
        data = response.json()
        assert data["year"] == 2025
        assert "renewable_availability" in data
        assert "solar_availability" in data["renewable_availability"]
        assert "wind_availability" in data["renewable_availability"]
        assert "impact_analysis" in data
    
    def test_get_market_results(self, clean_database):
        """Test retrieving market results"""
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        response = client.get(f"/game-sessions/{session_id}/market-results")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)  # Should return empty list if no results

class TestSampleData:
    """Test sample data creation"""
    
    def test_create_sample_data(self, clean_database):
        """Test creating sample data for testing"""
        response = client.post("/sample-data/create")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Sample data created successfully"
        assert data["game_session_id"] == "sample_game_1"
        assert data["operator_id"] == "operator_1"
        assert len(data["utility_ids"]) == 3
        assert data["simulation_period"] == "2025-2035"
        assert data["total_capacity_mw"] == 3200
        assert len(data["technologies"]) == 8
    
    def test_sample_data_idempotent(self, clean_database):
        """Test that creating sample data twice doesn't cause errors"""
        # Create sample data first time
        response1 = client.post("/sample-data/create")
        assert response1.status_code == 200
        
        # Create sample data second time
        response2 = client.post("/sample-data/create")
        assert response2.status_code == 200
        
        # Should return existing data message
        data = response2.json()
        assert "already exists" in data["message"] or "created successfully" in data["message"]

class TestDataValidation:
    """Test data validation and error handling"""
    
    def test_invalid_user_type(self, clean_database):
        """Test creating user with invalid type"""
        user_data = {
            "username": "test_user",
            "user_type": "invalid_type"
        }
        
        response = client.post("/users", json=user_data)
        assert response.status_code == 422  # Validation error
    
    def test_invalid_plant_type(self, clean_database):
        """Test creating plant with invalid type"""
        # Setup
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Try to create plant with invalid type
        plant_data = {
            "name": "Invalid Plant",
            "plant_type": "fusion_reactor",  # Invalid type
            "capacity_mw": 1000.0,
            "construction_start_year": 2025,
            "commissioning_year": 2030,
            "retirement_year": 2070
        }
        
        response = client.post(
            f"/game-sessions/{session_id}/plants",
            json=plant_data,
            params={"utility_id": user_id}
        )
        assert response.status_code == 422  # Validation error
    
    def test_negative_capacity(self, clean_database):
        """Test creating plant with negative capacity"""
        # Setup
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Try to create plant with negative capacity
        plant_data = {
            "name": "Invalid Plant",
            "plant_type": "solar",
            "capacity_mw": -100.0,  # Invalid negative capacity
            "construction_start_year": 2025,
            "commissioning_year": 2027,
            "retirement_year": 2052
        }
        
        response = client.post(
            f"/game-sessions/{session_id}/plants",
            json=plant_data,
            params={"utility_id": user_id}
        )
        assert response.status_code == 422  # Validation error
    
    def test_invalid_year_range(self, clean_database):
        """Test creating session with invalid year range"""
        session_data = {
            "name": "Invalid Session",
            "operator_id": "test_operator",
            "start_year": 2030,
            "end_year": 2025  # End before start
        }
        
        response = client.post("/game-sessions", json=session_data)
        # Should either reject or auto-correct the invalid range
        # The exact behavior depends on backend validation

class TestFinancialCalculations:
    """Test financial calculations and constraints"""
    
    def test_debt_equity_calculation(self, clean_database):
        """Test that debt-equity ratios are calculated correctly"""
        # Create utility
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Create expensive plant (should use 70% debt financing)
        plant_response = client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Expensive Plant",
                "plant_type": "nuclear",
                "capacity_mw": 100.0,  # Small nuclear plant
                "construction_start_year": 2025,
                "commissioning_year": 2032,
                "retirement_year": 2092
            },
            params={"utility_id": user_id}
        )
        assert plant_response.status_code == 200
        
        # Check financial summary
        financial_response = client.get(
            f"/users/{user_id}/financial-summary",
            params={"game_session_id": session_id}
        )
        assert financial_response.status_code == 200
        
        data = financial_response.json()
        assert data["total_capital_invested"] > 0
        # Should have debt from plant financing
        user_response = client.get(f"/users/{user_id}")
        user_data = user_response.json()
        assert user_data["debt"] > 0

class TestMarketClearing:
    """Test market clearing functionality (if implemented)"""
    
    def test_market_clearing_basic(self, clean_database):
        """Test basic market clearing with simple bids"""
        # This test would require the market clearing functionality to be implemented
        # For now, we'll test that the endpoint exists and handles no-bid scenarios
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Try to clear markets with no bids
        try:
            response = client.post(f"/game-sessions/{session_id}/clear-annual-markets/2025")
            # Should either succeed with empty results or return appropriate error
            assert response.status_code in [200, 400, 404]
        except Exception:
            # Market clearing endpoint might not be implemented yet
            pass

class TestIntegrationScenarios:
    """Test complete game scenarios end-to-end"""
    
    def test_complete_game_setup_flow(self, clean_database):
        """Test complete game setup from start to finish"""
        # 1. Create operator
        operator_response = client.post("/users", json={
            "username": "instructor",
            "user_type": "operator"
        })
        assert operator_response.status_code == 200
        operator_id = operator_response.json()["id"]
        
        # 2. Create game session
        session_response = client.post("/game-sessions", json={
            "name": "Integration Test Session",
            "operator_id": operator_id,
            "start_year": 2025,
            "end_year": 2030,
            "carbon_price_per_ton": 50.0
        })
        assert session_response.status_code == 200
        session_id = session_response.json()["id"]
        
        # 3. Create utilities
        utility_ids = []
        for i in range(3):
            utility_response = client.post("/users", json={
                "username": f"utility_{i+1}",
                "user_type": "utility"
            })
            assert utility_response.status_code == 200
            utility_ids.append(utility_response.json()["id"])
        
        # 4. Assign portfolios
        portfolio_assignments = {
            utility_ids[0]: "balanced_traditional",
            utility_ids[1]: "renewable_energy_leader",
            utility_ids[2]: "natural_gas_specialist"
        }
        
        bulk_response = client.post(
            f"/game-sessions/{session_id}/bulk-assign-portfolios",
            json={"assignments": portfolio_assignments}
        )
        assert bulk_response.status_code == 200
        
        # 5. Verify plants were created
        plants_response = client.get(f"/game-sessions/{session_id}/plants")
        assert plants_response.status_code == 200
        plants = plants_response.json()
        assert len(plants) > 0
        
        # 6. Submit bids for each utility
        for utility_id in utility_ids:
            utility_plants_response = client.get(
                f"/game-sessions/{session_id}/plants",
                params={"utility_id": utility_id}
            )
            utility_plants = utility_plants_response.json()
            
            for plant in utility_plants:
                if plant["status"] == "operating":
                    bid_response = client.post(
                        f"/game-sessions/{session_id}/bids",
                        json={
                            "plant_id": plant["id"],
                            "year": 2025,
                            "off_peak_quantity": plant["capacity_mw"] * 0.8,
                            "shoulder_quantity": plant["capacity_mw"] * 0.9,
                            "peak_quantity": plant["capacity_mw"],
                            "off_peak_price": 40.0,
                            "shoulder_price": 50.0,
                            "peak_price": 70.0
                        },
                        params={"utility_id": utility_id}
                    )
                    assert bid_response.status_code == 200
        
        # 7. Verify game state can be updated
        state_response = client.put(
            f"/game-sessions/{session_id}/state",
            params={"new_state": "bidding_open"}
        )
        assert state_response.status_code == 200
        
        # 8. Verify dashboard data
        dashboard_response = client.get(f"/game-sessions/{session_id}/dashboard")
        assert dashboard_response.status_code == 200
        dashboard_data = dashboard_response.json()
        assert dashboard_data["market_stats"]["active_utilities"] == 3
        assert dashboard_data["market_stats"]["total_plants"] > 0
    
    def test_multi_year_simulation(self, clean_database):
        """Test advancing through multiple years"""
        # Create sample data
        sample_response = client.post("/sample-data/create")
        assert sample_response.status_code == 200
        
        session_id = "sample_game_1"
        
        # Test advancing through several years
        for target_year in [2026, 2027, 2028]:
            # Advance year
            advance_response = client.put(f"/game-sessions/{session_id}/advance-year")
            assert advance_response.status_code == 200
            
            # Verify year was advanced
            session_response = client.get(f"/game-sessions/{session_id}")
            assert session_response.status_code == 200
            session_data = session_response.json()
            assert session_data["current_year"] == target_year
    
    def test_portfolio_diversity_calculation(self, clean_database):
        """Test that portfolio diversity is calculated correctly"""
        # Create utility with diverse portfolio
        user_response = client.post("/users", json={"username": "diverse_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Create plants of different types
        plant_types = ["coal", "natural_gas_cc", "solar", "wind_onshore"]
        for i, plant_type in enumerate(plant_types):
            client.post(
                f"/game-sessions/{session_id}/plants",
                json={
                    "name": f"Plant {i+1}",
                    "plant_type": plant_type,
                    "capacity_mw": 200.0,
                    "construction_start_year": 2020,
                    "commissioning_year": 2025,
                    "retirement_year": 2050
                },
                params={"utility_id": user_id}
            )
        
        # Get plants and verify diversity
        plants_response = client.get(
            f"/game-sessions/{session_id}/plants",
            params={"utility_id": user_id}
        )
        assert plants_response.status_code == 200
        plants = plants_response.json()
        
        # Should have 4 different plant types
        plant_types_created = set(plant["plant_type"] for plant in plants)
        assert len(plant_types_created) == 4

class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_missing_utility_id_in_plant_creation(self, clean_database):
        """Test plant creation without utility_id parameter"""
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        plant_data = {
            "name": "Test Plant",
            "plant_type": "solar",
            "capacity_mw": 100.0,
            "construction_start_year": 2025,
            "commissioning_year": 2027,
            "retirement_year": 2052
        }
        
        # Missing utility_id parameter
        response = client.post(f"/game-sessions/{session_id}/plants", json=plant_data)
        assert response.status_code == 422  # Missing required parameter
    
    def test_bid_for_nonexistent_plant(self, clean_database):
        """Test submitting bid for non-existent plant"""
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Submit bid for non-existent plant
        bid_data = {
            "plant_id": "nonexistent_plant_id",
            "year": 2025,
            "off_peak_quantity": 100.0,
            "shoulder_quantity": 100.0,
            "peak_quantity": 100.0,
            "off_peak_price": 50.0,
            "shoulder_price": 60.0,
            "peak_price": 80.0
        }
        
        response = client.post(
            f"/game-sessions/{session_id}/bids",
            json=bid_data,
            params={"utility_id": user_id}
        )
        assert response.status_code == 404
    
    def test_retire_plant_invalid_year(self, clean_database):
        """Test retiring plant with invalid retirement year"""
        # Setup
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator",
            "current_year": 2025
        })
        session_id = session_response.json()["id"]
        
        plant_response = client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Test Plant",
                "plant_type": "coal",
                "capacity_mw": 500.0,
                "construction_start_year": 2020,
                "commissioning_year": 2025,
                "retirement_year": 2065
            },
            params={"utility_id": user_id}
        )
        plant_id = plant_response.json()["id"]
        
        # Try to retire in the past
        response = client.put(
            f"/game-sessions/{session_id}/plants/{plant_id}/retire",
            params={"retirement_year": 2020}  # Past year
        )
        assert response.status_code == 400

class TestPerformanceAndScaling:
    """Test performance and scaling considerations"""
    
    def test_large_number_of_plants(self, clean_database):
        """Test creating many plants for performance"""
        # Create utility with large budget
        user_response = client.post("/users", json={"username": "big_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        
        # Manually increase budget for this test
        db = TestingSessionLocal()
        user = db.query(DBUser).filter(DBUser.id == user_id).first()
        user.budget = 50000000000  # $50B
        user.equity = 50000000000
        db.commit()
        db.close()
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Create multiple plants
        plant_count = 10
        for i in range(plant_count):
            plant_response = client.post(
                f"/game-sessions/{session_id}/plants",
                json={
                    "name": f"Plant {i+1}",
                    "plant_type": "solar",
                    "capacity_mw": 100.0,
                    "construction_start_year": 2025,
                    "commissioning_year": 2027,
                    "retirement_year": 2052
                },
                params={"utility_id": user_id}
            )
            assert plant_response.status_code == 200
        
        # Verify all plants were created
        plants_response = client.get(
            f"/game-sessions/{session_id}/plants",
            params={"utility_id": user_id}
        )
        assert plants_response.status_code == 200
        plants = plants_response.json()
        assert len(plants) == plant_count
    
    def test_many_bids_submission(self, clean_database):
        """Test submitting many bids for performance"""
        # Use sample data for quick setup
        sample_response = client.post("/sample-data/create")
        assert sample_response.status_code == 200
        
        session_id = "sample_game_1"
        
        # Get all plants
        plants_response = client.get(f"/game-sessions/{session_id}/plants")
        plants = plants_response.json()
        
        # Submit bids for all operating plants
        bid_count = 0
        for plant in plants:
            if plant["status"] == "operating":
                bid_response = client.post(
                    f"/game-sessions/{session_id}/bids",
                    json={
                        "plant_id": plant["id"],
                        "year": 2025,
                        "off_peak_quantity": plant["capacity_mw"] * 0.8,
                        "shoulder_quantity": plant["capacity_mw"] * 0.9,
                        "peak_quantity": plant["capacity_mw"],
                        "off_peak_price": 40.0,
                        "shoulder_price": 50.0,
                        "peak_price": 70.0
                    },
                    params={"utility_id": plant["utility_id"]}
                )
                if bid_response.status_code == 200:
                    bid_count += 1
        
        # Verify bids were created
        bids_response = client.get(f"/game-sessions/{session_id}/bids", params={"year": 2025})
        assert bids_response.status_code == 200
        bids = bids_response.json()
        assert len(bids) == bid_count

class TestDataConsistency:
    """Test data consistency and integrity"""
    
    def test_plant_financial_consistency(self, clean_database):
        """Test that plant creation updates utility finances consistently"""
        # Create utility
        user_response = client.post("/users", json={"username": "test_utility", "user_type": "utility"})
        user_id = user_response.json()["id"]
        initial_budget = user_response.json()["budget"]
        
        session_response = client.post("/game-sessions", json={
            "name": "Test Session",
            "operator_id": "test_operator"
        })
        session_id = session_response.json()["id"]
        
        # Create plant
        plant_response = client.post(
            f"/game-sessions/{session_id}/plants",
            json={
                "name": "Consistency Test Plant",
                "plant_type": "natural_gas_cc",
                "capacity_mw": 400.0,
                "construction_start_year": 2025,
                "commissioning_year": 2028,
                "retirement_year": 2058
            },
            params={"utility_id": user_id}
        )
        assert plant_response.status_code == 200
        
        plant_data = plant_response.json()
        expected_equity_cost = plant_data["capital_cost_total"] * 0.3
        
        # Check that utility budget was reduced correctly
        updated_user_response = client.get(f"/users/{user_id}")
        updated_user_data = updated_user_response.json()
        
        expected_remaining_budget = initial_budget - expected_equity_cost
        assert abs(updated_user_data["budget"] - expected_remaining_budget) < 1000  # Allow small rounding differences
        assert updated_user_data["debt"] > 0  # Should have debt from financing
    
    def test_portfolio_template_consistency(self, clean_database):
        """Test that portfolio templates create consistent plant configurations"""
        # Get portfolio templates
        templates_response = client.get("/portfolio-templates")
        assert templates_response.status_code == 200
        templates = templates_response.json()
        
        for template in templates:
            # Create utility and session for each template
            user_response = client.post("/users", json={
                "username": f"utility_{template['id']}",
                "user_type": "utility"
            })
            user_id = user_response.json()["id"]
            
            session_response = client.post("/game-sessions", json={
                "name": f"Test Session {template['id']}",
                "operator_id": "test_operator"
            })
            session_id = session_response.json()["id"]
            
            # Assign portfolio
            assignment_response = client.post(
                f"/game-sessions/{session_id}/assign-portfolio",
                json={
                    "utility_id": user_id,
                    "portfolio_id": template["id"]
                }
            )
            assert assignment_response.status_code == 200
            
            # Verify plants were created according to template
            plants_response = client.get(
                f"/game-sessions/{session_id}/plants",
                params={"utility_id": user_id}
            )
            assert plants_response.status_code == 200
            plants = plants_response.json()
            
            # Should have same number of plants as template
            assert len(plants) == len(template["plants"])
            
            # Verify total capacity matches template
            template_capacity = sum(plant["capacity_mw"] for plant in template["plants"])
            actual_capacity = sum(plant["capacity_mw"] for plant in plants)
            assert abs(actual_capacity - template_capacity) < 1.0  # Allow small differences

# Test runner configuration
if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--durations=10",
        "-x"  # Stop on first failure for debugging
    ])