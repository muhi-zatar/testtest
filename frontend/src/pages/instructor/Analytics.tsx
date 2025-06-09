import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChartBarIcon,
  BoltIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  FireIcon,
  CloudIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CogIcon
} from '@heroicons/react/24/outline';
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
  Cell,
  ComposedChart,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

const Analytics: React.FC = () => {
  const { currentSession } = useGameStore();
  
  const [selectedYear, setSelectedYear] = useState<number>(currentSession?.current_year || 2025);
  const [viewMode, setViewMode] = useState<'overview' | 'market' | 'utilities' | 'investments' | 'events'>('overview');

  // Get multi-year analysis data
  const { data: multiYearData, isLoading: multiYearLoading } = useQuery({
    queryKey: ['multi-year-analysis', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getMultiYearAnalysis(currentSession.id) : null,
    enabled: !!currentSession,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Get yearly summary for selected year
  const { data: yearlyData, isLoading: yearlyLoading } = useQuery({
    queryKey: ['yearly-summary', currentSession?.id, selectedYear],
    queryFn: () => currentSession ? ElectricityMarketAPI.getYearlySummary(currentSession.id, selectedYear) : null,
    enabled: !!currentSession && selectedYear <= (currentSession?.current_year || 2025),
  });

  // Get game dashboard for current state
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getGameDashboard(currentSession.id) : null,
    enabled: !!currentSession,
    refetchInterval: 5000,
  });

  // Get all utilities for performance comparison
  const { data: allUtilities } = useQuery({
    queryKey: ['all-utilities', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getAllUtilities(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Process multi-year data for charts
  const processedData = useMemo(() => {
    if (!multiYearData?.yearly_data) return [];
    
    return Object.entries(multiYearData.yearly_data).map(([year, data]: [string, any]) => ({
      year: parseInt(year),
      avgPrice: data.average_price || 50,
      totalEnergy: (data.total_energy || 0) / 1000000, // Convert to TWh
      renewablePct: (data.renewable_penetration || 0) * 100,
      capacityUtil: (data.capacity_utilization || 0) * 100,
      marketValue: ((data.average_price || 50) * (data.total_energy || 0)) / 1000000000, // Billions
      peakPrice: (data.peak_price || data.average_price || 50),
      offPeakPrice: (data.off_peak_price || data.average_price || 50),
      priceVolatility: Math.abs((data.peak_price || 50) - (data.off_peak_price || 50)),
    }));
  }, [multiYearData]);

  // Calculate year-over-year changes
  const calculateChanges = (data: any[], metric: string) => {
    if (data.length < 2) return { change: 0, trend: 'stable' };
    
    const latest = data[data.length - 1][metric];
    const previous = data[data.length - 2][metric];
    const change = ((latest - previous) / previous) * 100;
    
    return {
      change: change,
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
    };
  };

  // Market insights generation
  const generateMarketInsights = () => {
    if (processedData.length < 2) return [];
    
    const insights = [];
    const latest = processedData[processedData.length - 1];
    const priceChange = calculateChanges(processedData, 'avgPrice');
    const renewableChange = calculateChanges(processedData, 'renewablePct');
    const utilizationChange = calculateChanges(processedData, 'capacityUtil');
    
    // Price insights
    if (Math.abs(priceChange.change) > 10) {
      insights.push({
        type: priceChange.trend === 'up' ? 'warning' : 'positive',
        icon: priceChange.trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
        title: `Electricity Prices ${priceChange.trend === 'up' ? 'Rising' : 'Falling'} Rapidly`,
        description: `Average prices ${priceChange.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(priceChange.change).toFixed(1)}% year-over-year`,
        impact: priceChange.trend === 'up' ? 'Higher costs for consumers, increased utility revenues' : 'Lower costs for consumers, pressure on utility margins'
      });
    }
    
    // Renewable insights
    if (renewableChange.change > 5) {
      insights.push({
        type: 'positive',
        icon: ArrowTrendingUpIcon,
        title: 'Renewable Energy Expansion',
        description: `Renewable penetration increased by ${renewableChange.change.toFixed(1)}% to ${latest.renewablePct.toFixed(1)}%`,
        impact: 'Reduced carbon emissions, increased grid flexibility needs'
      });
    }
    
    // Capacity utilization insights
    if (utilizationChange.change < -10) {
      insights.push({
        type: 'warning',
        icon: ExclamationTriangleIcon,
        title: 'Declining Capacity Utilization',
        description: `System utilization dropped by ${Math.abs(utilizationChange.change).toFixed(1)}% to ${latest.capacityUtil.toFixed(1)}%`,
        impact: 'Potential overcapacity, reduced asset efficiency'
      });
    }
    
    // Price volatility insights
    if (latest.priceVolatility > 50) {
      insights.push({
        type: 'warning',
        icon: ExclamationTriangleIcon,
        title: 'High Price Volatility',
        description: `Large spread between peak ($${latest.peakPrice.toFixed(2)}) and off-peak ($${latest.offPeakPrice.toFixed(2)}) prices`,
        impact: 'Market stress, potential supply-demand imbalances'
      });
    }
    
    return insights;
  };

  const marketInsights = generateMarketInsights();

  // Utility performance ranking
  const utilityRankings = useMemo(() => {
    if (!allUtilities) return [];
    
    return allUtilities
      .map((utility: any) => ({
        ...utility,
        efficiency: utility.total_capacity_mw > 0 ? (utility.budget / utility.total_capacity_mw) : 0,
        leverage: utility.equity > 0 ? (utility.debt / utility.equity) : 0,
      }))
      .sort((a: any, b: any) => b.budget - a.budget);
  }, [allUtilities]);

  // Investment trends
  const investmentTrends = useMemo(() => {
    if (!dashboardData?.recent_investments) return [];
    
    const trends: Record<string, number> = {};
    dashboardData.recent_investments.forEach((investment: any) => {
      trends[investment.plant_type] = (trends[investment.plant_type] || 0) + investment.capacity_mw;
    });
    
    return Object.entries(trends).map(([type, capacity]) => ({
      technology: type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      capacity: capacity,
      percentage: (capacity / Object.values(trends).reduce((sum: number, val: number) => sum + val, 0)) * 100
    }));
  }, [dashboardData]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  if (multiYearLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading market analytics...</p>
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
          <p className="text-gray-300">Create or select a game session to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Analytics</h1>
          <p className="text-gray-400">
            Comprehensive analysis of market dynamics and utility performance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="overview">Market Overview</option>
            <option value="market">Market Dynamics</option>
            <option value="utilities">Utility Performance</option>
            <option value="investments">Investment Analysis</option>
            <option value="events">Market Events</option>
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {Array.from({ length: (currentSession.current_year - currentSession.start_year) + 1 }, (_, i) => {
              const year = currentSession.start_year + i;
              return (
                <option key={year} value={year}>
                  Year {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Current Year</p>
              <p className="text-2xl font-bold text-white">{currentSession.current_year}</p>
              <p className="text-sm text-blue-400 capitalize">{currentSession.state.replace('_', ' ')}</p>
            </div>
            <div className="bg-blue-600 p-3 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Market Value</p>
              <p className="text-2xl font-bold text-white">
                ${processedData.length > 0 ? processedData[processedData.length - 1]?.marketValue?.toFixed(1) : '0'}B
              </p>
              <p className="text-sm text-green-400">Annual revenue</p>
            </div>
            <div className="bg-green-600 p-3 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Utilities</p>
              <p className="text-2xl font-bold text-white">{utilityRankings.length}</p>
              <p className="text-sm text-purple-400">Competing</p>
            </div>
            <div className="bg-purple-600 p-3 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Renewable Share</p>
              <p className="text-2xl font-bold text-white">
                {processedData.length > 0 ? processedData[processedData.length - 1]?.renewablePct?.toFixed(1) : '0'}%
              </p>
              <p className="text-sm text-yellow-400">Of capacity</p>
            </div>
            <div className="bg-yellow-600 p-3 rounded-lg">
              <BoltIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Market Insights */}
      {marketInsights.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <InformationCircleIcon className="w-5 h-5 mr-2" />
            Market Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketInsights.map((insight, index) => (
              <div key={index} className={`rounded-lg p-4 border ${
                insight.type === 'positive' ? 'bg-green-900/20 border-green-700' :
                insight.type === 'warning' ? 'bg-yellow-900/20 border-yellow-700' :
                'bg-red-900/20 border-red-700'
              }`}>
                <div className="flex items-start space-x-3">
                  <insight.icon className={`w-5 h-5 mt-1 ${
                    insight.type === 'positive' ? 'text-green-400' :
                    insight.type === 'warning' ? 'text-yellow-400' :
                    'text-red-400'
                  }`} />
                  <div>
                    <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-300 mb-2">{insight.description}</p>
                    <p className="text-xs text-gray-400">{insight.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Analytics Content */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Trends */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Electricity Price Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="avgPrice" stroke="#3B82F6" strokeWidth={2} name="Average Price ($/MWh)" />
                  <Line type="monotone" dataKey="peakPrice" stroke="#EF4444" strokeWidth={2} name="Peak Price ($/MWh)" />
                  <Line type="monotone" dataKey="offPeakPrice" stroke="#10B981" strokeWidth={2} name="Off-Peak Price ($/MWh)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Market Volume and Renewable Growth */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Energy Market Evolution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" stroke="#9CA3AF" />
                  <YAxis yAxisId="left" stroke="#9CA3AF" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalEnergy" fill="#10B981" name="Total Energy (TWh)" />
                  <Line yAxisId="right" type="monotone" dataKey="renewablePct" stroke="#F59E0B" strokeWidth={3} name="Renewable % (Right Axis)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Capacity Utilization */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">System Efficiency</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Capacity Utilization']}
                  />
                  <Area type="monotone" dataKey="capacityUtil" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Market Value Growth */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Market Value Growth</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(1)}B`, 'Market Value']}
                  />
                  <Area type="monotone" dataKey="marketValue" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'utilities' && (
        <div className="space-y-6">
          {/* Utility Rankings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Utility Performance Rankings</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 text-gray-400">Rank</th>
                    <th className="text-left py-3 text-gray-400">Utility</th>
                    <th className="text-left py-3 text-gray-400">Budget</th>
                    <th className="text-left py-3 text-gray-400">Capacity</th>
                    <th className="text-left py-3 text-gray-400">Plants</th>
                    <th className="text-left py-3 text-gray-400">D/E Ratio</th>
                    <th className="text-left py-3 text-gray-400">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {utilityRankings.map((utility: any, index: number) => (
                    <tr key={utility.id} className="border-b border-gray-700/50">
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-600 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-gray-600 text-gray-300'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="font-medium text-white">{utility.username}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-green-400 font-medium">
                          ${(utility.budget / 1e9).toFixed(1)}B
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-blue-400">
                          {utility.total_capacity_mw?.toLocaleString() || '0'} MW
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-purple-400">{utility.plant_count || 0}</span>
                      </td>
                      <td className="py-3">
                        <span className={`font-medium ${
                          utility.leverage < 1 ? 'text-green-400' :
                          utility.leverage < 2 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {utility.leverage.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-gray-300">
                          ${utility.efficiency > 0 ? (utility.efficiency / 1000).toFixed(1) : '0'}k/MW
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Utility Performance Comparison */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Portfolio Comparison</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={utilityRankings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="total_capacity_mw" stroke="#9CA3AF" name="Capacity (MW)" />
                  <YAxis dataKey="budget" stroke="#9CA3AF" name="Budget ($B)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'budget' ? `$${(value / 1e9).toFixed(1)}B` : `${value?.toLocaleString()} MW`,
                      name === 'budget' ? 'Budget' : 'Capacity'
                    ]}
                  />
                  <Scatter dataKey="budget" fill="#3B82F6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'investments' && (
        <div className="space-y-6">
          {/* Investment Trends */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Technology Investment Trends</h3>
            {investmentTrends.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={investmentTrends}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="capacity"
                        label={({ technology, percentage }) => `${technology}: ${percentage.toFixed(1)}%`}
                      >
                        {investmentTrends.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value.toLocaleString()} MW`, 'Capacity']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-white">Recent Investment Activity</h4>
                  {investmentTrends.map((trend, index) => (
                    <div key={trend.technology} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-white font-medium">{trend.technology}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{trend.capacity.toLocaleString()} MW</p>
                        <p className="text-gray-400 text-sm">{trend.percentage.toFixed(1)}% of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent investment data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'events' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Market Events Timeline</h3>
          {multiYearData?.market_events?.length > 0 ? (
            <div className="space-y-4">
              {multiYearData.market_events.map((event: any, index: number) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-700 rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    event.type === 'plant_outage' ? 'bg-red-900' :
                    event.type === 'fuel_shock' ? 'bg-orange-900' :
                    event.type === 'weather_event' ? 'bg-blue-900' :
                    'bg-purple-900'
                  }`}>
                    {event.type === 'plant_outage' ? <BoltIcon className="w-5 h-5 text-white" /> :
                     event.type === 'fuel_shock' ? <FireIcon className="w-5 h-5 text-white" /> :
                     event.type === 'weather_event' ? <CloudIcon className="w-5 h-5 text-white" /> :
                     <CogIcon className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{event.description}</h4>
                      <span className="text-sm text-gray-400">Year {currentSession.current_year}</span>
                    </div>
                    <p className="text-sm text-gray-300">{event.impact}</p>
                    <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                      event.severity === 'high' ? 'bg-red-900 text-red-300' :
                      event.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-blue-900 text-blue-300'
                    }`}>
                      {event.severity?.toUpperCase() || 'MEDIUM'} IMPACT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No market events recorded yet</p>
              <p className="text-sm mt-2">Events will appear here as they are triggered during the simulation</p>
            </div>
          )}
        </div>
      )}

      {/* Year-by-Year Summary */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Year-by-Year Market Summary</h3>
        
        {processedData.length > 0 ? (
          <div className="space-y-4">
            {processedData.map((yearData) => (
              <div 
                key={yearData.year} 
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  yearData.year === selectedYear 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => setSelectedYear(yearData.year)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-white">Year {yearData.year}</h4>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">
                      {yearData.year === currentSession.current_year ? 'Current Year' :
                       yearData.year < currentSession.current_year ? 'Completed' : 'Future'}
                    </span>
                    {yearData.year <= currentSession.current_year && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Avg Price</p>
                    <p className="text-white font-medium">${yearData.avgPrice.toFixed(2)}/MWh</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Energy</p>
                    <p className="text-blue-400 font-medium">{yearData.totalEnergy.toFixed(1)} TWh</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Market Value</p>
                    <p className="text-green-400 font-medium">${yearData.marketValue.toFixed(1)}B</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Renewables</p>
                    <p className="text-yellow-400 font-medium">{yearData.renewablePct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Utilization</p>
                    <p className="text-purple-400 font-medium">{yearData.capacityUtil.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Price Spread</p>
                    <p className="text-orange-400 font-medium">${yearData.priceVolatility.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No market data available yet</p>
            <p className="text-sm mt-2">Data will appear as the simulation progresses</p>
          </div>
        )}
      </div>

      {/* Educational Insights */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-300">Educational Insights</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">📊 Market Dynamics</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Price volatility indicates supply-demand balance</li>
                  <li>• Renewable penetration affects grid stability</li>
                  <li>• Capacity utilization shows system efficiency</li>
                  <li>• Market concentration impacts competition</li>
                  <li>• Investment patterns reveal strategic priorities</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">🏢 Utility Strategy</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Portfolio diversification reduces risk</li>
                  <li>• Technology mix affects competitiveness</li>
                  <li>• Financial leverage impacts flexibility</li>
                  <li>• Market timing influences returns</li>
                  <li>• Operational efficiency drives profitability</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">🌍 Policy Impact</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Carbon pricing drives clean investment</li>
                  <li>• Regulatory changes affect asset values</li>
                  <li>• Market design influences outcomes</li>
                  <li>• Environmental policies shape portfolios</li>
                  <li>• Economic incentives guide decisions</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-900/30 rounded-lg">
              <h4 className="font-medium text-white mb-2">💡 Key Learning Objectives</h4>
              <p className="text-sm text-gray-300">
                This analytics dashboard demonstrates how electricity markets evolve over time, showing the complex 
                interactions between technology, economics, policy, and competition. Students can observe how their 
                strategic decisions impact not just their own utility's performance, but the entire market ecosystem. 
                The year-by-year progression reveals long-term trends and the consequences of investment choices made 
                years earlier.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;