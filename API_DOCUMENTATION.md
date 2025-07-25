# API Documentation: Electricity Market Game

Complete API reference for the Electricity Market Game backend.

## 🔗 Base URL
```
http://localhost:8000
```

## 📋 API Overview

The Electricity Market Game API provides endpoints for managing a multi-year electricity market simulation. The API supports:
- User and game session management
- Power plant creation and management
- Annual bidding system
- Market clearing and results
- Financial tracking and analysis

## 🔐 Authentication
Currently, the API does not require authentication. In production deployments, consider adding API keys or OAuth2.

## 📊 Core Endpoints

### Health Check
```http
GET /health
```
**Description:** Check API health and version information.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "framework": "FastAPI",
  "database": "SQLite",
  "features": ["yearly_simulation", "renewable_availability", "plant_retirement"]
}
```

---

## 👥 User Management

### Create User
```http
POST /users
```
**Description:** Create a new user (instructor or utility).

**Request Body:**
```json
{
  "username": "utility_alpha",
  "user_type": "utility"
}
```

**Parameters:**
- `username` (string): Unique username
- `user_type` (enum): "operator" or "utility"

**Response:**
```json
{
  "id": "utility_alpha_12345678",
  "username": "utility_alpha",
  "user_type": "utility",
  "budget": 2000000000.0,
  "debt": 0.0,
  "equity": 2000000000.0
}
```

### Get All Users
```http
GET /users
```
**Description:** Retrieve all users in the system.

**Response:**
```json
[
  {
    "id": "utility_alpha_12345678",
    "username": "utility_alpha",
    "user_type": "utility",
    "budget": 2000000000.0,
    "debt": 0.0,
    "equity": 2000000000.0
  }
]
```

### Get User Details
```http
GET /users/{user_id}
```
**Description:** Get detailed information about a specific user.

**Response:**
```json
{
  "id": "utility_alpha_12345678",
  "username": "utility_alpha",
  "user_type": "utility",
  "budget": 1500000000.0,
  "debt": 350000000.0,
  "equity": 1650000000.0
}
```

### Get User Financial Summary
```http
GET /users/{user_id}/financial-summary?game_session_id={session_id}
```
**Description:** Get comprehensive financial summary for a utility in a specific game session.

**Query Parameters:**
- `game_session_id` (string, required): Game session identifier

**Response:**
```json
{
  "utility_id": "utility_alpha_12345678",
  "budget": 1500000000.0,
  "debt": 350000000.0,
  "equity": 1650000000.0,
  "total_capital_invested": 500000000.0,
  "annual_fixed_costs": 25000000.0,
  "plant_count": 3,
  "total_capacity_mw": 1200.0
}
```

---

## 🎮 Game Session Management

### Create Game Session
```http
POST /game-sessions
```
**Description:** Create a new 10-year electricity market simulation.

**Request Body:**
```json
{
  "name": "Advanced Market Simulation 2025-2035",
  "operator_id": "operator_1",
  "start_year": 2025,
  "end_year": 2035,
  "carbon_price_per_ton": 50.0
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Advanced Market Simulation 2025-2035",
  "operator_id": "operator_1",
  "current_year": 2025,
  "start_year": 2025,
  "end_year": 2035,
  "state": "setup",
  "carbon_price_per_ton": 50.0
}
```

### Get Game Session
```http
GET /game-sessions/{session_id}
```
**Description:** Retrieve game session details and current state.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Advanced Market Simulation 2025-2035",
  "operator_id": "operator_1",
  "current_year": 2027,
  "start_year": 2025,
  "end_year": 2035,
  "state": "bidding_open",
  "carbon_price_per_ton": 50.0
}
```

### Get Game Dashboard
```http
GET /game-sessions/{session_id}/dashboard
```
**Description:** Get comprehensive dashboard data for instructors.

**Response:**
```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Advanced Market Simulation 2025-2035",
    "current_year": 2027,
    "state": "bidding_open",
    "carbon_price_per_ton": 50.0
  },
  "market_stats": {
    "total_capacity_mw": 3600.0,
    "total_plants": 12,
    "active_utilities": 3,
    "total_investment": 4500000000.0
  },
  "recent_investments": [
    {
      "plant_type": "solar",
      "capacity_mw": 300.0,
      "utility_id": "utility_alpha_12345678",
      "commissioning_year": 2028
    }
  ]
}
```

### Update Game State
```http
PUT /game-sessions/{session_id}/state?new_state={state}
```
**Description:** Change the game state (instructor control).

**Query Parameters:**
- `new_state` (enum): "setup", "year_planning", "bidding_open", "market_clearing", "year_complete", "game_complete"

**Response:**
```json
{
  "message": "Game state updated to bidding_open",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "new_state": "bidding_open"
}
```

### Advance Year
```http
PUT /game-sessions/{session_id}/advance-year
```
**Description:** Advance the simulation to the next year.

**Response:**
```json
{
  "message": "Advanced to year 2028",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "current_year": 2028,
  "state": "year_planning"
}
```

---

## 🏭 Power Plant Management

### Get Plant Templates
```http
GET /plant-templates
```
**Description:** Get all available power plant technology templates.

**Response:**
```json
[
  {
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
    "co2_emissions_tons_per_mwh": 0.95
  }
]
```

### Get Specific Plant Template
```http
GET /plant-templates/{plant_type}
```
**Description:** Get detailed information about a specific plant technology.

**Path Parameters:**
- `plant_type` (string): Technology type (e.g., "coal", "solar", "nuclear")

### Create Power Plant
```http
POST /game-sessions/{session_id}/plants?utility_id={utility_id}
```
**Description:** Create a new power plant for a utility.

**Query Parameters:**
- `utility_id` (string, required): Utility owner identifier

**Request Body:**
```json
{
  "name": "Solar Farm Alpha",
  "plant_type": "solar",
  "capacity_mw": 300.0,
  "construction_start_year": 2025,
  "commissioning_year": 2027,
  "retirement_year": 2052
}
```

**Response:**
```json
{
  "id": "plant_12345678",
  "utility_id": "utility_alpha_12345678",
  "name": "Solar Farm Alpha",
  "plant_type": "solar",
  "capacity_mw": 300.0,
  "construction_start_year": 2025,
  "commissioning_year": 2027,
  "retirement_year": 2052,
  "status": "under_construction",
  "capital_cost_total": 420000000.0,
  "fixed_om_annual": 5400000.0,
  "variable_om_per_mwh": 0.0,
  "capacity_factor": 0.27,
  "heat_rate": null,
  "fuel_type": null
}
```

### Get Power Plants
```http
GET /game-sessions/{session_id}/plants?utility_id={utility_id}
```
**Description:** Get all power plants in a game session, optionally filtered by utility.

**Query Parameters:**
- `utility_id` (string, optional): Filter by utility owner

**Response:**
```json
[
  {
    "id": "plant_12345678",
    "utility_id": "utility_alpha_12345678",
    "name": "Solar Farm Alpha",
    "plant_type": "solar",
    "capacity_mw": 300.0,
    "status": "operating",
    "capital_cost_total": 420000000.0,
    "fixed_om_annual": 5400000.0,
    "capacity_factor": 0.27
  }
]
```

### Retire Power Plant
```http
PUT /game-sessions/{session_id}/plants/{plant_id}/retire?retirement_year={year}
```
**Description:** Schedule early retirement for a power plant.

**Query Parameters:**
- `retirement_year` (integer, required): New retirement year

**Response:**
```json
{
  "message": "Plant Solar Farm Alpha retirement moved from 2052 to 2030",
  "plant_id": "plant_12345678",
  "old_retirement_year": 2052,
  "new_retirement_year": 2030,
  "status": "operating"
}
```

---

## 📝 Bidding System

### Submit Yearly Bid
```http
POST /game-sessions/{session_id}/bids?utility_id={utility_id}
```
**Description:** Submit annual bids for a power plant across all load periods.

**Query Parameters:**
- `utility_id` (string, required): Utility submitting the bid

**Request Body:**
```json
{
  "plant_id": "plant_12345678",
  "year": 2027,
  "off_peak_quantity": 240.0,
  "shoulder_quantity": 270.0,
  "peak_quantity": 300.0,
  "off_peak_price": 25.50,
  "shoulder_price": 28.00,
  "peak_price": 32.00
}
```

**Response:**
```json
{
  "id": "bid_87654321",
  "utility_id": "utility_alpha_12345678",
  "plant_id": "plant_12345678",
  "year": 2027,
  "off_peak_quantity": 240.0,
  "shoulder_quantity": 270.0,
  "peak_quantity": 300.0,
  "off_peak_price": 25.50,
  "shoulder_price": 28.00,
  "peak_price": 32.00
}
```

### Get Yearly Bids
```http
GET /game-sessions/{session_id}/bids?year={year}&utility_id={utility_id}
```
**Description:** Retrieve submitted bids, optionally filtered by year and utility.

**Query Parameters:**
- `year` (integer, optional): Filter by specific year
- `utility_id` (string, optional): Filter by utility

**Response:**
```json
[
  {
    "id": "bid_87654321",
    "utility_id": "utility_alpha_12345678",
    "plant_id": "plant_12345678",
    "year": 2027,
    "off_peak_quantity": 240.0,
    "off_peak_price": 25.50
  }
]
```

---

## ⚡ Market Operations

### Get Fuel Prices
```http
GET /game-sessions/{session_id}/fuel-prices/{year}
```
**Description:** Get fuel prices for a specific year.

**Path Parameters:**
- `year` (integer): Year for fuel price data

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
**Description:** Get renewable energy availability and weather conditions for a year.

**Response:**
```json
{
  "year": 2027,
  "renewable_availability": {
    "solar_availability": 0.8,
    "wind_availability": 1.2,
    "weather_description": "Cloudy year, strong wind patterns"
  },
  "impact_analysis": {
    "solar_impact": "negative",
    "wind_impact": "positive",
    "recommendations": [
      "Reduce solar capacity bids due to poor weather conditions",
      "Wind conditions are excellent - maximize wind generation bids"
    ]
  }
}
```

### Get Market Results
```http
GET /game-sessions/{session_id}/market-results?year={year}&period={period}
```
**Description:** Get market clearing results.

**Query Parameters:**
- `year` (integer, optional): Filter by specific year
- `period` (string, optional): Filter by load period ("off_peak", "shoulder", "peak")

**Response:**
```json
[
  {
    "year": 2027,
    "period": "peak",
    "clearing_price": 65.50,
    "cleared_quantity": 2400.0,
    "total_energy": 3024000.0,
    "accepted_supply_bids": ["bid_87654321", "bid_87654322"],
    "marginal_plant": "plant_12345679",
    "timestamp": "2024-01-15T10:30:00"
  }
]
```

---

## 📊 Portfolio Management

### Get Portfolio Templates
```http
GET /portfolio-templates
```
**Description:** Get predefined portfolio templates for game setup.

**Response:**
```json
[
  {
    "id": "balanced_traditional",
    "name": "Balanced Traditional",
    "description": "Coal, gas, and nuclear mix for reliable baseload generation",
    "plants": [
      {
        "plant_type": "coal",
        "capacity_mw": 600,
        "name": "Coal Baseload Plant"
      },
      {
        "plant_type": "natural_gas_cc",
        "capacity_mw": 400,
        "name": "Gas Combined Cycle"
      }
    ]
  }
]
```

### Assign Portfolio to Utility
```http
POST /game-sessions/{session_id}/assign-portfolio
```
**Description:** Assign a portfolio template to a specific utility.

**Request Body:**
```json
{
  "utility_id": "utility_alpha_12345678",
  "portfolio_id": "balanced_traditional"
}
```

**Response:**
```json
{
  "message": "Portfolio 'Balanced Traditional' assigned to utility_alpha",
  "utility_id": "utility_alpha_12345678",
  "portfolio_name": "Balanced Traditional",
  "plants_created": [
    {
      "id": "plant_coal_baseload",
      "name": "Coal Baseload Plant",
      "type": "coal",
      "capacity_mw": 600
    }
  ],
  "total_investment": 2700000000.0,
  "equity_required": 810000000.0
}
```

### Bulk Assign Portfolios
```http
POST /game-sessions/{session_id}/bulk-assign-portfolios
```
**Description:** Assign portfolio templates to multiple utilities at once.

**Request Body:**
```json
{
  "assignments": {
    "utility_alpha_12345678": "balanced_traditional",
    "utility_beta_12345679": "renewable_energy_leader",
    "utility_gamma_12345680": "natural_gas_specialist"
  }
}
```

---

## 🎯 Game Orchestration

### Start Year Planning
```http
POST /game-sessions/{session_id}/start-year-planning/{year}
```
**Description:** Begin the year planning phase for utilities.

**Response:**
```json
{
  "message": "Year planning started for 2027",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2027,
  "state": "year_planning"
}
```

### Open Annual Bidding
```http
POST /game-sessions/{session_id}/open-annual-bidding/{year}
```
**Description:** Open the bidding phase for annual market participation.

**Response:**
```json
{
  "message": "Annual bidding opened for 2027",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2027,
  "state": "bidding_open"
}
```

### Clear Annual Markets
```http
POST /game-sessions/{session_id}/clear-annual-markets/{year}
```
**Description:** Clear all markets for the year and calculate results.

**Response:**
```json
{
  "message": "Markets cleared for 2027",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2027,
  "results": {
    "off_peak": {
      "clearing_price": 45.20,
      "cleared_quantity": 1200.0,
      "total_energy": 6000000.0
    },
    "shoulder": {
      "clearing_price": 52.80,
      "cleared_quantity": 1800.0,
      "total_energy": 4500000.0
    },
    "peak": {
      "clearing_price": 68.50,
      "cleared_quantity": 2400.0,
      "total_energy": 3024000.0
    }
  }
}
```

### Complete Year
```http
POST /game-sessions/{session_id}/complete-year/{year}
```
**Description:** Mark the year as complete and prepare for next year.

**Response:**
```json
{
  "message": "Year 2027 completed successfully",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2027,
  "state": "year_complete"
}
```

---

## 📈 Analytics and Reporting

### Get Multi-Year Analysis
```http
GET /game-sessions/{session_id}/multi-year-analysis
```
**Description:** Get comprehensive analysis across all simulation years.

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "analysis_period": "2025-2027",
  "yearly_data": {
    "2025": {
      "average_price": 48.50,
      "total_energy": 13500000000.0,
      "renewable_penetration": 0.15,
      "capacity_utilization": 0.72
    },
    "2026": {
      "average_price": 52.20,
      "total_energy": 13800000000.0,
      "renewable_penetration": 0.18,
      "capacity_utilization": 0.74
    }
  },
  "market_trends": {
    "price_volatility": "moderate",
    "renewable_growth": "steady",
    "capacity_additions": "balanced"
  }
}
```

### Get Yearly Summary
```http
GET /game-sessions/{session_id}/yearly-summary/{year}
```
**Description:** Get detailed summary for a specific year.

**Response:**
```json
{
  "year": 2027,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "market_summary": {
    "total_energy_traded": 14100000000.0,
    "average_clearing_price": 55.30,
    "peak_price": 68.50,
    "off_peak_price": 45.20
  },
  "utility_performance": [
    {
      "utility_id": "utility_alpha_12345678",
      "revenue": 125000000.0,
      "market_share": 0.35,
      "capacity_factor": 0.68
    }
  ],
  "technology_mix": {
    "coal": 0.25,
    "natural_gas": 0.40,
    "nuclear": 0.20,
    "renewables": 0.15
  }
}
```

---

## 💼 Investment Analysis

### Get Investment Analysis
```http
GET /game-sessions/{session_id}/investment-analysis?utility_id={utility_id}
```
**Description:** Get investment opportunities and financial capacity analysis.

**Query Parameters:**
- `utility_id` (string, required): Utility requesting analysis

**Response:**
```json
{
  "utility_id": "utility_alpha_12345678",
  "financial_position": {
    "current_budget": 1500000000.0,
    "debt_to_equity_ratio": 0.85,
    "credit_rating": "AA",
    "available_investment_capacity": 2000000000.0
  },
  "market_opportunities": [
    {
      "technology": "solar",
      "recommended_capacity": 200,
      "estimated_roi": 0.12,
      "payback_period": 8.5
    }
  ]
}
```

### Simulate Investment
```http
POST /game-sessions/{session_id}/simulate-investment?utility_id={utility_id}&plant_type={type}&capacity_mw={capacity}&construction_start_year={year}
```
**Description:** Simulate the financial impact of a potential investment.

**Query Parameters:**
- `utility_id` (string, required): Utility considering investment
- `plant_type` (string, required): Technology type
- `capacity_mw` (number, required): Plant capacity
- `construction_start_year` (integer, required): When to start construction

**Response:**
```json
{
  "investment_summary": {
    "plant_type": "solar",
    "capacity_mw": 300.0,
    "total_capex": 420000000.0,
    "construction_start": 2025,
    "commissioning_year": 2027,
    "economic_life": 25
  },
  "financing_structure": {
    "debt_financing": 294000000.0,
    "equity_financing": 126000000.0,
    "debt_percentage": 70.0,
    "equity_percentage": 30.0
  },
  "financial_impact": {
    "current_budget": 1500000000.0,
    "post_investment_budget": 1374000000.0,
    "budget_sufficient": true
  },
  "revenue_projections": {
    "annual_generation_mwh": 709560.0,
    "estimated_revenue_per_mwh": 55.0,
    "annual_revenue_projection": 39025800.0,
    "annual_fixed_costs": 5400000.0,
    "annual_cash_flow": 33625800.0
  },
  "recommendation": "Proceed with investment - strong ROI and manageable financial impact"
}
```

---

## 🛠️ Utility Endpoints

### Create Sample Data
```http
POST /sample-data/create
```
**Description:** Create sample users, game session, and power plants for testing.

**Response:**
```json
{
  "message": "Sample data created successfully",
  "game_session_id": "sample_game_1",
  "operator_id": "operator_1",
  "utility_ids": ["utility_1", "utility_2", "utility_3"],
  "simulation_period": "2025-2035",
  "total_capacity_mw": 3200,
  "technologies": ["coal", "natural_gas_cc", "nuclear", "solar", "wind_onshore", "battery"]
}
```

---

## 🔧 Error Handling

### Standard Error Response
```json
{
  "detail": "Error description",
  "status_code": 400,
  "error_type": "validation_error"
}
```

### Common Error Codes
- **400 Bad Request**: Invalid input parameters
- **404 Not Found**: Resource doesn't exist
- **422 Unprocessable Entity**: Validation errors
- **500 Internal Server Error**: Server-side errors

### Error Examples

**Insufficient Budget:**
```json
{
  "detail": "Insufficient budget for this investment",
  "status_code": 400
}
```

**Game Session Not Found:**
```json
{
  "detail": "Game session not found",
  "status_code": 404
}
```

**Invalid Plant Type:**
```json
{
  "detail": "Plant template not found",
  "status_code": 404
}
```

---

## 🚀 Rate Limits and Performance

### Rate Limits
- **No rate limits** currently implemented
- Consider implementing in production environments
- Recommended: 100 requests per minute per IP

### Performance Considerations
- **Database**: SQLite suitable for 5-10 concurrent users
- **Scaling**: Consider PostgreSQL for larger deployments
- **Caching**: Results cached for 30 seconds
- **Optimization**: Use query parameters to limit data

---

## 🔄 API Versioning

### Current Version: 2.0.0
- **Breaking Changes**: Portfolio templates, yearly bidding system
- **New Features**: Investment simulation, multi-year analysis
- **Deprecated**: Hourly bidding system (v1.x)

### Version History
- **v2.0.0**: Yearly simulation framework
- **v1.5.0**: Enhanced financial modeling
- **v1.0.0**: Initial release with hourly simulation

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8000/health
```

### Create Sample Data
```bash
curl -X POST http://localhost:8000/sample-data/create
```

### Get Game Dashboard
```bash
curl http://localhost:8000/game-sessions/sample_game_1/dashboard
```

---

## 📞 Support

### Technical Issues
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive guides and examples
- **Community**: Connect with other developers and educators

### API Updates
- **Changelog**: Track API changes and improvements
- **Migration Guides**: Upgrade between versions
- **Deprecation Notices**: Advance warning of changes

---

**Ready to integrate the Electricity Market Game into your application? This API provides everything you need for a comprehensive market simulation experience!**