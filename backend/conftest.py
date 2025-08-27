"""
Pytest configuration and fixtures for backend tests
"""

import pytest
import tempfile
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from market_game_api import app, Base, get_db

@pytest.fixture(scope="session")
def test_engine():
    """Create a test database engine"""
    # Use in-memory SQLite for tests
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return engine

@pytest.fixture(scope="function")
def test_db(test_engine):
    """Create a test database session"""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    # Create tables
    Base.metadata.create_all(bind=test_engine)
    
    # Create session
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        # Clean up tables after each test
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)

@pytest.fixture(scope="function")
def test_client(test_db):
    """Create a test client with database dependency override"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as client:
        yield client
    
    # Clean up
    app.dependency_overrides.clear()

@pytest.fixture
def sample_operator():
    """Sample operator user data"""
    return {
        "username": "test_instructor",
        "user_type": "operator"
    }

@pytest.fixture
def sample_utility():
    """Sample utility user data"""
    return {
        "username": "test_utility",
        "user_type": "utility"
    }

@pytest.fixture
def sample_game_session():
    """Sample game session data"""
    return {
        "name": "Test Electricity Market Simulation",
        "operator_id": "test_operator",
        "start_year": 2025,
        "end_year": 2035,
        "carbon_price_per_ton": 50.0
    }

@pytest.fixture
def sample_power_plant():
    """Sample power plant data"""
    return {
        "name": "Test Solar Farm",
        "plant_type": "solar",
        "capacity_mw": 300.0,
        "construction_start_year": 2025,
        "commissioning_year": 2027,
        "retirement_year": 2052
    }

@pytest.fixture
def sample_yearly_bid():
    """Sample yearly bid data"""
    return {
        "plant_id": "test_plant_id",
        "year": 2025,
        "off_peak_quantity": 240.0,
        "shoulder_quantity": 270.0,
        "peak_quantity": 300.0,
        "off_peak_price": 25.0,
        "shoulder_price": 30.0,
        "peak_price": 35.0
    }