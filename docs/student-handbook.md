# Student Handbook

Your complete guide to succeeding in the Electricity Market Game.

## 🎯 Welcome to the Energy Industry!

Congratulations! You've been appointed as the CEO of a major utility company. Over the next 10 years (2025-2035), you'll make strategic decisions that will determine your company's success in the competitive electricity market.

### Your Mission
- **Maximize shareholder value** through profitable operations
- **Maintain reliable electricity supply** for customers  
- **Adapt to changing market conditions** and regulations
- **Build a sustainable portfolio** for the future
- **Outperform your competitors** in this dynamic market

### What Makes This Realistic
- **Authentic Economics**: Real plant costs and performance data
- **Actual Market Mechanics**: Merit order dispatch and marginal pricing
- **Realistic Budgets**: Multi-billion dollar utility-scale decisions
- **Real Policy Challenges**: Carbon pricing and renewable integration
- **Competitive Dynamics**: Strategic interaction with other utilities

## 🏢 Understanding Your Company

### Starting Position
When you begin, your utility company has:
- **$1.5-2.0 billion budget** for new investments
- **Existing portfolio** of 3-5 operating power plants
- **Established market position** with existing customers
- **Credit rating** that affects your borrowing costs
- **Competitive position** relative to other utilities

### Key Financial Metrics

**Budget & Cash Flow**
- **Available Budget**: Cash available for new investments
- **Annual Revenue**: Income from electricity sales
- **Annual Costs**: Fixed operations, maintenance, fuel, and debt service
- **Net Profit**: Revenue minus all costs

**Balance Sheet Health**
- **Total Assets**: Cash + plant investments
- **Total Debt**: Money borrowed for plant construction
- **Equity**: Your ownership stake in the company
- **Debt-to-Equity Ratio**: Key measure of financial health

**Credit Rating Scale**
- **AAA (D/E < 1.0)**: Excellent credit, lowest borrowing costs
- **AA (D/E < 1.5)**: Good credit, reasonable borrowing costs  
- **A (D/E < 2.0)**: Acceptable credit, higher borrowing costs
- **BBB (D/E > 2.0)**: Poor credit, limited investment capacity

## ⚡ Electricity Market Basics

### How Electricity Markets Work

**Merit Order Dispatch**
1. All plants bid their minimum acceptable price
2. Bids are sorted from lowest to highest price
3. Cheapest plants are selected first until demand is met
4. The last (most expensive) plant needed sets the market price
5. All selected plants receive this "clearing price"

**Load Periods (Simplified)**
Instead of 8760 hours per year, the game uses 3 periods:

**Off-Peak (5,000 hours/year)**
- **When**: Nights (11 PM - 7 AM) and weekends
- **Demand**: Low (1,200 MW average)
- **Characteristics**: Lowest prices, baseload plants run
- **Strategy**: Focus on low-cost, efficient generation

**Shoulder (2,500 hours/year)**  
- **When**: Daytime non-peak (7 AM - 5 PM weekdays)
- **Demand**: Medium (1,800 MW average)
- **Characteristics**: Moderate prices, mix of plants
- **Strategy**: Balance efficiency with flexibility

**Peak (1,260 hours/year)**
- **When**: Evening high-demand (5 PM - 11 PM weekdays)
- **Demand**: High (2,400 MW average)  
- **Characteristics**: Highest prices, all plants may run
- **Strategy**: Maximize capacity availability

### Revenue Calculation
```
Annual Revenue = Σ(Capacity × Hours × Clearing Price × Capacity Factor)

Where:
- Capacity = Your plant's maximum output (MW)
- Hours = Hours in each period (5000, 2500, 1260)
- Clearing Price = Market price for that period ($/MWh)
- Capacity Factor = How often your plant actually runs (0-1)
```

## 🏭 Power Plant Technologies

### Baseload Plants (Run Continuously)

**Coal Plants**
- **Capital Cost**: $4,500/kW (expensive to build)
- **Operating Cost**: Low fuel cost, high emissions
- **Best Use**: Continuous operation, low-cost electricity
- **Considerations**: High CO₂ emissions, carbon pricing impact
- **Strategy**: Good for off-peak and shoulder periods

**Nuclear Plants**
- **Capital Cost**: $8,500/kW (very expensive to build)
- **Operating Cost**: Very low, no emissions
- **Best Use**: Continuous baseload operation
- **Considerations**: Long construction time (7 years), high upfront cost
- **Strategy**: Excellent long-term investment if you can afford it

**Natural Gas Combined Cycle**
- **Capital Cost**: $1,200/kW (moderate)
- **Operating Cost**: Moderate, depends on gas prices
- **Best Use**: Flexible baseload and intermediate operation
- **Considerations**: Fuel price volatility, moderate emissions
- **Strategy**: Good balance of cost and flexibility

### Peaking Plants (Run During High Demand)

**Natural Gas Combustion Turbine**
- **Capital Cost**: $800/kW (relatively cheap)
- **Operating Cost**: High fuel cost, quick start
- **Best Use**: Peak periods only (1,260 hours/year)
- **Considerations**: Low capacity factor, high fuel costs
- **Strategy**: Essential for peak period revenue

**Battery Storage**
- **Capital Cost**: $1,500/kW (moderate, declining)
- **Operating Cost**: Very low, no fuel needed
- **Best Use**: Peak periods, grid services
- **Considerations**: Limited duration, can charge and discharge
- **Strategy**: Valuable for peak pricing, future technology

### Renewable Plants (Weather Dependent)

**Solar PV**
- **Capital Cost**: $1,400/kW (moderate, declining)
- **Operating Cost**: Very low, no fuel
- **Best Use**: Daytime generation, especially shoulder periods
- **Considerations**: Weather dependent, no generation at night
- **Strategy**: Good for daytime periods, pair with storage

**Onshore Wind**
- **Capital Cost**: $1,650/kW (moderate)
- **Operating Cost**: Very low, no fuel
- **Best Use**: Variable generation across all periods
- **Considerations**: Weather dependent, intermittent
- **Strategy**: Diversifies portfolio, hedge against fuel costs

**Offshore Wind**
- **Capital Cost**: $4,200/kW (expensive)
- **Operating Cost**: Low, higher capacity factor than onshore
- **Best Use**: More consistent generation than onshore
- **Considerations**: High upfront cost, better performance
- **Strategy**: Premium renewable option for large utilities

## 💡 Strategic Decision-Making

### Investment Strategy Framework

**Step 1: Assess Current Portfolio**
- What technologies do you currently have?
- What are your capacity factors and costs?
- Where are the gaps in your portfolio?
- What plants might need replacement soon?

**Step 2: Analyze Market Conditions**
- What are current and projected fuel prices?
- How is renewable availability trending?
- What is the carbon price trajectory?
- What are competitors likely to do?

**Step 3: Evaluate Technology Options**
- Use the ROI calculator for each technology
- Consider construction lead times
- Assess financing requirements and impact
- Evaluate risk factors and uncertainties

**Step 4: Make Strategic Choices**
- Balance risk and return across portfolio
- Consider timing of market entry
- Plan for multiple future scenarios
- Maintain financial flexibility

### Bidding Strategy Guide

**Calculate Marginal Cost for Each Plant:**
1. **Variable O&M**: Direct operating costs ($/MWh)
2. **Fuel Cost**: (Heat Rate × Fuel Price) ÷ 1000 ($/MWh)
3. **Carbon Cost**: Emissions Rate × Carbon Price ($/MWh)
4. **Total Marginal Cost**: Sum of above components

**Set Bid Prices:**
- **Minimum**: Marginal cost (break-even point)
- **Target**: Marginal cost + 10-30% markup for profit
- **Maximum**: Consider competitive dynamics

**Period-Specific Strategy:**
- **Off-Peak**: Conservative pricing, focus on baseload plants
- **Shoulder**: Moderate pricing, include flexible plants  
- **Peak**: Aggressive pricing, bid all available capacity

### Portfolio Optimization

**Diversification Benefits:**
- **Technology Mix**: Reduce dependence on single technology
- **Fuel Diversity**: Hedge against fuel price volatility
- **Timing Spread**: Stagger construction to manage risk
- **Market Segments**: Serve different load periods effectively

**Risk Management:**
- **Financial Risk**: Maintain healthy debt-to-equity ratios
- **Technology Risk**: Avoid concentration in unproven technologies
- **Market Risk**: Diversify across different market segments
- **Regulatory Risk**: Prepare for policy changes

## 📊 Performance Tracking

### Key Performance Indicators

**Financial Performance:**
- **Return on Investment (ROI)**: Total profit ÷ total investment
- **Profit Margin**: Net profit ÷ total revenue
- **Revenue Growth**: Year-over-year revenue increase
- **Cost Management**: Fixed costs ÷ total capacity

**Operational Performance:**
- **Capacity Factor**: Actual generation ÷ maximum possible
- **Market Share**: Your generation ÷ total market generation
- **Plant Utilization**: How efficiently you use your assets
- **Portfolio Diversity**: Technology mix balance

**Strategic Performance:**
- **Competitive Position**: Ranking vs. other utilities
- **Adaptation Quality**: Response to market events
- **Investment Timing**: Market entry and technology choices
- **Long-term Planning**: Strategic vision and execution

### Benchmarking Against Competitors

**Revenue Metrics:**
- Revenue per MW of capacity
- Revenue per dollar invested
- Market share in each load period
- Revenue growth rate

**Efficiency Metrics:**
- Operating cost per MWh generated
- Fixed cost per MW of capacity
- Debt service coverage ratio
- Return on assets

**Strategic Metrics:**
- Portfolio diversification index
- Technology adoption timing
- Market event response effectiveness
- Long-term planning quality

## 🎯 Winning Strategies

### Early Game (Years 1-3): Foundation Building

**Investment Focus:**
- **Quick Wins**: Fast-construction technologies (gas, solar, wind)
- **Cash Flow**: Investments that generate revenue quickly
- **Market Position**: Build competitive capacity in key segments
- **Financial Health**: Maintain strong credit rating

**Common Strategies:**
- **Natural Gas Strategy**: Build flexible gas plants for reliable cash flow
- **Renewable Rush**: Invest heavily in solar and wind for future advantage
- **Balanced Approach**: Mix of technologies for diversified risk
- **Acquisition Focus**: Optimize existing plants before expanding

### Mid-Game (Years 4-7): Strategic Positioning

**Investment Focus:**
- **Long-term Assets**: Consider nuclear or offshore wind
- **Market Gaps**: Identify underserved market segments
- **Technology Trends**: Invest in declining-cost technologies
- **Competitive Response**: React to competitor strategies

**Advanced Strategies:**
- **Technology Leadership**: First-mover advantage in new technologies
- **Market Specialization**: Dominate specific load periods
- **Financial Engineering**: Optimize debt structure and timing
- **Strategic Partnerships**: Consider joint ventures (simulated)

### End Game (Years 8-10): Optimization

**Investment Focus:**
- **Portfolio Completion**: Fill remaining gaps
- **High-Return Projects**: Focus on best ROI opportunities
- **Legacy Planning**: Prepare for post-simulation period
- **Competitive Advantage**: Solidify market position

**Winning Tactics:**
- **Operational Excellence**: Maximize capacity factors
- **Market Timing**: Strategic bidding for maximum revenue
- **Cost Management**: Optimize operating expenses
- **Strategic Flexibility**: Adapt quickly to final challenges

## 🚨 Common Mistakes to Avoid

### Financial Mistakes
- **Over-leveraging**: Debt-to-equity ratio > 2.0 limits future investments
- **Cash Flow Neglect**: Not maintaining adequate reserves for opportunities
- **Poor Timing**: Building capacity when demand is declining
- **Ignoring Fixed Costs**: Focusing only on capital costs, not ongoing expenses

### Strategic Mistakes
- **Technology Concentration**: Putting all investments in one technology
- **Market Myopia**: Optimizing for one year instead of long-term
- **Competitive Blindness**: Not monitoring competitor strategies
- **Event Unpreparedness**: Not planning for market shocks

### Operational Mistakes
- **Pricing Errors**: Bidding too high (no sales) or too low (no profit)
- **Capacity Mismanagement**: Not bidding full available capacity
- **Maintenance Neglect**: Ignoring plant maintenance schedules
- **Market Misunderstanding**: Not grasping merit order dispatch

## 🎓 Learning Objectives

### Market Economics Understanding
- **Price Formation**: How electricity prices are determined
- **Supply and Demand**: Market fundamentals and dynamics
- **Competition**: Strategic interaction in oligopolistic markets
- **Regulation**: Impact of policies on market outcomes

### Investment Analysis Skills
- **Capital Budgeting**: Evaluating long-term investments
- **Risk Assessment**: Technology, market, and financial risks
- **Portfolio Theory**: Diversification and optimization
- **Financial Modeling**: ROI, NPV, and payback analysis

### Strategic Planning Capabilities
- **Long-term Thinking**: Planning under uncertainty
- **Competitive Strategy**: Positioning vs. rivals
- **Adaptation**: Responding to changing conditions
- **Decision-Making**: Balancing multiple objectives

### Policy and Technology Awareness
- **Energy Transition**: Clean energy adoption challenges
- **Environmental Policy**: Carbon pricing and regulations
- **Technology Trends**: Innovation and cost evolution
- **Grid Integration**: Renewable energy challenges

## 💪 Advanced Techniques

### Financial Optimization

**Debt Management:**
- Monitor debt-to-equity ratio carefully
- Time debt issuance with investment needs
- Maintain borrowing capacity for opportunities
- Consider refinancing when rates are favorable

**Cash Flow Management:**
- Maintain adequate reserves for unexpected opportunities
- Time investments to optimize cash flow
- Consider phased construction for large projects
- Balance growth with financial stability

**Investment Timing:**
- Build capacity 2-3 years before peak demand
- Consider construction lead times in planning
- Time market entry to avoid oversupply
- Coordinate with competitor investment cycles

### Market Strategy

**Competitive Intelligence:**
- Monitor competitor investment patterns
- Analyze their bidding behavior and pricing
- Identify their portfolio strengths and weaknesses
- Anticipate their likely strategic responses

**Market Positioning:**
- **Cost Leadership**: Focus on lowest-cost generation
- **Technology Leadership**: Invest in advanced technologies
- **Market Specialization**: Dominate specific load periods
- **Flexibility Provider**: Emphasize fast-ramping capacity

**Pricing Strategy:**
- **Aggressive Pricing**: Lower prices to gain market share
- **Premium Pricing**: Higher prices for superior technology
- **Dynamic Pricing**: Adjust based on market conditions
- **Strategic Pricing**: Price to influence competitor behavior

### Risk Management

**Portfolio Diversification:**
- **Technology Diversification**: Multiple generation types
- **Fuel Diversification**: Reduce dependence on single fuel
- **Timing Diversification**: Stagger construction schedules
- **Market Diversification**: Serve all load periods

**Scenario Planning:**
- **Base Case**: Most likely future scenario
- **Optimistic Case**: Favorable market conditions
- **Pessimistic Case**: Challenging market environment
- **Stress Test**: Extreme adverse conditions

## 🏆 Path to Victory

### Winning Metrics
The game typically evaluates success based on:
1. **Total Return on Investment** (40%): Overall profitability
2. **Financial Health** (25%): Credit rating and balance sheet strength
3. **Strategic Adaptation** (20%): Response to market events
4. **Competitive Position** (15%): Market share and positioning

### Excellence Indicators

**Financial Excellence:**
- Consistent profitability across all years
- Maintained AAA or AA credit rating
- Strong cash flow generation
- Efficient capital allocation

**Strategic Excellence:**
- Well-diversified technology portfolio
- Effective adaptation to market events
- Superior competitive positioning
- Long-term value creation

**Operational Excellence:**
- High capacity factors across portfolio
- Competitive bidding strategy
- Effective cost management
- Optimal plant utilization

## 🎯 Year-by-Year Success Guide

### Years 1-2: Learning and Foundation
**Focus**: Understand the game mechanics and build foundation
- Learn the interface and analytical tools
- Make conservative, well-analyzed investments
- Develop bidding strategy and pricing approach
- Build financial reserves and maintain credit rating

### Years 3-4: Strategy Development  
**Focus**: Develop your unique competitive strategy
- Identify your strategic positioning (cost leader, tech leader, etc.)
- Make larger, more strategic investments
- Respond effectively to first market events
- Begin to differentiate from competitors

### Years 5-6: Strategic Execution
**Focus**: Execute your strategy and adapt to competition
- Make major portfolio investments based on your strategy
- Respond to competitor moves and market changes
- Optimize operations and bidding for maximum revenue
- Maintain financial discipline while growing

### Years 7-8: Competitive Advantage
**Focus**: Build sustainable competitive advantages
- Complete your strategic portfolio transformation
- Optimize for changing market conditions
- Exploit competitor weaknesses
- Prepare for end-game scenarios

### Years 9-10: Optimization and Legacy
**Focus**: Optimize performance and secure long-term position
- Fine-tune operations for maximum efficiency
- Make final strategic investments
- Position for post-simulation success
- Demonstrate strategic vision achievement

## 📚 Study Resources

### Essential Concepts to Master
- **Merit order dispatch** and marginal pricing
- **Capacity factor** and plant utilization
- **Levelized cost of electricity (LCOE)**
- **Net present value (NPV)** and return on investment
- **Portfolio theory** and diversification benefits

### Recommended Background Reading
- EIA Annual Energy Outlook (current year)
- "Economics of Power Generation" textbook chapters
- Recent utility company annual reports
- Energy policy white papers and analyses

### Real-World Examples to Study
- **Successful Utilities**: NextEra Energy, Berkshire Hathaway Energy
- **Technology Transitions**: German Energiewende, Texas wind boom
- **Market Events**: Texas freeze 2021, California energy crisis
- **Policy Impacts**: EU Emissions Trading System, US Clean Power Plan

## 🤝 Collaboration and Learning

### Peer Learning Opportunities
- **Strategy Discussions**: Share approaches and learn from others
- **Technical Questions**: Help each other understand complex concepts
- **Market Analysis**: Collaborate on understanding market trends
- **Post-Game Analysis**: Compare strategies and outcomes

### Instructor Interaction
- **Ask Questions**: Clarify rules, concepts, and strategies
- **Seek Guidance**: Get help with complex decisions
- **Share Insights**: Contribute to class discussions
- **Request Feedback**: Understand your performance and improvement areas

### Professional Development
- **Industry Connections**: Network with energy professionals
- **Career Exploration**: Learn about energy industry careers
- **Skill Development**: Build analytical and strategic thinking skills
- **Real-World Application**: Apply concepts to current energy issues

## 🎉 Making the Most of Your Experience

### Engagement Tips
1. **Stay Active**: Participate fully in all phases
2. **Think Strategically**: Consider long-term implications
3. **Learn from Mistakes**: Analyze what went wrong and why
4. **Collaborate**: Learn from and teach other students
5. **Connect to Reality**: Relate game experiences to real world

### Success Mindset
1. **Embrace Complexity**: Energy markets are inherently complex
2. **Think Long-term**: 10-year perspective is crucial
3. **Stay Flexible**: Adapt to changing conditions
4. **Learn Continuously**: Every decision is a learning opportunity
5. **Enjoy the Challenge**: Have fun with the competitive dynamics

### Beyond the Game
1. **Career Exploration**: Consider energy industry opportunities
2. **Continued Learning**: Follow energy news and developments
3. **Policy Engagement**: Understand energy policy debates
4. **Technology Awareness**: Track clean energy innovations
5. **Professional Network**: Connect with classmates and instructors

---

**Ready to lead your utility to success? The electricity market awaits your strategic vision!** ⚡💼🏆

*Remember: The goal isn't just to win the game, but to deeply understand how electricity markets work and develop strategic thinking skills that will serve you throughout your career.*