# Frequently Asked Questions

Common questions and answers about the Electricity Market Game.

## 🎯 General Questions

### What is the Electricity Market Game?
The Electricity Market Game is an educational simulation where students manage utility companies over a 10-year period. Players make strategic investment decisions, bid in electricity markets, and compete against other utilities while learning about energy economics, policy, and strategic planning.

### Who is this game designed for?
- **University students** in energy economics, public policy, business strategy, and environmental studies courses
- **Professional training** for utility companies, energy consultants, and policy makers
- **Executive education** in MBA programs and leadership development
- **Researchers** studying decision-making and market design

### How long does a game session take?
- **Quick Demo**: 30-45 minutes (2-3 simulation years)
- **Standard Session**: 3-4 hours (complete 10-year simulation)
- **Extended Format**: Multiple 1-2 hour sessions over several weeks
- **Semester Integration**: 15-20 minutes weekly throughout a course

### How many players can participate?
- **Minimum**: 2 utilities (can be individuals or teams)
- **Optimal**: 3-4 utilities for good competition
- **Maximum**: 8 utilities per game session
- **Classroom Size**: 20-30 students (working in teams of 3-5)

## 🎮 Gameplay Questions

### How realistic is the simulation?
The game uses authentic data and principles:
- **Plant costs** from EIA and NREL databases
- **Market mechanics** based on real electricity markets
- **Financial modeling** reflects actual utility practices
- **Policy scenarios** mirror real regulatory environments
- **Technology data** from industry sources and academic research

### Why only 3 load periods instead of 8760 hours?
The simplified structure focuses on strategic decision-making rather than operational complexity:
- **Educational Focus**: Emphasizes long-term planning over short-term operations
- **Time Management**: Allows completion in classroom timeframes
- **Concept Clarity**: Makes market dynamics easier to understand
- **Strategic Emphasis**: Highlights capacity planning and investment decisions

### How are electricity prices determined?
The game uses **merit order dispatch** and **marginal pricing**:
1. All plants bid their minimum acceptable price
2. Bids are sorted from lowest to highest cost
3. Cheapest plants are selected first until demand is met
4. The last (most expensive) plant needed sets the market price
5. All selected plants receive this "clearing price"

### What happens if I make bad decisions?
- **Learning Opportunity**: Mistakes are valuable for understanding market dynamics
- **Recovery Possible**: You can adapt strategy in subsequent years
- **Competitive Impact**: Poor decisions may hurt your ranking but enhance learning
- **Real Consequences**: Financial stress limits future investment options
- **Educational Value**: Failure teaches risk management and strategic thinking

## 🏭 Technology Questions

### Which power plant technology is best?
There's no single "best" technology - each serves different purposes:
- **Coal**: Low operating cost but high emissions and carbon costs
- **Natural Gas**: Flexible and moderate cost but fuel price risk
- **Nuclear**: Very reliable and clean but expensive and slow to build
- **Solar/Wind**: Clean and increasingly cheap but weather dependent
- **Battery**: Valuable for peak periods but limited duration
- **Strategy**: Diversification across technologies reduces risk

### How do I calculate return on investment (ROI)?
The game provides ROI calculators, but the basic formula is:
```
Annual Cash Flow = Revenue - Operating Costs - Debt Service
ROI = (Total Cash Flows over Plant Life) / Initial Investment
Payback Period = Initial Investment / Annual Cash Flow
```

### Why do renewable plants have low capacity factors?
Capacity factor reflects real-world performance:
- **Solar**: Only generates during daylight hours (~27% average)
- **Wind**: Depends on wind patterns (~35% onshore, ~45% offshore)
- **Coal/Nuclear**: Can run continuously (~85-92%)
- **Gas Turbines**: Often used only for peak periods (~15-87%)

### How does carbon pricing affect my strategy?
Carbon pricing adds costs to fossil fuel plants:
- **Coal**: ~$48/MWh additional cost at $50/ton CO₂
- **Natural Gas**: ~$18-28/MWh additional cost
- **Nuclear/Renewables**: No carbon cost (competitive advantage)
- **Strategy**: Higher carbon prices favor clean technologies

## 💰 Financial Questions

### How much budget do I start with?
- **Typical Range**: $1.5-2.0 billion per utility
- **Existing Assets**: You start with 3-5 operating plants worth $1-2 billion
- **Available Cash**: Usually $500M-1B for new investments
- **Debt Capacity**: Can borrow up to 2x your equity (70% debt financing typical)

### What if I run out of money?
- **Investment Limits**: You can't build new plants without adequate budget
- **Debt Constraints**: High debt-to-equity ratios limit borrowing capacity
- **Credit Rating**: Poor financial health increases borrowing costs
- **Recovery**: Focus on optimizing existing plants and improving cash flow
- **Strategy**: Conservative financial management prevents this situation

### How does financing work?
Utility investments typically use:
- **70% Debt Financing**: Borrowed money with interest payments
- **30% Equity Financing**: Your cash investment
- **Credit Rating**: Affects interest rates and borrowing capacity
- **Debt Service**: Annual payments reduce cash flow
- **Financial Health**: Debt-to-equity ratio impacts future investment capacity

### What's a good debt-to-equity ratio?
- **AAA (< 1.0)**: Excellent financial health, maximum flexibility
- **AA (< 1.5)**: Good financial health, reasonable borrowing costs
- **A (< 2.0)**: Acceptable financial health, higher borrowing costs
- **BBB (> 2.0)**: Poor financial health, limited investment capacity
- **Target**: Most utilities aim for 1.0-1.5 for optimal balance

## 📊 Market Questions

### Why are my bids not being accepted?
Common reasons:
- **Price Too High**: Your bid price exceeds the market clearing price
- **Insufficient Capacity**: You're not bidding enough quantity
- **Market Timing**: Demand is lower than expected
- **Competition**: Other utilities are bidding more aggressively
- **Solution**: Use the marginal cost calculator and price competitively

### How do I know what price to bid?
**Calculate Marginal Cost:**
1. Variable O&M costs (always included)
2. Fuel costs (heat rate × fuel price ÷ 1000)
3. Carbon costs (emissions rate × carbon price)
4. **Bid Price**: Marginal cost + profit margin (10-30%)

**Market Strategy:**
- **Off-Peak**: Conservative pricing, focus on baseload plants
- **Shoulder**: Moderate pricing, include flexible plants
- **Peak**: Aggressive pricing, bid all available capacity

### What causes electricity prices to change?
- **Supply-Demand Balance**: More/less capacity relative to demand
- **Fuel Prices**: Higher gas/coal costs increase marginal costs
- **Carbon Pricing**: Emissions costs affect fossil plant competitiveness
- **Weather Events**: Renewable availability changes supply mix
- **Plant Outages**: Reduced capacity increases prices
- **Market Events**: Instructor-triggered scenarios create volatility

### How do market events work?
Instructors can trigger realistic events:
- **Fuel Shocks**: Natural gas supply disruptions increase costs
- **Weather Events**: Droughts or storms affect renewable generation
- **Plant Outages**: Equipment failures reduce available capacity
- **Policy Changes**: Carbon price increases or renewable mandates
- **Demand Surges**: Heat waves or economic growth increase demand

## 🔧 Technical Questions

### What are the system requirements?
**Minimum:**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for setup
- 4GB RAM recommended
- 1920x1080 screen resolution for optimal experience

**For Instructors:**
- Python 3.8+ and Node.js 18+
- 8GB RAM for hosting multiple users
- Stable network connection
- Backup computer recommended

### Can I play on mobile devices?
The game is optimized for desktop/laptop use:
- **Tablets**: Partially supported (iPad Pro works reasonably well)
- **Phones**: Not recommended due to interface complexity
- **Best Experience**: Desktop with large screen and mouse/keyboard
- **Future**: Mobile optimization planned for future versions

### How is my data stored?
- **Local Storage**: Game state saved in browser localStorage
- **Database**: Game data stored in SQLite (development) or PostgreSQL (production)
- **Privacy**: No personal information collected beyond usernames
- **Persistence**: Data persists between browser sessions
- **Backup**: Instructors can export game data for analysis

### Can I save and resume games?
- **Automatic Saving**: Game state automatically saved after each action
- **Session Persistence**: Can close browser and return later
- **Multi-Day Games**: Sessions can span multiple days/weeks
- **Data Export**: Instructors can export final results for analysis
- **Recovery**: Built-in recovery mechanisms for technical issues

## 🎓 Educational Questions

### What will I learn from this game?
**Core Concepts:**
- Electricity market mechanics and price formation
- Long-term strategic planning under uncertainty
- Investment analysis and financial modeling
- Technology evaluation and portfolio optimization
- Policy impacts on business decisions

**Skills Developed:**
- Analytical thinking and data interpretation
- Strategic decision-making in competitive environments
- Financial analysis and risk assessment
- Adaptation to changing conditions
- Collaborative problem-solving

### How does this relate to real energy markets?
**Direct Applications:**
- **Utility Strategy**: How real utilities make investment decisions
- **Market Operations**: How electricity markets actually function
- **Policy Analysis**: How regulations affect market outcomes
- **Technology Assessment**: How utilities evaluate new technologies
- **Financial Management**: How utilities manage multi-billion dollar portfolios

### What careers does this prepare me for?
**Energy Industry:**
- Utility company analyst, planner, or executive
- Independent power producer
- Energy trading and risk management
- Renewable energy project developer

**Finance:**
- Energy investment banking
- Infrastructure finance
- Project finance
- Energy private equity/venture capital

**Consulting:**
- Energy strategy consulting
- Market analysis and forecasting
- Technology assessment
- Regulatory and policy consulting

**Government/Policy:**
- Energy regulatory agencies
- Environmental policy development
- Economic analysis and planning
- International energy organizations

### How is performance evaluated?
**Typical Assessment Criteria:**
- **Financial Performance (40%)**: ROI, profitability, credit rating
- **Strategic Thinking (30%)**: Portfolio diversification, adaptation to events
- **Market Understanding (20%)**: Bidding strategy, price competitiveness
- **Participation (10%)**: Engagement, collaboration, discussion quality

**Learning Focus:**
- Emphasis on understanding concepts, not just winning
- Strategy quality more important than final ranking
- Adaptation and learning valued over perfect decisions
- Reflection and analysis crucial for full credit

## 🔍 Troubleshooting

### The game won't load or is very slow
**Common Solutions:**
- **Refresh Browser**: Clear cache and reload page
- **Check Connection**: Ensure stable internet connection
- **Close Other Tabs**: Free up browser memory
- **Try Different Browser**: Chrome or Firefox recommended
- **Contact Instructor**: Report persistent technical issues

### I can't access my utility company
**Possible Issues:**
- **Wrong Username**: Check spelling and capitalization
- **Game Not Started**: Instructor may not have started the session yet
- **Browser Issues**: Clear localStorage and cookies
- **Network Problems**: Check connection to game server
- **Session Expired**: Instructor may need to restart the game

### My investments aren't showing up
**Check These Items:**
- **Budget Sufficient**: Ensure you have enough cash for the investment
- **Construction Time**: Plants take 1-7 years to build depending on technology
- **Game State**: Investments may only be allowed during planning phases
- **Approval Process**: Some investments may require instructor approval
- **Technical Issues**: Refresh page or contact instructor

### I don't understand the market results
**Key Concepts:**
- **Merit Order**: Cheapest plants serve demand first
- **Clearing Price**: Set by the most expensive plant needed
- **Accepted Bids**: Only bids at or below clearing price are accepted
- **Revenue**: Accepted quantity × clearing price × hours in period
- **Ask for Help**: Instructors can explain specific results

## 🌟 Strategy Questions

### What's the best investment strategy?
**No Single Answer**: Success depends on market conditions and competition
**General Principles:**
- **Diversify**: Don't put all investments in one technology
- **Plan Ahead**: Consider 3-5 year construction lead times
- **Watch Competitors**: Adapt to their strategies
- **Stay Flexible**: Maintain financial capacity for opportunities
- **Think Long-term**: 10-year perspective is crucial

### How aggressive should I be with pricing?
**Bidding Strategy Balance:**
- **Too High**: No sales, no revenue
- **Too Low**: Sales but no profit
- **Sweet Spot**: Just below competitors but above your costs
- **Market Conditions**: Adjust based on supply-demand balance
- **Competition**: Monitor competitor behavior and adapt

### Should I focus on one technology or diversify?
**Diversification Benefits:**
- **Risk Reduction**: Protects against technology-specific problems
- **Market Coverage**: Serve different load periods effectively
- **Fuel Hedging**: Reduce exposure to fuel price volatility
- **Regulatory Protection**: Hedge against policy changes

**Specialization Benefits:**
- **Expertise**: Deep knowledge of specific technology
- **Economies of Scale**: Lower costs through specialization
- **Market Position**: Dominate specific market segments
- **Competitive Advantage**: Become the low-cost provider

### How do I respond to market events?
**Event Response Framework:**
1. **Assess Impact**: How does this affect your plants and costs?
2. **Adapt Strategy**: What changes should you make?
3. **Competitive Analysis**: How are others likely to respond?
4. **Long-term View**: What are the permanent vs. temporary effects?
5. **Learn**: What does this teach about real market dynamics?

## 🔄 Game Mechanics

### Can I trade with other utilities?
Currently, the game focuses on market-based competition rather than direct trading:
- **Market Trading**: All trading happens through the central market
- **No Direct Deals**: Can't make bilateral contracts with other utilities
- **Future Feature**: Direct trading may be added in future versions
- **Learning Focus**: Emphasizes market mechanisms over negotiation

### What happens to my plants when they retire?
- **Automatic Retirement**: Plants retire at end of economic life
- **Early Retirement**: You can retire plants early if desired
- **Stranded Assets**: Early retirement may result in financial losses
- **Replacement Planning**: Plan new capacity to replace retiring plants
- **Strategic Timing**: Consider market conditions for retirement decisions

### Can I modify my bids after submission?
- **Bid Updates**: You can update bids until the instructor closes bidding
- **Final Submission**: Once markets clear, bids cannot be changed
- **Strategy**: Submit early, then refine based on market conditions
- **Time Pressure**: Bidding phases have time limits
- **Best Practice**: Calculate carefully before submitting

### How accurate are the financial projections?
**ROI Calculator Accuracy:**
- **Based on**: Industry-standard financial modeling
- **Assumptions**: Current market conditions and fuel prices
- **Uncertainty**: Real markets have more volatility than simulation
- **Educational Purpose**: Designed to teach concepts, not predict exact outcomes
- **Validation**: Compare to real utility investment analyses

## 🎓 Educational Support

### I'm struggling with the concepts - where can I get help?
**Immediate Help:**
- **Instructor**: Ask questions during or after class
- **Classmates**: Collaborate and learn from peers
- **In-Game Help**: Use tooltips and guidance features
- **Pause and Discuss**: Request breaks for clarification

**Additional Resources:**
- **Course Materials**: Review assigned readings and lectures
- **Online Resources**: EIA data, utility company reports
- **Academic Papers**: Energy economics and market design literature
- **Industry Reports**: Current market analyses and forecasts

### How do I improve my performance?
**Analysis and Reflection:**
- **Review Decisions**: Analyze what worked and what didn't
- **Study Results**: Understand why certain outcomes occurred
- **Compare Strategies**: Learn from successful competitors
- **Seek Feedback**: Ask instructor for performance guidance

**Strategic Improvement:**
- **Long-term Thinking**: Focus on 10-year outcomes, not single years
- **Market Understanding**: Deepen knowledge of electricity market mechanics
- **Financial Discipline**: Maintain healthy balance sheet
- **Adaptation**: Respond effectively to changing conditions

### What if I miss a class session?
**Catch-Up Strategies:**
- **Teammate Updates**: Get briefed by team members
- **Instructor Summary**: Request overview of missed events
- **Game State Review**: Analyze what happened in your absence
- **Strategic Adjustment**: Adapt strategy based on new conditions
- **Learning Focus**: Emphasize understanding over competition

## 🔧 Technical Support

### The game is running slowly - what can I do?
**Browser Optimization:**
- **Close Other Tabs**: Free up browser memory
- **Clear Cache**: Remove stored data that might be corrupted
- **Update Browser**: Use latest version of Chrome or Firefox
- **Disable Extensions**: Turn off unnecessary browser extensions
- **Restart Browser**: Fresh start can resolve memory issues

**System Optimization:**
- **Close Other Programs**: Free up system memory
- **Check Internet**: Ensure stable connection
- **Restart Computer**: If problems persist
- **Contact Instructor**: Report persistent performance issues

### I lost my game progress - can it be recovered?
**Recovery Options:**
- **Browser Storage**: Data usually persists in localStorage
- **Instructor Backup**: Game state saved on instructor's system
- **Session Recovery**: Rejoin using same username/utility
- **Manual Recovery**: Instructor can restore your position
- **Prevention**: Don't clear browser data during active games

### Can I play from home or only in class?
**Access Options:**
- **Classroom**: Typical setup with instructor hosting locally
- **Remote Access**: Possible if instructor provides network access
- **Cloud Deployment**: Some instructors use cloud hosting
- **Home Practice**: Use sample data mode for individual practice
- **Hybrid**: Some sessions allow remote participation

## 🌍 Real-World Connections

### How does this compare to actual electricity markets?
**Similarities:**
- **Merit order dispatch** and marginal pricing
- **Technology costs** and performance characteristics
- **Investment decision** frameworks and financial analysis
- **Policy impacts** on market outcomes
- **Competitive dynamics** in oligopolistic markets

**Simplifications:**
- **3 load periods** instead of 8760 hours
- **Annual bidding** instead of day-ahead/real-time markets
- **Simplified transmission** (no grid constraints)
- **Limited market products** (energy only, no capacity/ancillary services)
- **Educational focus** rather than operational complexity

### What real companies use similar strategies?
**Successful Utility Strategies:**
- **NextEra Energy**: Renewable energy leadership and growth
- **Berkshire Hathaway Energy**: Diversified portfolio and financial strength
- **Exelon**: Nuclear baseload focus with competitive operations
- **Southern Company**: Balanced traditional and clean energy mix
- **Ørsted**: Transformation from fossil fuels to offshore wind leader

### How do current events relate to the game?
**Recent Examples:**
- **Texas Winter Storm 2021**: Demonstrates importance of reserve capacity
- **California Wildfires**: Shows renewable intermittency challenges
- **Natural Gas Price Volatility**: Illustrates fuel cost impacts
- **Renewable Energy Growth**: Reflects real technology adoption trends
- **Carbon Pricing Policies**: Mirrors actual regulatory developments

## 🚀 Future Development

### Will new features be added?
**Planned Enhancements:**
- **Transmission Networks**: Grid constraints and congestion pricing
- **Demand Response**: Customer-side participation
- **Energy Storage**: Advanced battery and pumped hydro modeling
- **International Markets**: Multi-region trading
- **Carbon Markets**: Cap-and-trade mechanisms
- **Advanced Analytics**: Machine learning and AI integration

### Can I contribute to the project?
**Contribution Opportunities:**
- **Code Development**: Frontend/backend improvements
- **Educational Content**: Scenarios, curricula, assessments
- **Testing**: Bug reports and feature testing
- **Documentation**: Guides, tutorials, and examples
- **Research**: Educational effectiveness studies
- **Translation**: Multi-language support

### How can I stay updated?
**Stay Connected:**
- **GitHub**: Watch the repository for updates
- **Newsletter**: Subscribe for major announcements
- **Community Forum**: Join discussions with other users
- **Social Media**: Follow project updates
- **Conferences**: Present and learn at energy education events

---

## 📞 Still Have Questions?

### Getting Help
- **Instructor**: Your first resource for gameplay and educational questions
- **Classmates**: Collaborate and learn together
- **Documentation**: Comprehensive guides and references
- **Community**: Connect with other students and instructors
- **Technical Support**: Report bugs and technical issues

### Contact Information
- **GitHub Issues**: Technical problems and feature requests
- **Community Forum**: General questions and discussions
- **Email Support**: Direct contact for urgent issues
- **Educational Support**: Curriculum and teaching assistance

---

**Ready to master the electricity market? Dive in and start your utility empire!** ⚡🏢📈