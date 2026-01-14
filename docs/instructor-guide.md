# Instructor Guide

Complete guide for educators using the Electricity Market Game in their curriculum.

## 🎓 Educational Overview

### What Students Will Learn
The Electricity Market Game teaches complex energy market concepts through hands-on experience:

- **Market Mechanics**: How electricity prices are determined through merit order dispatch
- **Strategic Planning**: Long-term capacity planning under uncertainty
- **Investment Analysis**: Technology evaluation and financial modeling
- **Risk Management**: Portfolio diversification and adaptation strategies
- **Policy Impact**: How regulations affect business decisions and market outcomes
- **Competitive Dynamics**: Strategic interaction in oligopolistic markets

### Course Integration
**Suitable for:**
- Energy Economics (undergraduate/graduate)
- Public Policy (energy focus)
- Business Strategy (competitive dynamics)
- Environmental Studies (clean energy transition)
- Engineering Economics (technology evaluation)
- MBA Programs (strategic decision-making)

## 🚀 Quick Setup Guide

### Pre-Class Preparation (30 minutes)

**1. Technical Setup**
```bash
# Start backend server
cd backend
python startup.py --dev

# Start frontend (new terminal)
cd frontend
npm run dev
```

**2. Create Game Session**
- Go to http://localhost:3000
- Select "Instructor Mode"
- Click "Game Setup" → "Load Sample Data"
- Verify 3 utilities are created with different portfolios

**3. Test Student Access**
- Open new browser tab to http://localhost:3000
- Select "Utility Mode"
- Choose "utility_1" to test student interface
- Verify dashboard loads with portfolio data

### Class Session Structure (3-4 hours)

**Opening (15 minutes)**
- Explain electricity market basics
- Review game objectives and rules
- Assign students to utility companies
- Set competitive and learning goals

**Year 1: Guided Tutorial (45-60 minutes)**
- Walk through interface together
- Explain each dashboard section
- Guide first investment decision
- Demonstrate bidding process
- Review market results together

**Years 2-4: Strategy Development (90-120 minutes)**
- Students work more independently
- Introduce market events strategically
- Facilitate brief discussions between years
- Monitor progress and provide guidance

**Years 5-10: Advanced Competition (60-90 minutes)**
- Faster pace as students gain experience
- More complex market events
- Focus on strategic adaptation
- Competitive dynamics intensify

**Debrief and Analysis (30-45 minutes)**
- Review final results and rankings
- Discuss strategies and outcomes
- Connect to real-world examples
- Assess learning objectives

## 🎮 Detailed Gameplay Guide

### Phase 1: Year Planning (10-15 minutes per year)

**Instructor Actions:**
1. Click "Start Year Planning" in Market Control
2. Announce current year and any special conditions
3. Monitor student activity in Analytics dashboard
4. Answer questions about market conditions

**Student Activities:**
- **Dashboard Review**: Check financial position and portfolio status
- **Market Analysis**: Study fuel prices, renewable availability, carbon pricing
- **Investment Planning**: Evaluate new plant opportunities using ROI calculator
- **Competitive Intelligence**: Analyze competitor portfolios and strategies

**Key Teaching Points:**
- Emphasize long-term thinking (3-5 year planning horizon)
- Discuss construction lead times and market timing
- Highlight importance of portfolio diversification
- Connect to real utility planning processes

### Phase 2: Investment Decisions (15-20 minutes)

**Instructor Actions:**
1. Monitor investment activity in real-time
2. Highlight interesting investment choices
3. Discuss technology tradeoffs as they arise
4. Ensure students understand financing implications

**Student Activities:**
- **Technology Evaluation**: Compare plant types using templates
- **Financial Analysis**: Use investment simulator for ROI projections
- **Strategic Positioning**: Consider competitive implications
- **Risk Assessment**: Evaluate technology and market risks

**Key Teaching Points:**
- Different technologies serve different market segments
- Capital intensity vs. operating flexibility tradeoffs
- Importance of fuel price hedging for thermal plants
- Environmental regulations favor clean technologies

### Phase 3: Annual Bidding (15-20 minutes)

**Instructor Actions:**
1. Click "Open Bidding" when students are ready
2. Explain bidding strategy concepts
3. Monitor bid submission progress
4. Provide guidance on pricing strategy

**Student Activities:**
- **Cost Calculation**: Use marginal cost calculator for each plant
- **Price Strategy**: Balance competitiveness with profitability
- **Period Optimization**: Different strategies for off-peak, shoulder, peak
- **Portfolio Coordination**: Optimize bids across entire plant portfolio

**Key Teaching Points:**
- Merit order dispatch and marginal pricing
- Importance of bidding above marginal cost
- Peak period pricing premiums
- Impact of fuel costs and carbon pricing on bids

### Phase 4: Market Clearing & Results (5-10 minutes)

**Instructor Actions:**
1. Click "Clear Markets" once all bids submitted
2. Review results with class
3. Highlight surprising outcomes
4. Explain market clearing process

**Student Activities:**
- **Results Analysis**: Review which bids were accepted
- **Revenue Calculation**: Understand clearing price impacts
- **Performance Comparison**: Compare to competitors
- **Strategy Adjustment**: Plan improvements for next year

**Key Teaching Points:**
- Why certain plants set clearing prices
- Impact of supply-demand balance on prices
- Revenue depends on both quantity and price
- Market share vs. profitability tradeoffs

## 🎯 Strategic Teaching Moments

### Market Events for Learning

**Year 2-3: Fuel Price Shock**
- **Event**: Natural gas price increases 40%
- **Learning**: Fuel cost impact on plant economics
- **Discussion**: Hedging strategies, portfolio diversification
- **Real-world**: Connect to actual gas price volatility

**Year 4-5: Renewable Weather Event**
- **Event**: Solar drought reduces output 40%
- **Learning**: Renewable intermittency challenges
- **Discussion**: Backup capacity needs, storage value
- **Real-world**: California solar variability, Texas wind patterns

**Year 6-7: Plant Outage**
- **Event**: Major plant failure reduces capacity 15%
- **Learning**: Grid reliability and reserve margins
- **Discussion**: Maintenance importance, redundancy planning
- **Real-world**: Recent plant outages and grid impacts

**Year 8-9: Carbon Price Increase**
- **Event**: Carbon price doubles to $100/ton
- **Learning**: Policy impact on plant economics
- **Discussion**: Stranded assets, clean energy transition
- **Real-world**: EU ETS, California cap-and-trade

### Discussion Facilitation

**After Each Market Event:**
- Pause the game briefly (2-3 minutes)
- Ask: "How does this change your strategy?"
- Discuss real-world parallels and examples
- Resume gameplay with new insights

**Between Years:**
- Quick performance check-in (1-2 minutes)
- Highlight interesting investment or bidding decisions
- Address student questions about market mechanics
- Preview upcoming challenges or opportunities

**End of Game:**
- Comprehensive results analysis (15-20 minutes)
- Strategy comparison and effectiveness discussion
- Real-world application and career relevance
- Policy implications and future scenarios

## 📊 Assessment Strategies

### Performance-Based Assessment (40% of grade)

**Financial Metrics (20%)**
- Total return on investment over 10 years
- Debt-to-equity ratio management
- Credit rating maintenance
- Cash flow optimization

**Strategic Metrics (20%)**
- Portfolio diversification effectiveness
- Market event adaptation quality
- Competitive positioning success
- Long-term planning demonstration

### Reflection Analysis (30% of grade)

**Written Reflection (1000-1500 words)**
Required elements:
1. **Strategy Evolution**: How your approach changed over time
2. **Key Decisions**: Most important investment and bidding choices
3. **Event Response**: Adaptation to market shocks and policy changes
4. **Lessons Learned**: Insights about electricity markets and strategy
5. **Real-World Applications**: Connections to current energy issues

**Grading Rubric:**
- **Excellent (A)**: Sophisticated analysis with clear strategic thinking
- **Good (B)**: Solid understanding with some strategic insights
- **Satisfactory (C)**: Basic comprehension with limited analysis
- **Needs Improvement (D/F)**: Minimal understanding or effort

### Participation & Engagement (20% of grade)

**Active Participation:**
- Consistent engagement throughout simulation
- Quality of questions and discussions
- Collaboration and peer learning
- Adaptation and strategic thinking demonstration

### Group Presentation (10% of grade)

**Presentation Format (15-20 minutes):**
1. **Portfolio Strategy** (5 minutes): Technology choices and rationale
2. **Market Performance** (5 minutes): Results analysis and competitive position
3. **Event Response** (5 minutes): Adaptation to market shocks
4. **Lessons & Applications** (5 minutes): Key insights and real-world relevance

## 🔧 Customization Options

### Scenario Modifications

**Clean Energy Transition Scenario**
- Higher carbon prices ($100-150/ton)
- Renewable portfolio standards (50% by 2030)
- Coal plant retirement mandates
- Clean energy investment tax credits

**Market Volatility Scenario**
- Extreme fuel price swings (±50%)
- Frequent weather events
- Multiple plant outages
- Regulatory uncertainty

**Technology Innovation Scenario**
- Battery cost declines (50% by 2030)
- Advanced nuclear options
- Hydrogen integration opportunities
- Smart grid and demand response

**International Comparison**
- European-style carbon markets
- Asian demand growth patterns
- Developing country constraints
- Different regulatory frameworks

### Advanced Features

**Market Design Variations**
- Capacity markets (additional revenue stream)
- Ancillary services (frequency regulation, reserves)
- Transmission constraints and congestion pricing
- Real-time vs. day-ahead market splits

**Financial Complexity**
- Variable interest rates over time
- Inflation adjustments for costs and revenues
- Tax policy changes and depreciation
- Currency fluctuations for international scenarios

## 📈 Learning Assessment

### Formative Assessment (During Game)

**Real-time Observation:**
- Decision-making process quality
- Use of analytical tools and data
- Adaptation to changing conditions
- Collaboration and discussion participation

**Checkpoint Questions:**
- "Why did you choose that technology?"
- "How are you responding to the fuel price shock?"
- "What's your strategy for the next three years?"
- "How does this compare to real utility decisions?"

### Summative Assessment (Post-Game)

**Quantitative Analysis:**
- Export game data for detailed analysis
- Compare student strategies and outcomes
- Analyze decision patterns and effectiveness
- Measure learning objective achievement

**Qualitative Evaluation:**
- Strategy sophistication and evolution
- Market understanding demonstration
- Real-world connection quality
- Critical thinking and analysis depth

### Long-term Learning Assessment

**Follow-up Activities (2-4 weeks later):**
- Current events analysis using game frameworks
- Real utility company case study analysis
- Policy proposal development based on game insights
- Technology evaluation exercises

**Retention Measurement:**
- Quiz on key concepts weeks after game
- Application exercises in subsequent courses
- Reference to game experiences in later discussions
- Alumni feedback on real-world relevance

## 🌟 Best Practices

### Preparation Excellence
- **Practice First**: Run through entire game yourself
- **Backup Plans**: Prepare for technical issues
- **Clear Expectations**: Explain time commitment and objectives
- **Learning Objectives**: Connect explicitly to course goals

### Facilitation Mastery
- **Active Monitoring**: Watch all students, not just vocal ones
- **Strategic Questioning**: Ask probing questions about decisions
- **Flexible Timing**: Adjust pace based on student engagement
- **Learning Moments**: Pause for discussion when valuable

### Technology Management
- **Test Everything**: Verify all systems 24 hours before class
- **Have Backups**: Screenshots, manual calculations, alternative plans
- **Monitor Performance**: Watch for slow responses or errors
- **Quick Recovery**: Know how to restart systems if needed

### Educational Enhancement
- **Real-world Connections**: Use current energy news and examples
- **Multiple Perspectives**: Encourage different strategic approaches
- **Collaborative Learning**: Foster peer teaching and discussion
- **Continuous Improvement**: Gather feedback and adapt

## 🎯 Advanced Teaching Techniques

### Differentiated Instruction

**For Beginners:**
- Provide more guidance during first 2-3 years
- Use simpler portfolio templates initially
- Focus on basic market mechanics
- Offer additional explanation of concepts

**For Advanced Students:**
- Minimal guidance, maximum independence
- Complex market events and scenarios
- Encourage sophisticated financial analysis
- Challenge with difficult strategic decisions

**For Mixed Groups:**
- Pair experienced with novice students
- Use peer teaching opportunities
- Provide optional advanced challenges
- Offer multiple complexity levels

### Real-World Integration

**Current Events Connection:**
- Start each session with energy news
- Connect game events to recent occurrences
- Discuss actual utility company strategies
- Explore current policy debates and implications

**Guest Expert Integration:**
- Invite utility executives to observe/comment
- Host energy policy experts for Q&A
- Include renewable energy developers
- Engage market operators or regulators

**Field Trip Connections:**
- Visit power plants before or after game
- Tour utility control centers
- Attend energy conferences or hearings
- Explore renewable energy facilities

## 📚 Curriculum Materials

### Pre-Game Readings
**Essential Background:**
- EIA Annual Energy Outlook (current year)
- "Economics of Power Generation" (relevant chapters)
- Regional electricity market overview
- Current energy policy landscape

**Advanced Preparation:**
- Academic papers on electricity market design
- Utility company annual reports and strategies
- Energy transition case studies
- Technology cost trend analyses

### Post-Game Extensions
**Research Projects:**
- Compare simulation results to real market data
- Analyze actual utility investment strategies
- Study technology adoption patterns
- Investigate policy effectiveness

**Case Study Analysis:**
- Real utility company strategic decisions
- Energy transition success stories
- Market design comparisons across regions
- Technology deployment case studies

## 🔍 Troubleshooting Guide

### Common Student Issues

**"I can't afford any investments"**
- Check debt-to-equity ratio (should be < 2.0)
- Review existing plant performance and cash flow
- Consider smaller capacity additions
- Analyze portfolio optimization opportunities

**"My bids never get accepted"**
- Review marginal cost calculations
- Compare to likely competitor pricing
- Check if bidding full plant capacity
- Consider market timing and demand patterns

**"I don't understand the results"**
- Explain merit order dispatch concept
- Show how clearing prices are determined
- Demonstrate revenue calculation process
- Connect to supply and demand fundamentals

### Technical Issues

**Game won't load or is slow**
- Check that both backend and frontend are running
- Verify network connectivity between components
- Clear browser cache and restart if needed
- Monitor system resources and close other applications

**Students can't access their utilities**
- Verify utilities were created in game setup
- Check that game session is active
- Ensure students are using correct utility names
- Restart game session if necessary

**Market clearing fails**
- Ensure at least one utility submitted bids
- Check that bid quantities and prices are valid
- Verify game state allows market clearing
- Review error messages in instructor dashboard

### Recovery Strategies

**Mid-Game Technical Issues**
- Save current state and restart systems
- Use manual calculations if necessary
- Continue with simplified version if needed
- Document issues for post-game discussion

**Student Confusion or Frustration**
- Pause game for clarification
- Provide individual guidance as needed
- Adjust complexity or pace
- Focus on learning over competition

## 📞 Support Resources

### Immediate Help
- **In-Game Help**: Tooltips and guidance text
- **Instructor Manual**: Comprehensive reference guide
- **API Documentation**: Technical details and troubleshooting
- **Community Forum**: Connect with other educators

### Professional Development
- **Training Workshops**: Learn advanced facilitation techniques
- **Webinar Series**: Monthly best practices sessions
- **Conference Presentations**: Share your experiences
- **Research Collaboration**: Academic partnership opportunities

### Technical Support
- **GitHub Issues**: Report bugs and request features
- **Email Support**: Direct contact for urgent issues
- **Video Tutorials**: Step-by-step guidance
- **Custom Development**: Tailored features for your needs

---

## 🎉 Success Tips

### For First-Time Instructors
1. **Start Simple**: Use sample data and basic scenarios
2. **Practice First**: Run through the game yourself
3. **Set Expectations**: Explain the learning focus
4. **Be Patient**: Students need time to understand complexity
5. **Focus on Learning**: Emphasize education over competition

### For Experienced Instructors
1. **Customize Scenarios**: Create unique market conditions
2. **Advanced Events**: Use complex multi-year scenarios
3. **Student Leadership**: Let advanced students help others
4. **Research Integration**: Connect to your current research
5. **Community Contribution**: Share your innovations

### For Maximum Impact
1. **Connect to Reality**: Use current energy news and examples
2. **Encourage Reflection**: Build in thinking and discussion time
3. **Assess Thoroughly**: Use multiple evaluation methods
4. **Follow Up**: Reference game experiences in later courses
5. **Continuous Improvement**: Adapt based on student feedback

---

**Transform your energy education with hands-on market simulation. Your students will never forget this learning experience!**