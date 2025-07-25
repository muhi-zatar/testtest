# Game Setup Guide

This guide walks instructors through setting up and running an electricity market simulation session.

## 🎯 Pre-Game Preparation

### 1. Technical Setup (5 minutes)
1. **Start the backend server**:
   ```bash
   cd backend
   python startup.py --dev
   ```
   - Wait for "Sample data created successfully" message
   - Server runs on http://localhost:8000

2. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   - App opens on http://localhost:3000
   - Verify both instructor and utility modes work

3. **Test the connection**:
   - Visit http://localhost:3000
   - You should see the role selection screen
   - Try both instructor and utility modes briefly

### 2. Game Configuration (10 minutes)

#### Option A: Use Sample Data (Recommended for First Time)
1. Go to **Instructor Mode** → **Game Setup**
2. Click **"Load Sample Data"** button
3. This creates:
   - 3 utilities with different portfolios
   - 10-year simulation (2025-2035)
   - Realistic plant mix and budgets
4. Skip to "Starting the Game" section

#### Option B: Custom Setup
1. **Step 1: Session Configuration**
   - Session name: "Energy Market Simulation [Date]"
   - Number of utilities: 3-4 (recommended)
   - Start year: 2025
   - End year: 2035 (10-year simulation)
   - Carbon price: $50/ton CO₂

2. **Step 2: Create Utilities**
   - Name utilities after teams/students
   - Each gets $2B starting budget
   - Click "Create Utilities"

3. **Step 3: Assign Portfolios**
   - **Balanced Traditional**: Good for beginners
   - **Renewable Energy Leader**: For sustainability focus
   - **Natural Gas Specialist**: For flexibility strategy
   - **Modern Diversified**: For balanced approach
   - Assign different portfolios for variety

4. **Step 4: Start Game**
   - Review setup summary
   - Click "Start Game!"

## 🎮 Running a Game Session

### Phase 1: Year Planning (10-15 minutes)
**Instructor Actions:**
1. Click **"Start Year Planning"** in Market Control
2. Announce to students: "Year planning is open"
3. Students should:
   - Review their dashboard
   - Analyze market conditions
   - Plan potential investments
   - Study competitor portfolios

**Student Activities:**
- **Dashboard**: Review portfolio performance
- **Portfolio**: Analyze plant efficiency and costs
- **Investment**: Evaluate new plant opportunities
- **Market Analysis**: Study fuel prices and trends

### Phase 2: Investment Decisions (15-20 minutes)
**Instructor Actions:**
1. Allow students to make investment decisions
2. Monitor investment activity in Analytics
3. Answer questions about plant economics

**Student Activities:**
- **Investment Center**: 
  - Select plant technologies
  - Analyze ROI projections
  - Consider construction lead times
  - Make investment decisions
- **Portfolio**: Review updated portfolio

### Phase 3: Annual Bidding (15-20 minutes)
**Instructor Actions:**
1. Click **"Open Bidding"** in Market Control
2. Announce: "Bidding is now open for all load periods"
3. Monitor bid submissions
4. Remind students of deadline

**Student Activities:**
- **Bidding Page**:
  - Calculate marginal costs for each plant
  - Submit bids for off-peak, shoulder, and peak periods
  - Use pricing calculator for guidance
  - Consider competitive strategy

**Bidding Strategy Tips for Students:**
- Price above marginal cost for profit
- Peak periods typically command higher prices
- Consider fuel costs and carbon pricing
- Balance competitiveness with profitability

### Phase 4: Market Clearing (2-3 minutes)
**Instructor Actions:**
1. Verify all utilities have submitted bids
2. Click **"Clear Markets"** in Market Control
3. Results appear automatically

**What Happens:**
- Markets clear by merit order (lowest price first)
- Clearing prices determined by marginal plant
- Revenues calculated for each utility
- Results visible in dashboards

### Phase 5: Results Analysis (10-15 minutes)
**Instructor Actions:**
1. Click **"Complete Year"** in Market Control
2. Facilitate discussion of results
3. Highlight key learning points

**Student Activities:**
- **Dashboard**: Review financial performance
- **Market Analysis**: Study clearing prices and trends
- **Portfolio**: Analyze plant performance
- Plan strategy for next year

### Phase 6: Advance to Next Year (2 minutes)
**Instructor Actions:**
1. Click **"Advance to [Next Year]"**
2. Repeat cycle for remaining years

## 🎲 Advanced Features

### Market Events
Trigger realistic market events to create learning opportunities:

**Fuel Price Shocks**
- Natural gas supply disruption (+40% prices)
- Impact: Higher costs for gas plants, margin compression
- Learning: Fuel hedging strategies, portfolio diversification

**Weather Events**
- Solar drought (cloudy conditions, -40% solar output)
- Impact: Reduced renewable generation, higher thermal dispatch
- Learning: Renewable intermittency, backup capacity needs

**Plant Outages**
- Major plant failure (15% capacity reduction)
- Impact: Supply shortage, price spikes
- Learning: Reserve margins, grid reliability

**Regulatory Changes**
- Carbon price increase to $100/ton
- Impact: Higher costs for fossil plants, renewable advantage
- Learning: Policy risk, clean energy transition

### Event Timing Recommendations
- **Year 2-3**: Moderate fuel price shock
- **Year 4-5**: Weather event affecting renewables
- **Year 6-7**: Major plant outage
- **Year 8-9**: Regulatory change (carbon price)
- **Year 10**: Demand surge (final challenge)

## 📊 Assessment & Learning Outcomes

### Key Performance Indicators
**Financial Performance:**
- Total return on investment (ROI)
- Debt-to-equity ratio management
- Annual profit margins
- Portfolio value growth

**Strategic Performance:**
- Technology diversification
- Market share in different periods
- Adaptation to market events
- Long-term planning effectiveness

### Discussion Questions
1. **Investment Strategy**: Why did you choose certain technologies?
2. **Market Dynamics**: How did fuel prices affect your bidding?
3. **Risk Management**: How did you respond to market events?
4. **Competition**: What strategies did competitors use?
5. **Policy Impact**: How did carbon pricing influence decisions?

### Learning Assessment Rubric

**Excellent (A)**
- Diversified portfolio with strategic technology mix
- Consistent profitability across multiple years
- Effective response to market events
- Strong financial management (D/E < 1.5)
- Competitive bidding strategy

**Good (B)**
- Reasonable portfolio diversification
- Generally profitable operations
- Some adaptation to market changes
- Acceptable financial health (D/E < 2.0)
- Basic understanding of bidding strategy

**Satisfactory (C)**
- Limited portfolio optimization
- Break-even or modest profits
- Minimal response to market events
- Financial stress indicators (D/E > 2.0)
- Simple bidding approach

## 🔧 Customization Options

### Scenario Modifications
**Accelerated Renewable Transition**
- Higher carbon prices ($100-150/ton)
- Declining renewable costs over time
- Renewable portfolio standards

**Fuel Price Volatility**
- High natural gas price swings
- Coal phase-out policies
- Uranium supply constraints

**Grid Modernization**
- Battery storage incentives
- Demand response programs
- Smart grid investments

### Advanced Configurations
**Market Design Changes**
- Capacity markets in addition to energy
- Ancillary services (frequency regulation)
- Transmission constraints

**Financial Complexity**
- Interest rate variations
- Inflation adjustments
- Tax policy changes

## 🎓 Pedagogical Notes

### Learning Objectives Alignment
**Undergraduate Level:**
- Basic market economics
- Technology comparison
- Simple financial analysis
- Policy impact awareness

**Graduate Level:**
- Advanced portfolio optimization
- Risk management strategies
- Market design implications
- Regulatory economics

**Professional Development:**
- Real-world utility challenges
- Investment decision frameworks
- Stakeholder management
- Strategic planning processes

### Facilitation Best Practices
1. **Set clear expectations** about time commitment (2-3 hours)
2. **Explain the educational purpose** of each phase
3. **Encourage collaboration** and discussion
4. **Use events strategically** to create teachable moments
5. **Debrief thoroughly** after each major event or year
6. **Connect to real-world examples** and current events

### Common Student Challenges
**"My plants aren't profitable"**
- Check bidding strategy (pricing above marginal cost)
- Review capacity factors and utilization
- Consider portfolio optimization

**"I can't afford new investments"**
- Analyze debt-to-equity ratio
- Consider smaller capacity additions
- Review existing plant performance

**"Market prices are too volatile"**
- Explain merit order dispatch
- Discuss supply-demand balance
- Show impact of fuel costs and carbon pricing

## 📞 Support & Resources

### Getting Help
- **Technical Issues**: Check the troubleshooting section in README.md
- **Gameplay Questions**: Refer to this guide and in-game help
- **Educational Support**: Contact the development team

### Additional Resources
- **EIA Electricity Data**: Real-world market information
- **FERC Market Reports**: Actual market outcomes
- **Academic Papers**: Electricity market research
- **Policy Documents**: Regulatory frameworks

### Community
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Share experiences and best practices
- **Educational Forum**: Connect with other instructors

---

**Ready to run your first electricity market simulation? Follow this guide step-by-step for a successful educational experience!**