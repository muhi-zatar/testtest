import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ChartBarIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { TrendingUpIcon } from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

const UtilityDashboard: React.FC = () => {
  const { utilityId } = useParams<{ utilityId: string }>();
  const { currentSession } = useGameStore();

  // Get utility financial data
  const { data: financials, isLoading: financialsLoading } = useQuery({
    queryKey: ['utility-financials', utilityId, currentSession?.id],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getUserFinancials(utilityId, currentSession.id) : null,
    enabled: !!utilityId && !!currentSession,
    refetchInterval: 10000,
  });

  // Get utility plants
  const { data: plants, isLoading: plantsLoading } = useQuery({
    queryKey: ['utility-plants', utilityId, currentSession?.id],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getPowerPlants(currentSession.id, utilityId) : null,
    enabled: !!utilityId && !!currentSession,
  });

  // Get market results for performance tracking
  const { data: marketResults } = useQuery({
    queryKey: ['market-results', currentSession?.id],
    queryFn: () => currentSession ? 
      ElectricityMarketAPI.getMarketResults(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Get fuel prices for current year
  const { data: fuelPrices } = useQuery({
    queryKey: ['fuel-prices', currentSession?.id, currentSession?.current_year],
    queryFn: () => currentSession ? 
      ElectricityMarketAPI.getFuelPrices(currentSession.id, currentSession.current_year) : null,
    enabled: !!currentSession,
  });

  // Calculate portfolio metrics
  const operatingPlants = plants?.filter(plant => plant.status === 'operating') || [];
  const underConstructionPlants = plants?.filter(plant => plant.status === 'under_construction') || [];
  const totalCapacity = operatingPlants.reduce((sum, plant) => sum + plant.capacity_mw, 0);
  const totalInvestment = plants?.reduce((sum, plant) => sum + plant.capital_cost_total, 0) || 0;

  // Portfolio mix for pie chart
  const portfolioMix = operatingPlants.reduce((acc, plant) => {
    const type = plant.plant_type;
    acc[type] = (acc[type] || 0) + plant.capacity_mw;
    return acc;
  }, {} as Record<string, number>);

  const portfolioChartData = Object.entries(portfolioMix).map(([type, capacity]) => ({
    name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: capacity,
    percentage: ((capacity / totalCapacity) * 100).toFixed(1)
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  // Financial health indicators
  const debtToEquity = financials ? (financials.debt / financials.equity) : 0;
  const utilizationRate = operatingPlants.length > 0 ? 
    (operatingPlants.reduce((sum, plant) => sum + plant.capacity_factor, 0) / operatingPlants.length) : 0;

  // Recent performance data (mock for now)
  const performanceData = [
    { month: 'Jan', revenue: 45, costs: 32, profit: 13 },
    { month: 'Feb', revenue: 52, costs: 35, profit: 17 },
    { month: 'Mar', revenue: 48, costs: 33, profit: 15 },
    { month: 'Apr', revenue: 61, costs: 38, profit: 23 },
    { month: 'May', revenue: 55, costs: 36, profit: 19 },
    { month: 'Jun', revenue: 67, costs: 41, profit: 26 },
  ];

  if (financialsLoading || plantsLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading utility dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-400 mb-2">No Active Game Session</h3>
          <p className="text-gray-300">Please wait for the instructor to start a game session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {utilityId?.replace('_', ' ').toUpperCase()} Dashboard
          </h1>
          <p className="text-gray-400">
            Year {currentSession.current_year} • Strategic Portfolio Management
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-400">Market State</p>
          <p className="text-lg font-semibold text-green-400 capitalize">
            {currentSession.state.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available Budget</p>
              <p className="text-2xl font-bold text-white">
                ${financials ? (financials.budget / 1e9).toFixed(1) : '0'}B
              </p>
              <p className="text-sm text-green-400">Investment Capacity</p>
            </div>
            <div className="bg-green-600 p-3 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Capacity</p>
              <p className="text-2xl font-bold text-white">
                {totalCapacity.toLocaleString()} MW
              </p>
              <p className="text-sm text-blue-400">{operatingPlants.length} plants</p>
            </div>
            <div className="bg-blue-600 p-3 rounded-lg">
              <BoltIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Portfolio Value</p>
              <p className="text-2xl font-bold text-white">
                ${(totalInvestment / 1e9).toFixed(1)}B
              </p>
              <p className="text-sm text-purple-400">Total Investment</p>
            </div>
            <div className="bg-purple-600 p-3 rounded-lg">
              <BuildingOffice2Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Debt/Equity Ratio</p>
              <p className="text-2xl font-bold text-white">
                {debtToEquity.toFixed(2)}
              </p>
              <p className={`text-sm ${debtToEquity > 2 ? 'text-red-400' : debtToEquity > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                {debtToEquity < 1 ? 'Conservative' : debtToEquity < 2 ? 'Moderate' : 'Aggressive'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${debtToEquity > 2 ? 'bg-red-600' : debtToEquity > 1 ? 'bg-yellow-600' : 'bg-green-600'}`}>
              <TrendingUpIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Mix */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Generation Portfolio Mix</h3>
          {portfolioChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {portfolioChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toLocaleString()} MW`, 'Capacity']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No operating plants yet</p>
                <p className="text-sm">Start investing to build your portfolio</p>
              </div>
            </div>
          )}
        </div>

        {/* Financial Performance */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Financial Performance Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value}M`, '']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="costs" stroke="#EF4444" strokeWidth={2} name="Costs" />
                <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Plant Status and Market Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plant Status */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Plant Portfolio Status</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-900/20 rounded-lg border border-green-700">
              <div>
                <h4 className="font-medium text-green-300">Operating Plants</h4>
                <p className="text-sm text-gray-400">Generating revenue</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{operatingPlants.length}</p>
                <p className="text-sm text-green-400">{totalCapacity.toLocaleString()} MW</p>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-700">
              <div>
                <h4 className="font-medium text-yellow-300">Under Construction</h4>
                <p className="text-sm text-gray-400">Future capacity</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{underConstructionPlants.length}</p>
                <p className="text-sm text-yellow-400">
                  {underConstructionPlants.reduce((sum, plant) => sum + plant.capacity_mw, 0).toLocaleString()} MW
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-blue-900/20 rounded-lg border border-blue-700">
              <div>
                <h4 className="font-medium text-blue-300">Average Capacity Factor</h4>
                <p className="text-sm text-gray-400">Portfolio efficiency</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{(utilizationRate * 100).toFixed(1)}%</p>
                <p className="text-sm text-blue-400">Utilization rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Market Information */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Market Information</h3>
          
          <div className="space-y-4">
            {/* Current Year Info */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Current Market Conditions</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Year:</span>
                  <span className="text-white ml-2 font-medium">{currentSession.current_year}</span>
                </div>
                <div>
                  <span className="text-gray-400">Carbon Price:</span>
                  <span className="text-white ml-2">${currentSession.carbon_price_per_ton}/ton</span>
                </div>
                <div>
                  <span className="text-gray-400">Market State:</span>
                  <span className="text-green-400 ml-2 capitalize">{currentSession.state.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-400">Simulation:</span>
                  <span className="text-white ml-2">{currentSession.start_year}-{currentSession.end_year}</span>
                </div>
              </div>
            </div>

            {/* Fuel Prices */}
            {fuelPrices && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Current Fuel Prices</h4>
                <div className="space-y-2">
                  {Object.entries(fuelPrices.fuel_prices).map(([fuel, price]) => (
                    <div key={fuel} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{fuel.replace('_', ' ')}:</span>
                      <span className="text-white">${(price as number).toFixed(2)}/MMBtu</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h4 className="font-medium text-blue-300 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full text-left text-sm text-gray-300 hover:text-white transition-colors">
                  → View detailed plant portfolio
                </button>
                <button className="w-full text-left text-sm text-gray-300 hover:text-white transition-colors">
                  → Analyze investment opportunities
                </button>
                <button className="w-full text-left text-sm text-gray-300 hover:text-white transition-colors">
                  → Submit market bids
                </button>
                <button className="w-full text-left text-sm text-gray-300 hover:text-white transition-colors">
                  → Review market analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      {financials && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Financial Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Balance Sheet</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Assets:</span>
                  <span className="text-white">${((financials.budget + totalInvestment) / 1e9).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cash & Equivalents:</span>
                  <span className="text-green-400">${(financials.budget / 1e9).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Plant Assets:</span>
                  <span className="text-blue-400">${(totalInvestment / 1e9).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-2">
                  <span className="text-gray-400">Total Debt:</span>
                  <span className="text-red-400">${(financials.debt / 1e9).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Equity:</span>
                  <span className="text-white">${(financials.equity / 1e9).toFixed(1)}B</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Operating Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Annual Fixed Costs:</span>
                  <span className="text-red-400">${(financials.annual_fixed_costs / 1e6).toFixed(0)}M/yr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Capacity Factor:</span>
                  <span className="text-blue-400">{(utilizationRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Plants Operating:</span>
                  <span className="text-white">{operatingPlants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Capacity:</span>
                  <span className="text-white">{totalCapacity.toLocaleString()} MW</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Financial Health</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Credit Rating:</span>
                  <span className={`font-medium ${
                    debtToEquity < 1 ? 'text-green-400' : 
                    debtToEquity < 2 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {debtToEquity < 1 ? 'AAA' : debtToEquity < 1.5 ? 'AA' : debtToEquity < 2 ? 'A' : 'BBB'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Debt/Equity:</span>
                  <span className="text-white">{debtToEquity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Investment Capacity:</span>
                  <span className="text-green-400">
                    ${Math.max(0, (financials.equity * 2 - financials.debt) / 1e9).toFixed(1)}B
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tips and Next Steps */}
      <div className="bg-gradient-to-r from-blue-900/20 to-green-900/20 border border-blue-700 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-300">Strategic Guidance</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">💡 Portfolio Optimization</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Diversify across technologies to manage risk</li>
                  <li>• Balance baseload and peaking capacity</li>
                  <li>• Consider renewable investments for long-term competitiveness</li>
                  <li>• Monitor capacity factors and plant utilization</li>
                  <li>• Plan investments 3-5 years ahead due to construction lead times</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">💰 Financial Management</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Maintain debt-to-equity ratio below 2.0 for good credit rating</li>
                  <li>• Reserve cash for unexpected market opportunities</li>
                  <li>• Consider fuel hedging strategies for thermal plants</li>
                  <li>• Monitor fixed costs relative to revenue generation</li>
                  <li>• Plan for plant retirements and replacement needs</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-900/30 rounded-lg">
              <h4 className="font-medium text-white mb-2">🎯 Current Year Focus</h4>
              <p className="text-sm text-gray-300">
                Year {currentSession.current_year}: {currentSession.state === 'year_planning' ? 
                  'Review market conditions and plan investments for the year ahead.' :
                  currentSession.state === 'bidding_open' ? 
                  'Submit competitive bids for all load periods to maximize revenue.' :
                  currentSession.state === 'market_clearing' ? 
                  'Markets are clearing - results will be available soon.' :
                  'Analyze your performance and prepare strategy for next year.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilityDashboard;