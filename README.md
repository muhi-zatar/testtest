# Electricity Market Game

A comprehensive multi-year electricity market simulation for educational purposes. Students compete as utility companies, making strategic investment decisions and bidding in electricity markets over a 10-year period (2025-2035).

## 🎯 Overview

The Electricity Market Game is an educational simulation that teaches:
- **Long-term capacity planning** and investment strategy
- **Electricity market dynamics** and price formation
- **Financial modeling** for utility companies
- **Technology portfolio optimization**
- **Risk management** in energy markets
- **Environmental policy impacts** (carbon pricing)

### Key Features

- **10-year simulation** (2025-2035) with yearly progression
- **3 load periods** instead of 8760 hours for simplified gameplay
- **8 power plant technologies** with realistic economics
- **Multi-billion dollar budgets** and authentic financing
- **Real-time market clearing** and competitive bidding
- **Weather events** and market shocks
- **Comprehensive analytics** and performance tracking

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ 
- **Git** for cloning the repository

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/electricity-market-game.git
   cd electricity-market-game
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   pip install fastapi uvicorn sqlalchemy pydantic
   ```

### Running the Game

1. **Start the backend server**
   ```bash
   cd backend
   python startup.py --dev
   ```
   This will:
   - Create the SQLite database
   - Generate sample data (3 utilities, 1 game session)
   - Start the API server on http://localhost:8000

2. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   This starts the React app on http://localhost:3000

3. **Access the game**
   - Open http://localhost:3000 in your browser
   - Choose your role: **Instructor** or **Utility**

## 🎮 How to Play

### For Instructors

1. **Select "Instructor Mode"** from the main screen
2. **Game Setup** (if starting fresh):
   - Create a new game session
   - Add 2-5 utility companies
   - Assign starting portfolios to each utility
   - Configure market parameters (carbon price, fuel prices)
3. **Market Control**:
   - Start year planning phases
   - Open bidding periods
   - Clear markets and calculate results
   - Advance to next year
   - Trigger market events (fuel shocks, weather, outages)
4. **Monitor Progress**:
   - View analytics and utility performance
   - Track market trends and competition
   - Facilitate discussions about results

### For Students (Utilities)

1. **Select "Utility Mode"** and choose your utility company
2. **Dashboard**: Review your portfolio and market conditions
3. **Portfolio Management**:
   - Analyze your existing power plants
   - Monitor capacity factors and costs
   - Plan maintenance schedules
4. **Investment Planning**:
   - Evaluate new plant technologies
   - Analyze ROI and financing options
   - Make strategic capacity investments
5. **Market Bidding**:
   - Submit annual bids for 3 load periods:
     - **Off-Peak**: 5,000 hours (nights, weekends)
     - **Shoulder**: 2,500 hours (daytime non-peak)
     - **Peak**: 1,260 hours (evening high-demand)
   - Price competitively but above marginal cost
   - Consider fuel costs and carbon pricing
6. **Performance Analysis**:
   - Review market results and revenues
   - Analyze competitor strategies
   - Plan for future years

## 🏭 Power Plant Technologies

| Technology | Capital Cost | Construction Time | Capacity Factor | Fuel Type | CO₂ Emissions |
|------------|--------------|-------------------|-----------------|-----------|---------------|
| **Coal** | $4,500/kW | 4 years | 85% | Coal | 0.95 t/MWh |
| **Natural Gas CC** | $1,200/kW | 3 years | 87% | Natural Gas | 0.35 t/MWh |
| **Natural Gas CT** | $800/kW | 2 years | 15% | Natural Gas | 0.55 t/MWh |
| **Nuclear** | $8,500/kW | 7 years | 92% | Uranium | 0.0 t/MWh |
| **Solar PV** | $1,400/kW | 2 years | 27% | None | 0.0 t/MWh |
| **Onshore Wind** | $1,650/kW | 2 years | 35% | None | 0.0 t/MWh |
| **Offshore Wind** | $4,200/kW | 4 years | 45% | None | 0.0 t/MWh |
| **Battery Storage** | $1,500/kW | 1 year | 85% | None | 0.0 t/MWh |

## 💰 Financial Model

### Starting Conditions
- Each utility begins with **$1.5-2.0B budget**
- **70% debt / 30% equity** financing for new investments
- Existing portfolio of 3-5 operating plants

### Key Metrics
- **Debt-to-Equity Ratio**: Affects credit rating and investment capacity
- **Capacity Factor**: Determines plant utilization and revenue
- **ROI Analysis**: 10-year cash flow projections for investments
- **Credit Rating**: AAA (D/E < 1.0) to BBB (D/E > 2.0)

### Revenue Model
- Revenue = Capacity × Hours × Clearing Price × Capacity Factor
- Costs = Fixed O&M + Variable O&M + Fuel Costs + Carbon Costs
- Profit = Revenue - Costs - Debt Service

## 📊 Game Mechanics

### Load Periods
The game uses 3 simplified load periods instead of 8760 hours:

- **Off-Peak** (5,000 hours): Low demand, typically nights and weekends
- **Shoulder** (2,500 hours): Medium demand, daytime non-peak hours  
- **Peak** (1,260 hours): High demand, evening hours with premium pricing

### Market Clearing
- **Merit Order Dispatch**: Plants bid by price, lowest cost serves first
- **Marginal Pricing**: All accepted bids receive the clearing price
- **Annual Bidding**: Submit yearly bids for all three periods

### Market Events
Instructors can trigger realistic events:
- **Fuel Price Shocks**: Natural gas supply disruptions
- **Weather Events**: Droughts affecting renewables
- **Plant Outages**: Unexpected capacity reductions
- **Regulatory Changes**: Carbon price increases
- **Demand Surges**: Heatwaves driving higher consumption

## 🎓 Educational Objectives

### Primary Learning Goals
1. **Strategic Planning**: Long-term capacity planning under uncertainty
2. **Financial Analysis**: Investment evaluation and risk assessment
3. **Market Dynamics**: Understanding electricity price formation
4. **Technology Assessment**: Comparing different generation technologies
5. **Policy Impact**: Effects of carbon pricing and regulations
6. **Portfolio Optimization**: Balancing risk, return, and reliability

### Key Concepts Demonstrated
- **Merit order** and marginal cost pricing
- **Capacity factor** and plant utilization
- **Technology learning curves** and cost trends
- **Renewable intermittency** and grid integration
- **Stranded assets** and technology transitions
- **Financial leverage** and credit risk

## 🔧 Configuration

### Game Parameters
Instructors can configure:
- **Simulation period**: Start and end years
- **Number of utilities**: 2-5 competing companies
- **Carbon price**: $0-200/ton CO₂
- **Fuel price trajectories**: Annual price forecasts
- **Demand growth**: 1-4% annual growth rates
- **Renewable availability**: Weather impact multipliers

### Portfolio Templates
Choose from predefined starting portfolios:
- **Balanced Traditional**: Coal, gas, nuclear mix
- **Renewable Energy Leader**: Solar, wind, storage focus
- **Natural Gas Specialist**: Flexible gas generation
- **Modern Diversified**: Balanced technology mix

## 📈 Analytics & Reporting

### Real-time Dashboards
- **Market prices** and clearing results
- **Utility performance** rankings
- **Technology penetration** trends
- **Financial health** indicators
- **Capacity utilization** metrics

### Multi-year Analysis
- **Price volatility** and market evolution
- **Investment patterns** and technology adoption
- **Renewable penetration** growth
- **Market concentration** analysis
- **ROI performance** by technology

## 🛠️ Technical Architecture

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive design
- **React Query** for data management
- **Recharts** for data visualization
- **React Router** for navigation

### Backend (Python + FastAPI)
- **FastAPI** for high-performance API
- **SQLAlchemy** for database management
- **SQLite** for simple deployment
- **Pydantic** for data validation
- **Uvicorn** ASGI server

### Database Schema
- **Users**: Instructors and utility companies
- **Game Sessions**: 10-year simulations
- **Power Plants**: Generation assets
- **Yearly Bids**: Annual market submissions
- **Market Results**: Clearing prices and quantities

## 🎯 Gameplay Tips

### For Utilities
- **Diversify your portfolio** to manage risk
- **Plan investments 3-5 years ahead** due to construction times
- **Balance baseload and peaking capacity**
- **Monitor fuel costs** and hedge exposure
- **Consider renewable investments** for long-term competitiveness
- **Maintain healthy debt-to-equity ratios**

### For Instructors
- **Start with moderate events** to build understanding
- **Allow discussion time** after major market events
- **Use analytics** to facilitate comparative analysis
- **Space events 2-3 years apart** for maximum impact
- **Explain the educational value** of each event

## 🔍 Troubleshooting

### Common Issues

**Portfolio templates not loading**
- Ensure backend server is running on port 8000
- Check browser console for API errors
- Try refreshing the page or restarting the backend

**Game session not found**
- Clear browser localStorage and restart
- Create a new game session from instructor mode
- Verify the backend database is properly initialized

**Bidding not working**
- Ensure game state is "bidding_open"
- Check that plants are in "operating" status
- Verify bid prices are greater than zero

**Market clearing fails**
- Ensure at least one utility has submitted bids
- Check that bid quantities are positive
- Verify game session state allows market clearing

### Performance Optimization
- Use Chrome or Firefox for best performance
- Close unused browser tabs during gameplay
- Restart backend server if response times slow
- Clear browser cache if experiencing display issues

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code style and standards
- Testing requirements
- Documentation updates
- Feature requests and bug reports

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Based on real electricity market principles
- Plant cost data from EIA and NREL
- Educational framework inspired by MIT and Stanford energy courses
- Built for advancing energy education and policy understanding

---

**Ready to transform energy education? Start your electricity market simulation today!**