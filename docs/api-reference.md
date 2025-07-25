# API Reference

Complete API documentation for the Electricity Market Game backend.

## 🔗 Base Information

- **Base URL**: `http://localhost:8000`
- **API Version**: 2.0.0
- **Protocol**: HTTP/HTTPS
- **Data Format**: JSON
- **Authentication**: None (add for production)

## 📋 Quick Reference

### Core Endpoints
- `GET /health` - System health check
- `POST /sample-data/create` - Initialize demo data
- `GET /plant-templates` - Available technologies
- `GET /portfolio-templates` - Starting portfolios

### Game Management
- `POST /game-sessions` - Create simulation
- `GET /game-sessions/{id}` - Session details
- `PUT /game-sessions/{id}/state` - Control game flow
- `GET /game-sessions/{id}/dashboard` - Instructor overview

### User Operations
- `POST /users` - Create utilities/instructors
- `GET /users/{id}/financial-summary` - Financial status
- `POST /game-sessions/{id}/plants` - Build power plants
- `POST /game-sessions/{id}/bids` - Submit market bids

## 🏥 Health & Status

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "framework": "FastAPI",
  "database": "SQLite",
  "features": [
    "yearly_simulation",
    "renewable_availability", 
    "plant_retirement",
    "portfolio_templates"
  ]
}
```

**Use Cases:**
- Verify API is running
- Check version compatibility
- Monitor system status
- Validate deployment

## 👥 User Management

### Create User
```http
POST /users
```

**Request:**
```json
{
  "username": "green_energy_corp",
  "user_type": "utility"
}
```

**Response:**
```json
{
  "id": "utility_green_energy_corp_a1b2c3d4",
  "username": "green_energy_corp", 
  "user_type": "utility",
  "budget": 2000000000.0,
  "debt": 0.0,
  "equity": 2000000000.0
}
```

**Parameters:**
- `username` (string): Unique identifier for the user
- `user_type` (enum): "operator" (instructor) or "utility" (student)

### Get All Users
```http
GET /users
```

**Response:**
```json
[
  {
    "id": "utility_green_energy_corp_a1b2c3d4",
    "username": "green_energy_corp",
    "user_type": "utility",
    "budget": 1800000000.0,
    "debt": 400000000.0,
    "equity": 1600000000.0
  }
]
```

### Get User Financial Summary
```http
GET /users/{user_id}/financial-summary?game_session_id={session_id}
```

**Response:**
```json
{
  "utility_id": "utility_green_energy_corp_a1b2c3d4",
  "budget": 1800000000.0,
  "debt": 400000000.0,
  "equity": 1600000000.0,
  "total_capital_invested": 600000000.0,
  "annual_fixed_costs": 30000000.0,
  "plant_count": 4,
  "total_capacity_mw": 1500.0
}
```

## 🎮 Game Session Management

### Create Game Session
```http
POST /game-sessions
```

**Request:**
```json
{
  "name": "Advanced Energy Markets 2025-2035",
  "operator_id": "operator_instructor_main",
  "start_year": 2025,
  "end_year": 2035,
  "carbon_price_per_ton": 75.0
}
```

**Response:**
```json
{
  "id": "session_550e8400-e29b-41d4-a716-446655440000",
  "name": "Advanced Energy Markets 2025-2035",
  "operator_id": "operator_instructor_main",
  "current_year": 2025,
  "start_year": 2025,
  "end_year": 2035,
  "state": "setup",
  "carbon_price_per_ton": 75.0
}
```

### Get Game Session
```http
GET /game-sessions/{session_id}
```

**Response:**
```json
{
  "id": "session_550e8400-e29b-41d4-a716-446655440000",
  "name": "Advanced Energy Markets 2025-2035",
  "current_year": 2027,
  "state": "bidding_open",
  "carbon_price_per_ton": 75.0
}
```

### Update Game State
```http
PUT /game-sessions/{session_id}/state?new_state={state}
```

**States:**
- `setup` - Initial configuration
- `year_planning` - Investment and planning phase
- `bidding_open` - Market bidding phase
- `market_clearing` - Processing bids
- `year_complete` - Results analysis
- `game_complete` - Simulation finished

### Game Dashboard
```http
GET /game-sessions/{session_id}/dashboard
```

**Response:**
```json
{
  "session": {
    "id": "session_550e8400-e29b-41d4-a716-446655440000",
    "current_year": 2027,
    "state": "bidding_open"
  },
  "market_stats": {
    "total_capacity_mw": 4200.0,
    "total_plants": 15,
    "active_utilities": 4,
    "total_investment": 5200000000.0
  },
  "recent_investments": [
    {
      "plant_type": "solar",
      "capacity_mw": 400.0,
      "utility_id": "utility_green_energy_corp_a1b2c3d4",
      "commissioning_year": 2028
    }
  ]
}
```

## 🏭 Power Plant Management

### Get Plant Templates
```http
GET /plant-templates
```

**Response:**
```json
[
  {
    "plant_type": "solar",
    "name": "Utility Scale Solar PV",
    "overnight_cost_per_kw": 1400,
    "construction_time_years": 2,
    "economic_life_years": 25,
    "capacity_factor_base": 0.27,
    "heat_rate": null,
    "fuel_type": null,
    "fixed_om_per_kw_year": 18,
    "variable_om_per_mwh": 0.0,
    "co2_emissions_tons_per_mwh": 0.0
  }
]
```

### Create Power Plant
```http
POST /game-sessions/{session_id}/plants?utility_id={utility_id}
```

**Request:**
```json
{
  "name": "Sunrise Solar Farm",
  "plant_type": "solar",
  "capacity_mw": 400.0,
  "construction_start_year": 2025,
  "commissioning_year": 2027,
  "retirement_year": 2052
}
```

**Response:**
```json
{
  "id": "plant_sunrise_solar_farm_x1y2z3",
  "utility_id": "utility_green_energy_corp_a1b2c3d4",
  "name": "Sunrise Solar Farm",
  "plant_type": "solar",
  "capacity_mw": 400.0,
  "status": "under_construction",
  "capital_cost_total": 560000000.0,
  "fixed_om_annual": 7200000.0,
  "variable_om_per_mwh": 0.0,
  "capacity_factor": 0.27
}
```

### Get Power Plants
```http
GET /game-sessions/{session_id}/plants?utility_id={utility_id}
```

**Query Parameters:**
- `utility_id` (optional): Filter by specific utility

**Response:**
```json
[
  {
    "id": "plant_sunrise_solar_farm_x1y2z3",
    "utility_id": "utility_green_energy_corp_a1b2c3d4",
    "name": "Sunrise Solar Farm",
    "plant_type": "solar",
    "capacity_mw": 400.0,
    "status": "operating",
    "commissioning_year": 2027,
    "retirement_year": 2052
  }
]
```

## 📊 Portfolio Templates

### Get Portfolio Templates
```http
GET /portfolio-templates
```

**Response:**
```json
[
  {
    "id": "renewable_energy_leader",
    "name": "Renewable Energy Leader",
    "description": "Solar, wind, and storage focused portfolio for clean energy leadership",
    "plants": [
      {
        "plant_type": "solar",
        "capacity_mw": 500,
        "name": "Large Solar Project"
      },
      {
        "plant_type": "wind_onshore", 
        "capacity_mw": 400,
        "name": "Onshore Wind Farm"
      },
      {
        "plant_type": "battery",
        "capacity_mw": 150,
        "name": "Battery Storage System"
      },
      {
        "plant_type": "natural_gas_ct",
        "capacity_mw": 200,
        "name": "Backup Gas Turbine"
      }
    ]
  }
]
```

### Assign Portfolio to Utility
```http
POST /game-sessions/{session_id}/assign-portfolio
```

**Request:**
```json
{
  "utility_id": "utility_green_energy_corp_a1b2c3d4",
  "portfolio_id": "renewable_energy_leader"
}
```

**Response:**
```json
{
  "message": "Portfolio 'Renewable Energy Leader' assigned to green_energy_corp",
  "utility_id": "utility_green_energy_corp_a1b2c3d4",
  "portfolio_name": "Renewable Energy Leader",
  "plants_created": [
    {
      "id": "plant_large_solar_project_abc123",
      "name": "Large Solar Project",
      "type": "solar",
      "capacity_mw": 500
    }
  ],
  "total_investment": 1850000000.0,
  "equity_required": 555000000.0
}
```

### Bulk Assign Portfolios
```http
POST /game-sessions/{session_id}/bulk-assign-portfolios
```

**Request:**
```json
{
  "assignments": {
    "utility_green_energy_corp_a1b2c3d4": "renewable_energy_leader",
    "utility_traditional_power_b2c3d4e5": "balanced_traditional",
    "utility_gas_specialist_c3d4e5f6": "natural_gas_specialist"
  }
}
```

## 📝 Bidding System

### Submit Yearly Bid
```http
POST /game-sessions/{session_id}/bids?utility_id={utility_id}
```

**Request:**
```json
{
  "plant_id": "plant_sunrise_solar_farm_x1y2z3",
  "year": 2027,
  "off_peak_quantity": 320.0,
  "shoulder_quantity": 380.0,
  "peak_quantity": 400.0,
  "off_peak_price": 22.50,
  "shoulder_price": 25.00,
  "peak_price": 28.00
}
```

**Response:**
```json
{
  "id": "bid_2027_solar_farm_def456",
  "utility_id": "utility_green_energy_corp_a1b2c3d4",
  "plant_id": "plant_sunrise_solar_farm_x1y2z3",
  "year": 2027,
  "off_peak_quantity": 320.0,
  "shoulder_quantity": 380.0,
  "peak_quantity": 400.0,
  "off_peak_price": 22.50,
  "shoulder_price": 25.00,
  "peak_price": 28.00
}
```

### Get Yearly Bids
```http
GET /game-sessions/{session_id}/bids?year={year}&utility_id={utility_id}
```

**Query Parameters:**
- `year` (optional): Filter by specific year
- `utility_id` (optional): Filter by utility

## ⚡ Market Operations

### Get Fuel Prices
```http
GET /game-sessions/{session_id}/fuel-prices/{year}
```

**Response:**
```json
{
  "year": 2027,
  "fuel_prices": {
    "coal": 2.60,
    "natural_gas": 4.50,
    "uranium": 0.77
  },
  "currency": "USD/MMBtu"
}
```

### Get Renewable Availability
```http
GET /game-sessions/{session_id}/renewable-availability/{year}
```

**Response:**
```json
{
  "year": 2027,
  "renewable_availability": {
    "solar_availability": 1.2,
    "wind_availability": 0.9,
    "weather_description": "Excellent solar conditions, moderate wind"
  },
  "impact_analysis": {
    "solar_impact": "positive",
    "wind_impact": "neutral", 
    "recommendations": [
      "Consider increasing solar capacity bids due to favorable conditions",
      "Wind conditions are average - maintain normal bidding strategy"
    ]
  }
}
```

### Get Market Results
```http
GET /game-sessions/{session_id}/market-results?year={year}&period={period}
```

**Response:**
```json
[
  {
    "year": 2027,
    "period": "peak",
    "clearing_price": 68.50,
    "cleared_quantity": 2400.0,
    "total_energy": 3024000.0,
    "accepted_supply_bids": [
      "bid_2027_solar_farm_def456",
      "bid_2027_gas_plant_ghi789"
    ],
    "marginal_plant": "plant_gas_peaker_xyz789",
    "timestamp": "2024-01-15T14:30:00Z"
  }
]
```

## 🎯 Game Orchestration

### Start Year Planning
```http
POST /game-sessions/{session_id}/start-year-planning/{year}
```

**Response:**
```json
{
  "message": "Year planning started for 2027",
  "session_id": "session_550e8400-e29b-41d4-a716-446655440000",
  "year": 2027,
  "state": "year_planning",
  "phase_duration_estimate": "10-15 minutes"
}
```

### Open Annual Bidding
```http
POST /game-sessions/{session_id}/open-annual-bidding/{year}
```

**Response:**
```json
{
  "message": "Annual bidding opened for 2027",
  "session_id": "session_550e8400-e29b-41d4-a716-446655440000", 
  "year": 2027,
  "state": "bidding_open",
  "bidding_deadline": "15-20 minutes from now"
}
```

### Clear Annual Markets
```http
POST /game-sessions/{session_id}/clear-annual-markets/{year}
```

**Response:**
```json
{
  "message": "Markets cleared successfully for 2027",
  "session_id": "session_550e8400-e29b-41d4-a716-446655440000",
  "year": 2027,
  "status": "success",
  "results_summary": {
    "off_peak": {
      "clearing_price": 42.30,
      "cleared_quantity": 1200.0,
      "total_energy": 6000000.0
    },
    "shoulder": {
      "clearing_price": 55.80,
      "cleared_quantity": 1800.0, 
      "total_energy": 4500000.0
    },
    "peak": {
      "clearing_price": 68.50,
      "cleared_quantity": 2400.0,
      "total_energy": 3024000.0
    }
  },
  "total_market_value": 756570000.0
}
```

## 📈 Analytics & Reporting

### Multi-Year Analysis
```http
GET /game-sessions/{session_id}/multi-year-analysis
```

**Response:**
```json
{
  "session_id": "session_550e8400-e29b-41d4-a716-446655440000",
  "analysis_period": "2025-2027",
  "yearly_data": {
    "2025": {
      "average_price": 48.50,
      "peak_price": 65.20,
      "off_peak_price": 38.40,
      "total_energy": 13500000000.0,
      "renewable_penetration": 0.15,
      "capacity_utilization": 0.72,
      "market_value": 655750000000.0
    },
    "2026": {
      "average_price": 52.20,
      "peak_price": 69.80,
      "off_peak_price": 41.10,
      "total_energy": 13770000000.0,
      "renewable_penetration": 0.18,
      "capacity_utilization": 0.74,
      "market_value": 718644000000.0
    }
  },
  "market_trends": {
    "price_trend": "increasing",
    "renewable_growth_rate": 0.12,
    "capacity_additions_mw": 800.0,
    "average_capacity_factor": 0.73
  },
  "market_events": [
    {
      "year": 2026,
      "type": "fuel_shock",
      "description": "Natural gas price spike due to supply disruption",
      "impact": "15% increase in gas plant operating costs"
    }
  ]
}
```

### Yearly Summary
```http
GET /game-sessions/{session_id}/yearly-summary/{year}
```

**Response:**
```json
{
  "year": 2027,
  "session_id": "session_550e8400-e29b-41d4-a716-446655440000",
  "market_summary": {
    "total_energy_traded": 14100000000.0,
    "average_clearing_price": 55.30,
    "peak_price": 68.50,
    "off_peak_price": 45.20,
    "price_volatility": 0.23,
    "market_value": 779430000000.0
  },
  "utility_performance": [
    {
      "utility_id": "utility_green_energy_corp_a1b2c3d4",
      "revenue": 145000000.0,
      "market_share": 0.32,
      "capacity_factor": 0.71,
      "profit_margin": 0.18,
      "credit_rating": "AA"
    }
  ],
  "technology_mix": {
    "coal": 0.22,
    "natural_gas_cc": 0.35,
    "natural_gas_ct": 0.08,
    "nuclear": 0.18,
    "solar": 0.12,
    "wind_onshore": 0.05
  },
  "environmental_metrics": {
    "total_co2_emissions": 8500000.0,
    "emissions_intensity": 0.45,
    "renewable_generation_pct": 0.17
  }
}
```

## 💼 Investment Analysis

### Investment Analysis
```http
GET /game-sessions/{session_id}/investment-analysis?utility_id={utility_id}
```

**Response:**
```json
{
  "utility_id": "utility_green_energy_corp_a1b2c3d4",
  "financial_position": {
    "current_budget": 1800000000.0,
    "debt_to_equity_ratio": 0.75,
    "credit_rating": "AA",
    "available_investment_capacity": 2400000000.0,
    "recommended_max_investment": 800000000.0
  },
  "market_opportunities": [
    {
      "technology": "battery",
      "recommended_capacity_mw": 200,
      "estimated_capex": 300000000.0,
      "estimated_annual_revenue": 45000000.0,
      "estimated_roi": 0.15,
      "payback_period_years": 6.7,
      "risk_level": "medium"
    }
  ],
  "portfolio_analysis": {
    "current_capacity_mw": 1500.0,
    "technology_diversity_score": 0.68,
    "renewable_percentage": 0.40,
    "average_plant_age": 8.5,
    "capacity_factor_weighted": 0.71
  }
}
```

### Simulate Investment
```http
POST /game-sessions/{session_id}/simulate-investment
```

**Query Parameters:**
- `utility_id` (required): Utility considering investment
- `plant_type` (required): Technology type
- `capacity_mw` (required): Plant capacity
- `construction_start_year` (required): Start year

**Response:**
```json
{
  "investment_summary": {
    "plant_type": "battery",
    "capacity_mw": 200.0,
    "total_capex": 300000000.0,
    "construction_start": 2025,
    "commissioning_year": 2026,
    "economic_life": 15,
    "technology_risk": "medium"
  },
  "financing_structure": {
    "debt_financing": 210000000.0,
    "equity_financing": 90000000.0,
    "debt_percentage": 70.0,
    "equity_percentage": 30.0,
    "estimated_interest_rate": 0.045
  },
  "financial_impact": {
    "current_budget": 1800000000.0,
    "post_investment_budget": 1710000000.0,
    "current_debt_equity_ratio": 0.75,
    "post_investment_debt_equity_ratio": 0.89,
    "budget_sufficient": true,
    "credit_rating_impact": "none"
  },
  "revenue_projections": {
    "annual_generation_mwh": 1482000.0,
    "estimated_revenue_per_mwh": 65.0,
    "annual_revenue_projection": 96330000.0,
    "annual_fixed_costs": 5000000.0,
    "annual_variable_costs": 2964000.0,
    "annual_ebitda": 88366000.0,
    "annual_cash_flow": 78366000.0
  },
  "key_metrics": {
    "capacity_factor": 0.85,
    "heat_rate": null,
    "emissions_per_mwh": 0.0,
    "construction_time_years": 1,
    "economic_life_years": 15
  },
  "risk_analysis": {
    "technology_risk": "medium",
    "market_risk": "low",
    "regulatory_risk": "low",
    "financial_risk": "low",
    "overall_risk": "medium"
  },
  "recommendation": "Proceed with investment - strong ROI potential and manageable risk profile"
}
```

## 🛠️ Utility Functions

### Create Sample Data
```http
POST /sample-data/create
```

**Response:**
```json
{
  "message": "Sample data created successfully",
  "game_session_id": "sample_game_1",
  "operator_id": "operator_1", 
  "utility_ids": ["utility_1", "utility_2", "utility_3"],
  "simulation_period": "2025-2035",
  "total_capacity_mw": 3600,
  "total_investment": 4200000000.0,
  "technologies": [
    "coal", "natural_gas_cc", "natural_gas_ct", 
    "nuclear", "solar", "wind_onshore", "wind_offshore", "battery"
  ],
  "portfolio_distribution": {
    "utility_1": "balanced_traditional",
    "utility_2": "renewable_energy_leader", 
    "utility_3": "natural_gas_specialist"
  }
}
```

## 🚨 Error Handling

### Standard Error Format
```json
{
  "detail": "Detailed error description",
  "error_code": "INSUFFICIENT_BUDGET",
  "status_code": 400,
  "timestamp": "2024-01-15T14:30:00Z",
  "request_id": "req_abc123def456"
}
```

### Common Errors

**400 Bad Request - Insufficient Budget**
```json
{
  "detail": "Insufficient budget for this investment. Required: $90M, Available: $75M",
  "error_code": "INSUFFICIENT_BUDGET",
  "status_code": 400
}
```

**404 Not Found - Game Session**
```json
{
  "detail": "Game session not found or has been deleted",
  "error_code": "SESSION_NOT_FOUND", 
  "status_code": 404
}
```

**422 Validation Error - Invalid Plant Type**
```json
{
  "detail": "Plant type 'fusion_reactor' is not supported",
  "error_code": "INVALID_PLANT_TYPE",
  "status_code": 422,
  "supported_types": ["coal", "natural_gas_cc", "solar", "wind_onshore", "nuclear", "battery"]
}
```

**409 Conflict - Duplicate Bid**
```json
{
  "detail": "Bid already exists for this plant and year. Use PUT to update existing bid.",
  "error_code": "DUPLICATE_BID",
  "status_code": 409,
  "existing_bid_id": "bid_2027_solar_farm_def456"
}
```

## 🔧 Rate Limits & Performance

### Rate Limits
- **General Endpoints**: 100 requests/minute per IP
- **Market Operations**: 50 requests/minute per session
- **Bulk Operations**: 10 requests/minute per session

### Performance Guidelines
- **Concurrent Users**: Up to 10 users per instance
- **Database**: SQLite suitable for educational use
- **Scaling**: Consider PostgreSQL for production
- **Caching**: Results cached for 30 seconds

### Optimization Tips
- Use query parameters to limit data
- Batch operations when possible
- Cache frequently accessed data
- Monitor response times

## 🧪 Testing Examples

### Basic Health Check
```bash
curl http://localhost:8000/health
```

### Create Sample Environment
```bash
# Create sample data
curl -X POST http://localhost:8000/sample-data/create

# Verify game session
curl http://localhost:8000/game-sessions/sample_game_1

# Check available templates
curl http://localhost:8000/portfolio-templates
```

### Simulate Game Flow
```bash
# Start year planning
curl -X POST http://localhost:8000/game-sessions/sample_game_1/start-year-planning/2025

# Open bidding
curl -X POST http://localhost:8000/game-sessions/sample_game_1/open-annual-bidding/2025

# Submit a bid
curl -X POST "http://localhost:8000/game-sessions/sample_game_1/bids?utility_id=utility_1" \
  -H "Content-Type: application/json" \
  -d '{
    "plant_id": "plant_riverside_coal_plant",
    "year": 2025,
    "off_peak_quantity": 500,
    "shoulder_quantity": 550,
    "peak_quantity": 600,
    "off_peak_price": 45.0,
    "shoulder_price": 50.0,
    "peak_price": 65.0
  }'

# Clear markets
curl -X POST http://localhost:8000/game-sessions/sample_game_1/clear-annual-markets/2025
```

## 📚 Integration Examples

### Python Client Example
```python
import requests
import json

class ElectricityMarketClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def create_game_session(self, name, operator_id):
        response = requests.post(f"{self.base_url}/game-sessions", json={
            "name": name,
            "operator_id": operator_id,
            "start_year": 2025,
            "end_year": 2035,
            "carbon_price_per_ton": 50.0
        })
        return response.json()
    
    def get_portfolio_templates(self):
        response = requests.get(f"{self.base_url}/portfolio-templates")
        return response.json()
    
    def assign_portfolio(self, session_id, utility_id, portfolio_id):
        response = requests.post(
            f"{self.base_url}/game-sessions/{session_id}/assign-portfolio",
            json={
                "utility_id": utility_id,
                "portfolio_id": portfolio_id
            }
        )
        return response.json()

# Usage example
client = ElectricityMarketClient()
session = client.create_game_session("Test Game", "instructor_1")
templates = client.get_portfolio_templates()
print(f"Created session: {session['id']}")
print(f"Available portfolios: {len(templates)}")
```

### JavaScript/Node.js Example
```javascript
const axios = require('axios');

class ElectricityMarketAPI {
  constructor(baseURL = 'http://localhost:8000') {
    this.client = axios.create({ baseURL });
  }

  async createUser(username, userType) {
    const response = await this.client.post('/users', {
      username,
      user_type: userType
    });
    return response.data;
  }

  async getPlantTemplates() {
    const response = await this.client.get('/plant-templates');
    return response.data;
  }

  async submitBid(sessionId, utilityId, bidData) {
    const response = await this.client.post(
      `/game-sessions/${sessionId}/bids`,
      bidData,
      { params: { utility_id: utilityId } }
    );
    return response.data;
  }
}

// Usage
const api = new ElectricityMarketAPI();
api.createUser('renewable_corp', 'utility')
  .then(user => console.log('Created user:', user.id));
```

## 🔄 Webhooks (Future Feature)

### Planned Webhook Events
- `game.year_started` - New year begins
- `game.bidding_opened` - Bidding phase starts
- `game.markets_cleared` - Results available
- `game.event_triggered` - Market event occurs
- `utility.investment_made` - New plant created
- `utility.bid_submitted` - Bid received

### Webhook Payload Example
```json
{
  "event": "game.markets_cleared",
  "timestamp": "2024-01-15T14:30:00Z",
  "session_id": "session_550e8400-e29b-41d4-a716-446655440000",
  "year": 2027,
  "data": {
    "clearing_prices": {
      "off_peak": 42.30,
      "shoulder": 55.80,
      "peak": 68.50
    },
    "total_energy": 13524000000.0,
    "participating_utilities": 4
  }
}
```

## 📞 Support & Resources

### Documentation
- **Getting Started**: Setup and first game
- **Instructor Manual**: Comprehensive teaching guide
- **Student Guide**: Player handbook
- **API Reference**: Complete endpoint documentation

### Community
- **GitHub Discussions**: Questions and community support
- **Educational Forum**: Teaching strategies and experiences
- **Discord Server**: Real-time chat and support
- **Monthly Webinars**: Training and best practices

### Professional Services
- **Custom Development**: Tailored features and modifications
- **Training Workshops**: Instructor certification programs
- **Consulting**: Curriculum integration and optimization
- **Technical Support**: Priority support for institutions

---

**Ready to integrate the Electricity Market Game into your educational program? This API provides everything you need for a comprehensive market simulation experience!**