import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ChartBarIcon,
  InformationCircleIcon,
  BoltIcon,
  CurrencyDollarIcon,
  FireIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

const MarketAnalysis: React.FC = () => {
  const { utilityId } = useParams<{ utilityId: string }>();
  const { currentSession } = useGameStore();
  
  const [selectedMetric, setSelectedMetric] = useState<string>('prices');
  const [timeHorizon, setTimeHorizon] = useState<string>('historical');

  // Get multi-year market analysis
  const { data: marketAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['multi-year-analysis', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getMultiYearAnalysis(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Get market results for detailed analysis
  const { data: marketResults } = useQuery({
    queryKey: ['market-results', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getMarketResults(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Get fuel price trends
  const { data: currentFuelPrices } = useQuery({
    queryKey: ['fuel-prices', currentSession?.id, currentSession?.current_year],
    queryFn: () => currentSession ? 
      ElectricityMarketAPI.getFuelPrices(currentSession.id, currentSession.current_year) : null,
    enabled: !!currentSession,
  });

  // Process market data for charts
  const processMarketData = () => {
    if (!marketAnalysis?.yearly_data) return [];
    
    return Object.entries(marketAnalysis.yearly_data).map(([year, data]: [string, any]) => ({
      year: parseInt(year),
      avgPrice: data.average_price || 50,
      totalEnergy: (data.total_energy || 0) / 1000000, // Convert to TWh
      renewablePct: (data.renewable_penetration || 0) * 100,
      capacityUtil: (data.capacity_utilization || 0) * 100,
      marketValue: ((data.average_price || 50) * (data.total_energy || 0)) / 1000000000, // Billions
    }));
  };

  const marketData = processMarketData();

  // Process market results by period
  const processPeriodData = () => {
    if (!marketResults) return [];
    
    const periodData: Record<string, { period: string; avgPrice: number; totalEnergy: number; count: number }> = {};
    
    marketResults.forEach((result: any) => {
      if (!periodData[result.period]) {
        periodData[result.period] = {
          period: result.period.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          avgPrice: 0,
          totalEnergy: 0,
          count: 0
        };
      }
      
      periodData[result.period].avgPrice += result.clearing_price;
      periodData[result.period].totalEnergy += result.total_energy;
      periodData[result.period].count += 1;
    });
    
    return Object.values(periodData).map(data => ({
      ...data,
      avgPrice: data.avgPrice / data.count,
      totalEnergy: data.totalEnergy / 1000000, // Convert to TWh
    }));
  };

  const periodData = processPeriodData();

  // Fuel price projection (mock data for demonstration)
  const fuelProjection = [
    { year: 2025, naturalGas: 4.0, coal: 2.5, uranium: 0.75 },
    { year: 2026, naturalGas: 4.2, coal: 2.6, uranium: 0.76 },
    { year: 2027, naturalGas: 4.5, coal: 2.7, uranium: 0.77 },
    { year: 2028, naturalGas: 4.8, coal: 2.8, uranium: 0.78 },
    { year: 2029, naturalGas: 5.0, coal: 2.9, uranium: 0.79 },
    { year: 2030, naturalGas: 5.2, coal: 3.0, uranium: 0.80 },
  ];

  // Market insights
  const generateInsights = () => {
    if (marketData.length < 2) return [];
    
    const insights = [];
    const latest = marketData[marketData.length - 1];
    const previous = marketData[marketData.length - 2];
    
    // Price trend
    const priceChange = ((latest.avgPrice - previous.avgPrice) / previous.avgPrice) * 100;
    insights.push({
      type: priceChange > 0 ? 'warning' : 'positive',
      icon: priceChange > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
      title: `Electricity Prices ${priceChange > 0 ? 'Rising' : 'Falling'}`,
      description: `Average prices ${priceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(priceChange).toFixed(1)}% year-over-year`,
      value: `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`
    });
    
    // Renewable penetration
    const renewableChange = latest.renewablePct - previous.renewablePct;
    insights.push({
      type: renewableChange > 0 ? 'positive' : 'neutral',
      icon: BoltIcon,
      title: 'Renewable Energy Growth',
      description: `Renewable penetration ${renewableChange > 0 ? 'increased' : 'remained stable'} this year`,
      value: `${latest.renewablePct.toFixed(1)}%`
    });
    
    // Market size
    const marketGrowth = ((latest.marketValue - previous.marketValue) / previous.marketValue) * 100;
    insights.push({
      type: 'neutral',
      icon: CurrencyDollarIcon,
      title: 'Market Size',
      description: `Total market value ${marketGrowth > 0 ? 'grew' : 'contracted'} by ${Math.abs(marketGrowth).toFixed(1)}%`,
      value: `$${latest.marketValue.toFixed(1)}B`
    });
    
    return insights;
  };

  const insights = generateInsights();

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (analysisLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading market analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Analysis</h1>
          <p className="text-gray-400">
            Strategic market intelligence and competitive insights
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="prices">Price Analysis</option>
            <option value="capacity">Capacity Trends</option>
            <option value="renewables">Renewable Growth</option>
            <option value="financial">Financial Metrics</option>
          </select>
          
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="historical">Historical Data</option>
            <option value="forecast">Market Forecast</option>
            <option value="scenarios">Scenario Analysis</option>
          </select>
        </div>
      </div>

      {/* Market Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight, index) => (
          <div key={index} className={`rounded-lg p-6 border ${
            insight.type === 'positive' ? 'bg-green-900/20 border-green-700' :
            insight.type === 'warning' ? 'bg-yellow-900/20 border-yellow-700' :
            'bg-blue-900/20 border-blue-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white mb-1">{insight.title}</h3>
                <p className="text-sm text-gray-300 mb-2">{insight.description}</p>
                <p className={`text-2xl font-bold ${
                  insight.type === 'positive' ? 'text-green-400' :
                  insight.type === 'warning' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  {insight.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                insight.type === 'positive' ? 'bg-green-600' :
                insight.type === 'warning' ? 'bg-yellow-600' :
                'bg-blue-600'
              }`}>
                <insight.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Trends */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Electricity Price Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}/MWh`, 'Average Price']}
                />
                <Line type="monotone" dataKey="avgPrice" stroke="#3B82F6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Historical electricity prices showing market volatility and trends</p>
          </div>
        </div>

        {/* Market Volume */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Energy Market Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} TWh`, 'Total Energy']}
                />
                <Area type="monotone" dataKey="totalEnergy" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Total energy traded in the market by year</p>
          </div>
        </div>

        {/* Load Period Analysis */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Load Period Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="period" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}/MWh`, 'Average Price']}
                />
                <Bar dataKey="avgPrice" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Average clearing prices by load period showing peak pricing premiums</p>
          </div>
        </div>

        {/* Renewable Penetration */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Renewable Energy Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Renewable Share']}
                />
                <Line type="monotone" dataKey="renewablePct" stroke="#10B981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Renewable energy as percentage of total generation capacity</p>
          </div>
        </div>
      </div>

      {/* Fuel Price Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FireIcon className="w-6 h-6 mr-2" />
            Fuel Price Projections
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fuelProjection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}/MMBtu`, '']}
                />
                <Line type="monotone" dataKey="naturalGas" stroke="#3B82F6" strokeWidth={2} name="Natural Gas" />
                <Line type="monotone" dataKey="coal" stroke="#8B4513" strokeWidth={2} name="Coal" />
                <Line type="monotone" dataKey="uranium" stroke="#FFD700" strokeWidth={2} name="Uranium" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
              <p className="text-gray-400">Natural Gas</p>
              <p className="text-white font-medium">
                ${currentFuelPrices?.fuel_prices?.natural_gas?.toFixed(2) || '4.00'}/MMBtu
              </p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-yellow-600 rounded-full mx-auto mb-1"></div>
              <p className="text-gray-400">Coal</p>
              <p className="text-white font-medium">
                ${currentFuelPrices?.fuel_prices?.coal?.toFixed(2) || '2.50'}/MMBtu
              </p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-yellow-400 rounded-full mx-auto mb-1"></div>
              <p className="text-gray-400">Uranium</p>
              <p className="text-white font-medium">
                ${currentFuelPrices?.fuel_prices?.uranium?.toFixed(2) || '0.75'}/MMBtu
              </p>
            </div>
          </div>
        </div>

        {/* Market Concentration */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Market Structure Analysis</h3>
          
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Competitive Landscape</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Market Participants:</span>
                  <span className="text-white font-medium">3 Utilities</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Market Concentration:</span>
                  <span className="text-green-400 font-medium">Competitive</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Price Volatility:</span>
                  <span className="text-yellow-400 font-medium">Moderate</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Technology Mix Trends</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Thermal Generation:</span>
                  <span className="text-red-400">Declining</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Renewable Energy:</span>
                  <span className="text-green-400">Growing</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Energy Storage:</span>
                  <span className="text-blue-400">Emerging</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Nuclear Power:</span>
                  <span className="text-yellow-400">Stable</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Investment Climate</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Capital Requirements:</span>
                  <span className="text-white">High</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Regulatory Environment:</span>
                  <span className="text-green-400">Supportive</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Technology Risk:</span>
                  <span className="text-yellow-400">Moderate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Recommendations */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-purple-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-purple-300">Strategic Market Intelligence</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">📈 Market Opportunities</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Renewable energy investments showing strong returns</li>
                  <li>• Peak period pricing premiums create value opportunities</li>
                  <li>• Energy storage becoming economically viable</li>
                  <li>• Carbon pricing favoring clean technologies</li>
                  <li>• Grid modernization driving new service markets</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">⚠️ Market Risks</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Fuel price volatility affecting thermal plant margins</li>
                  <li>• Regulatory changes impacting investment returns</li>
                  <li>• Technology disruption accelerating asset obsolescence</li>
                  <li>• Weather variability affecting renewable output</li>
                  <li>• Competitive pressure on wholesale prices</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">🎯 Strategic Recommendations</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Diversify portfolio across multiple technologies</li>
                  <li>• Invest in flexible generation and storage</li>
                  <li>• Hedge fuel price exposure for thermal assets</li>
                  <li>• Monitor regulatory developments closely</li>
                  <li>• Consider strategic partnerships for large projects</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-purple-900/30 rounded-lg">
              <h4 className="font-medium text-white mb-2">💡 Key Market Insights</h4>
              <p className="text-sm text-gray-300">
                The electricity market is undergoing a fundamental transformation driven by decarbonization policies, 
                technological innovation, and changing consumer demands. Utilities that adapt quickly to these trends 
                while maintaining financial discipline will be best positioned for long-term success. Focus on building 
                a resilient, flexible portfolio that can thrive in multiple future scenarios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketAnalysis;