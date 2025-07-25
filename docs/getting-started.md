# Getting Started Guide

Welcome to the Electricity Market Game! This guide will help you set up and run your first simulation session.

## 🎯 Overview

The Electricity Market Game is an educational simulation where students manage utility companies, make investment decisions, and compete in electricity markets over a 10-year period. It's designed to teach market dynamics, strategic planning, and energy policy impacts.

## 🔧 System Requirements

### Minimum Requirements
- **Operating System**: Windows 10, macOS 10.15, or Linux Ubuntu 18.04+
- **RAM**: 4GB (8GB recommended for multiple users)
- **Storage**: 2GB free space
- **Network**: Internet connection for setup, local network for gameplay
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

### Recommended Setup
- **RAM**: 8GB+ for smooth performance with 5+ users
- **CPU**: Multi-core processor for faster market calculations
- **Network**: Stable connection for real-time updates
- **Display**: 1920x1080 resolution for optimal interface experience

## 📦 Installation

### Option 1: Quick Setup (Recommended)

**Step 1: Download and Extract**
1. Download the latest release from [GitHub Releases](https://github.com/yourusername/electricity-market-game/releases)
2. Extract the ZIP file to your desired location
3. Open a terminal/command prompt in the extracted folder

**Step 2: Install Dependencies**
```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Install Node.js dependencies
cd ../frontend
npm install
```

**Step 3: Start the Game**
```bash
# Start backend (in backend folder)
python startup.py --dev

# Start frontend (in new terminal, in frontend folder)
npm run dev
```

**Step 4: Access the Game**
- Open your browser to http://localhost:3000
- You should see the role selection screen
- Choose "Instructor Mode" to set up a game

### Option 2: Development Setup

**Prerequisites**
- Git installed on your system
- Python 3.8+ with pip
- Node.js 18+ with npm

**Clone and Setup**
```bash
# Clone the repository
git clone https://github.com/yourusername/electricity-market-game.git
cd electricity-market-game

# Backend setup
cd backend
pip install fastapi uvicorn sqlalchemy pydantic
python startup.py --dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

## 🎮 First Game Session

### Quick Start with Sample Data

**For Instructors (5 minutes setup):**
1. Open http://localhost:3000
2. Click **"Instructor Mode"**
3. Go to **"Game Setup"**
4. Click **"Load Sample Data"**
5. Go to **"Market Control"**
6. Click **"Start Year Planning"**

**For Students:**
1. Open http://localhost:3000
2. Click **"Utility Mode"**
3. Select one of the available utilities
4. Explore your dashboard and portfolio

### Custom Game Setup

**Step 1: Create Game Session**
- Session name: "Energy Market Simulation [Date]"
- Simulation period: 2025-2035 (10 years)
- Number of utilities: 3-4 recommended
- Carbon price: $50/ton CO₂

**Step 2: Create Utilities**
- Name utilities after your students/teams
- Each starts with $2B budget
- Assign unique usernames

**Step 3: Assign Portfolios**
Choose from templates:
- **Balanced Traditional**: Coal, gas, nuclear mix
- **Renewable Energy Leader**: Solar, wind, storage focus
- **Natural Gas Specialist**: Flexible gas generation
- **Modern Diversified**: Balanced technology mix

**Step 4: Start the Simulation**
- Begin with year planning phase
- Guide students through first year
- Advance through all phases

## 🎓 Educational Framework

### Session Structure (3-4 hours total)

**Pre-Game (30 minutes)**
- Explain electricity markets basics
- Review game interface and controls
- Assign student roles and teams
- Set learning objectives

**Gameplay (2-3 hours)**
- **Year 1**: Guided walkthrough (45-60 minutes)
- **Years 2-4**: Strategy development (30-40 minutes each)
- **Years 5-7**: Advanced competition (25-35 minutes each)
- **Years 8-10**: Endgame optimization (20-30 minutes each)

**Post-Game (30-45 minutes)**
- Results analysis and discussion
- Strategy comparison
- Real-world connections
- Learning assessment

### Key Learning Moments

**Investment Decisions**
- Technology comparison and selection
- Financial analysis and ROI calculation
- Risk assessment and portfolio diversification
- Construction timing and market entry

**Market Bidding**
- Marginal cost calculation
- Competitive pricing strategy
- Load period optimization
- Revenue maximization

**Market Events**
- Adaptation to unexpected changes
- Risk management strategies
- Policy impact analysis
- Strategic flexibility

## 📊 Game Mechanics

### Load Periods Explained
Instead of modeling all 8760 hours, the game uses 3 simplified periods:

**Off-Peak (5,000 hours/year)**
- **When**: Nights (11 PM - 7 AM), weekends
- **Demand**: Low (1,200 MW average)
- **Pricing**: Typically lowest prices
- **Strategy**: Baseload plants, low-cost generation

**Shoulder (2,500 hours/year)**
- **When**: Daytime non-peak (7 AM - 5 PM weekdays)
- **Demand**: Medium (1,800 MW average)
- **Pricing**: Moderate prices
- **Strategy**: Mix of baseload and flexible plants

**Peak (1,260 hours/year)**
- **When**: Evening high-demand (5 PM - 11 PM weekdays)
- **Demand**: High (2,400 MW average)
- **Pricing**: Highest prices, premium opportunities
- **Strategy**: All available capacity, peaking plants

### Financial Model

**Starting Conditions**
- $1.5-2.0B initial budget per utility
- Existing portfolio of 3-5 operating plants
- Realistic debt-to-equity ratios

**Investment Financing**
- 70% debt financing (typical utility structure)
- 30% equity requirement from budget
- Credit rating affects borrowing costs
- Debt-to-equity ratio impacts investment capacity

**Revenue Calculation**
```
Annual Revenue = Σ(Capacity × Hours × Clearing Price × Capacity Factor)
Annual Costs = Fixed O&M + Variable O&M + Fuel Costs + Carbon Costs
Annual Profit = Revenue - Costs - Debt Service
```

### Market Clearing Process
1. **Merit Order**: Bids sorted by price (lowest first)
2. **Demand Matching**: Accept bids until demand is met
3. **Marginal Pricing**: All accepted bids receive clearing price
4. **Revenue Distribution**: Calculate payments to utilities

## 🎯 Teaching Strategies

### For Different Skill Levels

**Beginners (First-time players)**
- Use guided walkthrough for first 2 years
- Focus on basic concepts and interface
- Provide templates and examples
- Emphasize learning over winning

**Intermediate (Some energy background)**
- Allow more independent decision-making
- Introduce moderate market events
- Encourage strategic analysis
- Compare different approaches

**Advanced (Energy professionals)**
- Minimal guidance, maximum competition
- Complex market events and scenarios
- Advanced financial analysis
- Real-world case study connections

### Facilitation Tips

**During Setup**
- Test the system 24 hours before class
- Prepare backup plans for technical issues
- Set clear expectations about time commitment
- Explain educational objectives upfront

**During Gameplay**
- Monitor all students for engagement
- Ask probing questions about decisions
- Pause for discussion after major events
- Document interesting moments for debrief

**During Debrief**
- Compare strategies and outcomes
- Connect to real-world examples
- Discuss policy implications
- Assess learning objectives achievement

## 🔍 Troubleshooting

### Common Issues

**"Portfolio templates not loading"**
- Ensure backend server is running on port 8000
- Check browser console for API errors
- Try refreshing the page
- Restart backend server if needed

**"Cannot connect to game session"**
- Verify game session was created successfully
- Check that all users are on the same network
- Clear browser cache and localStorage
- Restart both backend and frontend

**"Bidding interface not working"**
- Ensure game state is "bidding_open"
- Check that plants are in "operating" status
- Verify bid prices are greater than zero
- Confirm plant capacity is available

**"Market clearing fails"**
- Ensure at least one utility submitted bids
- Check that bid quantities are positive
- Verify sufficient capacity to meet demand
- Review error messages in instructor dashboard

### Performance Issues

**Slow response times**
- Close unnecessary browser tabs
- Restart backend server
- Check system resource usage
- Reduce number of concurrent users

**Interface problems**
- Use Chrome or Firefox for best compatibility
- Ensure screen resolution is 1920x1080 or higher
- Disable browser extensions that might interfere
- Clear browser cache and cookies

### Getting Help

**Self-Service Resources**
- Check the troubleshooting section in README.md
- Review API documentation for technical details
- Search GitHub issues for similar problems
- Consult the instructor manual for gameplay questions

**Community Support**
- Post questions in GitHub Discussions
- Join the educational forum
- Connect with other instructors
- Share experiences and solutions

**Professional Support**
- Contact development team for critical issues
- Request custom features or modifications
- Schedule training sessions for your institution
- Arrange consulting for large deployments

## 📈 Success Metrics

### Student Engagement
- **Participation Rate**: 95%+ active engagement
- **Decision Quality**: Improved strategic thinking
- **Learning Retention**: Concepts remembered weeks later
- **Course Satisfaction**: Higher ratings vs. traditional methods

### Educational Outcomes
- **Market Understanding**: Grasp of electricity market mechanics
- **Strategic Thinking**: Long-term planning under uncertainty
- **Financial Analysis**: Investment evaluation skills
- **Policy Awareness**: Understanding of regulatory impacts

### Instructor Benefits
- **Teaching Efficiency**: Cover complex topics quickly
- **Student Motivation**: High engagement and interest
- **Assessment Tools**: Rich data for evaluation
- **Curriculum Enhancement**: Complement existing courses

## 🌟 Best Practices

### Preparation
- **Practice First**: Run through the game yourself
- **Set Expectations**: Explain time commitment and objectives
- **Prepare Materials**: Have backup plans and handouts ready
- **Test Technology**: Verify everything works beforehand

### During the Game
- **Stay Engaged**: Monitor all students actively
- **Be Flexible**: Adjust timing based on student needs
- **Encourage Discussion**: Foster learning conversations
- **Document Moments**: Note interesting decisions and outcomes

### Follow-Up
- **Debrief Thoroughly**: Discuss results while fresh
- **Connect to Reality**: Use current energy news and examples
- **Assess Learning**: Use multiple evaluation methods
- **Gather Feedback**: Improve for next time

### Continuous Improvement
- **Track What Works**: Note successful strategies and timing
- **Adapt Content**: Update scenarios based on current events
- **Share Experiences**: Contribute to the community
- **Stay Current**: Follow energy industry developments

## 🎉 Ready to Start?

You're now ready to run your first electricity market simulation! Remember:

1. **Start Simple**: Use sample data for your first session
2. **Focus on Learning**: Emphasize education over competition
3. **Be Patient**: Students need time to understand the complexity
4. **Have Fun**: Enjoy the competitive dynamics and strategic challenges

**Questions?** Check our [FAQ](./faq.md) or join the [community discussions](https://github.com/yourusername/electricity-market-game/discussions).

**Ready to dive deeper?** Explore the [Instructor Manual](./instructor-manual.md) for advanced facilitation techniques.

---

*Transform your energy education with hands-on market simulation!*