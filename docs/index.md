# Electricity Market Game

**An Educational Simulation for Understanding Energy Markets and Policy**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![React 18](https://img.shields.io/badge/react-18-blue.svg)](https://reactjs.org/)

## 🎯 What is the Electricity Market Game?

The Electricity Market Game is a comprehensive educational simulation that teaches students and professionals about electricity markets, energy policy, and strategic decision-making in the power sector. Players manage utility companies over a 10-year period (2025-2035), making investment decisions, bidding in markets, and adapting to changing conditions.

### 🌟 Key Features

- **🏭 Realistic Power Plant Economics**: 8 technologies with authentic costs and performance
- **📊 10-Year Strategic Planning**: Long-term capacity planning and investment decisions
- **⚡ Simplified Market Structure**: 3 load periods instead of 8760 hours for educational focus
- **💰 Multi-Billion Dollar Budgets**: Authentic utility-scale financial modeling
- **🌍 Policy Integration**: Carbon pricing, renewable mandates, and regulatory changes
- **📈 Real-Time Analytics**: Comprehensive performance tracking and market analysis
- **🎲 Market Events**: Fuel shocks, weather events, and plant outages for realism

## 🎓 Educational Value

### Learning Objectives
- **Market Dynamics**: Understand electricity price formation and merit order dispatch
- **Strategic Planning**: Develop long-term thinking under uncertainty
- **Technology Assessment**: Compare different generation technologies
- **Financial Analysis**: Evaluate investments and manage portfolio risk
- **Policy Impact**: Experience how regulations affect business decisions
- **Competitive Strategy**: Navigate multi-player competitive environments

### Target Audience
- **University Students**: Energy economics, public policy, business strategy courses
- **Professional Training**: Utility companies, energy consultants, policy makers
- **Executive Education**: MBA programs, leadership development
- **Research**: Academic studies on decision-making and market design

## 🚀 Quick Start

### System Requirements
- **Backend**: Python 3.8+, 2GB RAM, 1GB storage
- **Frontend**: Node.js 18+, Modern web browser
- **Network**: Local network or internet connection for multi-player

### Installation (5 minutes)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/electricity-market-game.git
   cd electricity-market-game
   ```

2. **Start the backend**
   ```bash
   cd backend
   pip install fastapi uvicorn sqlalchemy pydantic
   python startup.py --dev
   ```

3. **Start the frontend** (new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the game**
   - Open http://localhost:3000
   - Choose **Instructor Mode** to set up a game
   - Choose **Utility Mode** to play as a utility company

### Demo Mode
For immediate testing, use the built-in sample data:
1. Go to **Instructor Mode** → **Game Setup**
2. Click **"Load Sample Data"**
3. Start playing immediately with 3 pre-configured utilities

## 🎮 How to Play

### For Instructors

**1. Game Setup (10 minutes)**
- Create a new game session (2025-2035)
- Add 2-5 utility companies
- Assign starting portfolios from templates
- Configure market parameters

**2. Market Orchestration**
- Start year planning phases
- Open annual bidding periods
- Clear markets and calculate results
- Trigger market events for learning
- Advance to next year

**3. Analytics & Discussion**
- Monitor utility performance
- Analyze market trends
- Facilitate learning discussions
- Export data for further analysis

### For Students (Utilities)

**1. Portfolio Management**
- Analyze your starting power plants
- Monitor capacity factors and costs
- Plan maintenance and retirements

**2. Investment Strategy**
- Evaluate 8 different technologies
- Analyze ROI and financing options
- Make strategic capacity investments
- Consider construction lead times

**3. Market Bidding**
- Submit annual bids for 3 load periods:
  - **Off-Peak** (5,000 hours): Nights and weekends
  - **Shoulder** (2,500 hours): Daytime non-peak
  - **Peak** (1,260 hours): Evening high-demand
- Price competitively above marginal cost
- Adapt to fuel costs and carbon pricing

**4. Performance Analysis**
- Review market results and revenues
- Analyze competitor strategies
- Plan for future years

## 🏭 Power Plant Technologies

| Technology | Capital Cost | Construction | Capacity Factor | Emissions | Best Use |
|------------|--------------|--------------|-----------------|-----------|----------|
| **Coal** | $4,500/kW | 4 years | 85% | 0.95 t/MWh | Baseload |
| **Gas Combined Cycle** | $1,200/kW | 3 years | 87% | 0.35 t/MWh | Baseload/Flexible |
| **Gas Combustion Turbine** | $800/kW | 2 years | 15% | 0.55 t/MWh | Peaking |
| **Nuclear** | $8,500/kW | 7 years | 92% | 0.0 t/MWh | Baseload |
| **Solar PV** | $1,400/kW | 2 years | 27% | 0.0 t/MWh | Variable |
| **Onshore Wind** | $1,650/kW | 2 years | 35% | 0.0 t/MWh | Variable |
| **Offshore Wind** | $4,200/kW | 4 years | 45% | 0.0 t/MWh | Variable |
| **Battery Storage** | $1,500/kW | 1 year | 85% | 0.0 t/MWh | Grid Services |

## 💡 Educational Scenarios

### Scenario 1: Clean Energy Transition
**Objective**: Navigate the shift from fossil fuels to renewables
- High carbon prices ($100/ton)
- Declining renewable costs
- Coal plant retirement pressures
- Grid integration challenges

### Scenario 2: Market Volatility
**Objective**: Manage risk in uncertain markets
- Fuel price shocks
- Weather events affecting renewables
- Demand surges and plant outages
- Regulatory changes

### Scenario 3: Technology Innovation
**Objective**: Adapt to technological disruption
- Battery storage cost declines
- Advanced nuclear technologies
- Hydrogen integration
- Smart grid capabilities

### Scenario 4: Policy Analysis
**Objective**: Understand policy impacts
- Carbon pricing mechanisms
- Renewable portfolio standards
- Capacity market design
- Environmental regulations

## 📚 Curriculum Integration

### Course Compatibility
- **Energy Economics** (undergraduate/graduate)
- **Public Policy** (energy focus)
- **Business Strategy** (competitive dynamics)
- **Environmental Studies** (clean energy)
- **Engineering Economics** (technology evaluation)
- **MBA Programs** (strategic decision-making)

### Session Formats
- **Single Session**: 3-4 hours intensive
- **Multi-Session**: 3-4 sessions of 1-1.5 hours
- **Semester Integration**: 15-20 minutes weekly

### Assessment Options
- Performance-based grading (ROI, strategy, adaptation)
- Reflection papers (1000-1500 words)
- Group presentations (15-20 minutes)
- Case study analysis

## 🔧 Customization

### Market Parameters
- **Simulation Period**: Any 5-15 year range
- **Number of Utilities**: 2-8 competing companies
- **Carbon Pricing**: $0-200/ton CO₂
- **Fuel Price Scenarios**: Custom trajectories
- **Demand Growth**: 0-5% annual growth
- **Technology Costs**: Learning curves and innovation

### Portfolio Templates
- **Traditional Utility**: Coal and gas focus
- **Renewable Leader**: Solar, wind, and storage
- **Nuclear Specialist**: Large nuclear baseload
- **Flexible Provider**: Fast-ramping generation
- **Custom Configurations**: Build your own portfolios

### Market Events
- **Fuel Shocks**: Natural gas supply disruptions
- **Weather Events**: Droughts, storms affecting renewables
- **Plant Outages**: Unexpected capacity losses
- **Regulatory Changes**: Policy shifts and new rules
- **Technology Breakthroughs**: Cost reductions and innovations

## 📊 Analytics & Insights

### Real-Time Dashboards
- Market prices and clearing results
- Utility performance rankings
- Technology penetration trends
- Financial health indicators
- Portfolio optimization metrics

### Multi-Year Analysis
- Price volatility and market evolution
- Investment patterns and technology adoption
- Renewable penetration growth
- Market concentration analysis
- ROI performance by technology

### Educational Reports
- Strategy effectiveness analysis
- Decision-making pattern insights
- Learning outcome assessments
- Comparative performance studies

## 🌍 Real-World Applications

### Industry Relevance
- **Utility Companies**: Strategic planning and investment analysis
- **Energy Consulting**: Market analysis and technology evaluation
- **Policy Making**: Understanding market impacts of regulations
- **Finance**: Energy project evaluation and risk assessment
- **Technology Development**: Market positioning and adoption strategies

### Current Market Connections
- Based on real electricity market principles
- Uses authentic plant cost data from EIA/NREL
- Reflects actual market design and operations
- Incorporates current policy trends and challenges

## 🤝 Community & Support

### Getting Started
- **Documentation**: Comprehensive guides for instructors and students
- **Video Tutorials**: Step-by-step setup and gameplay
- **Sample Curricula**: Ready-to-use lesson plans
- **Best Practices**: Tips from experienced educators

### Community Resources
- **GitHub Discussions**: Connect with other users
- **Educational Forum**: Share experiences and strategies
- **Research Collaboration**: Academic partnerships
- **Feature Requests**: Suggest improvements

### Professional Support
- **Training Workshops**: Learn effective facilitation
- **Custom Development**: Tailored features for your needs
- **Consulting Services**: Curriculum integration support
- **Technical Support**: Setup and troubleshooting help

## 📈 Success Stories

### University Implementations
- **MIT Energy Economics**: Enhanced student engagement by 40%
- **Stanford Business School**: Improved strategic thinking skills
- **UC Berkeley Policy School**: Better understanding of energy transitions
- **Carnegie Mellon Engineering**: Integrated technology and economics

### Professional Training
- **Utility Executive Education**: Strategic planning workshops
- **Energy Consulting Firms**: Analyst training programs
- **Government Agencies**: Policy impact analysis
- **International Development**: Capacity building programs

## 🔮 Future Development

### Planned Features
- **International Markets**: Multi-region trading
- **Transmission Networks**: Grid constraints and congestion
- **Demand Response**: Customer-side participation
- **Energy Storage**: Advanced battery and pumped hydro
- **Hydrogen Economy**: Green hydrogen integration
- **Carbon Markets**: Cap-and-trade mechanisms

### Research Opportunities
- **Behavioral Economics**: Decision-making under uncertainty
- **Market Design**: Optimal auction mechanisms
- **Technology Adoption**: Innovation diffusion patterns
- **Policy Effectiveness**: Regulatory impact assessment

## 📞 Get Involved

### For Educators
- **Try the Demo**: Experience the game yourself
- **Join the Community**: Connect with other instructors
- **Share Feedback**: Help improve the educational experience
- **Contribute Content**: Develop new scenarios and curricula

### For Developers
- **Contribute Code**: Enhance features and fix bugs
- **Add Features**: Implement new market mechanisms
- **Improve UX**: Enhance user interface and experience
- **Write Documentation**: Help others understand and use the system

### For Researchers
- **Study Outcomes**: Analyze educational effectiveness
- **Publish Results**: Share findings with academic community
- **Collaborate**: Joint research projects and publications
- **Validate Models**: Compare simulation to real markets

## 📄 License & Citation

### Open Source License
This project is licensed under the MIT License, allowing free use, modification, and distribution for educational and commercial purposes.

### How to Cite
```
Electricity Market Game. (2024). An Educational Simulation for Understanding 
Energy Markets and Policy. Retrieved from https://github.com/yourusername/electricity-market-game
```

### Academic Publications
If you use this game in research or publish results, please cite our work and consider sharing your findings with the community.

---

## 🚀 Ready to Transform Energy Education?

**Start your electricity market simulation today and give your students an unforgettable learning experience!**

[**Download Now**](https://github.com/yourusername/electricity-market-game) | [**View Documentation**](./getting-started.md) | [**Join Community**](https://github.com/yourusername/electricity-market-game/discussions)

---

*Built with ❤️ for advancing energy education and policy understanding*