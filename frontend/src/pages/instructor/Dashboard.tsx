import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlayIcon, 
  PauseIcon, 
  ForwardIcon,
  ChartBarIcon,
  BoltIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

const InstructorDashboard: React.FC = () => {
  const { currentSession, setCurrentSession } = useGameStore();
  const queryClient = useQueryClient();
  
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Get game dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getGameDashboard(currentSession.id) : null,
    enabled: !!currentSession,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get all utilities for accurate count
  const { data: allUtilities } = useQuery({
    queryKey: ['all-utilities', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getAllUtilities(currentSession.id) : null,
    enabled: !!currentSession,
    refetchInterval: 5000,
  });

  // Get multi-year analysis
  const { data: analysisData } = useQuery({
    queryKey: ['multi-year-analysis', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getMultiYearAnalysis(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Get market results
  const { data: marketResults } = useQuery({
    queryKey: ['market-results', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getMarketResults(currentSession.id) : null,
    enabled: !!currentSession,
    refetchInterval: 3000, // More frequent refresh for market results
  });

  // Advance year mutation
  const advanceYearMutation = useMutation({
    mutationFn: () => currentSession ? ElectricityMarketAPI.advanceYear(currentSession.id) : Promise.reject(),
    onSuccess: (data) => {
      toast.success(`Advanced to year ${data.current_year}`);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (currentSession) {
        setCurrentSession({ ...currentSession, current_year: data.current_year, state: data.state });
      }
    },
    onError: () => {
      toast.error('Failed to advance year');
    }
  });

  // Start year planning mutation
  const startYearMutation = useMutation({
    mutationFn: (year: number) => currentSession ? ElectricityMarketAPI.startYearPlanning(currentSession.id, year) : Promise.reject(),
    onSuccess: () => {
      toast.success('Year planning phase started');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // Clear markets mutation
  const clearMarketsMutation = useMutation({
    mutationFn: (year: number) => currentSession ? ElectricityMarketAPI.clearAnnualMarkets(currentSession.id, year) : Promise.reject(),
    onSuccess: (data) => {
      if (data.status === 'no_bids_submitted') {
        toast.warning(`No bids submitted for year ${data.year}. Year completed without market activity.`);
      } else {
        toast.success('Markets cleared successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['market-results'] });
      queryClient.invalidateQueries({ queryKey: ['multi-year-analysis'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to clear markets';
      toast.error(errorMessage);
    }
  });

  const handleAdvanceYear = () => {
    if (currentSession) {
      advanceYearMutation.mutate();
    }
  };

  const handleStartYearPlanning = () => {
    if (currentSession) {
      startYearMutation.mutate(currentSession.current_year);
    }
  };

  const handleClearMarkets = () => {
    if (currentSession) {
      clearMarketsMutation.mutate(currentSession.current_year);
    }
  };

  // Sample data for charts
  const priceData = analysisData?.yearly_data ? 
    Object.entries(analysisData.yearly_data).map(([year, data]: [string, any]) => ({
      year: parseInt(year),
      price: data.average_price,
      energy: data.total_energy / 1000000, // Convert to TWh
      renewables: data.renewable_penetration * 100
    })) : [];

  // Calculate actual capacity mix from utilities
  const capacityMixData = allUtilities ? (() => {
    const mix: Record<string, number> = {};
    let totalCapacity = 0;
    
    allUtilities.forEach((utility: any) => {
      // This is simplified - in a real implementation, you'd get plant data
      // For now, we'll use estimated mix based on utility data
      const capacity = utility.total_capacity_mw || 0;
      totalCapacity += capacity;
      
      // Distribute capacity across technologies (simplified)
      mix['Coal'] = (mix['Coal'] || 0) + capacity * 0.3;
      mix['Natural Gas'] = (mix['Natural Gas'] || 0) + capacity * 0.35;
      mix['Nuclear'] = (mix['Nuclear'] || 0) + capacity * 0.2;
      mix['Renewables'] = (mix['Renewables'] || 0) + capacity * 0.15;
    });
    
    return Object.entries(mix).map(([name, value]) => ({
      name,
      value: Math.round(value),
      color: name === 'Coal' ? '#8B4513' : 
             name === 'Natural Gas' ? '#4169E1' : 
             name === 'Nuclear' ? '#FFD700' : '#32CD32'
    }));
  })() : [];

  if (!currentSession) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-400 mb-2">No Active Game Session</h3>
          <p className="text-gray-300 mb-4">Create or select a game session to begin managing the electricity market simulation.</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Go to Game Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Dashboard</h1>
          <p className="text-gray-400">Monitor and control the electricity market simulation</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleStartYearPlanning}
            disabled={startYearMutation.isPending}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <PlayIcon className="w-4 h-4" />
            <span>Start Year Planning</span>
          </button>
          
          <button
            onClick={handleClearMarkets}
            disabled={clearMarketsMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <BoltIcon className="w-4 h-4" />
            <span>Clear Markets</span>
          </button>
          
          <button
            onClick={handleAdvanceYear}
            disabled={advanceYearMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <ForwardIcon className="w-4 h-4" />
            <span>Advance Year</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Current Year</p>
              <p className="text-2xl font-bold text-white">{currentSession.current_year}</p>
              <p className="text-sm text-blue-400">{currentSession.state.replace('_', ' ')}</p>
            </div>
            <div className="bg-blue-600 p-3 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Capacity</p>
              <p className="text-2xl font-bold text-white">
                {allUtilities ? 
                  allUtilities.reduce((sum: number, utility: any) => sum + (utility.total_capacity_mw || 0), 0).toLocaleString() 
                  : '0'} MW
              </p>
              <p className="text-sm text-green-400">
                System capacity
              </p>
            </div>
            <div className="bg-green-600 p-3 rounded-lg">
              <BoltIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Utilities</p>
              <p className="text-2xl font-bold text-white">
                {allUtilities ? allUtilities.length : 0}
              </p>
              <p className="text-sm text-gray-400">Companies</p>
            </div>
            <div className="bg-purple-600 p-3 rounded-lg">
              <BuildingOfficeIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Carbon Price</p>
              <p className="text-2xl font-bold text-white">
                ${currentSession.carbon_price_per_ton}/ton
              </p>
              <p className="text-sm text-yellow-400">CO₂</p>
            </div>
            <div className="bg-yellow-600 p-3 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Trends */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Market Price Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData}>
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
                <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capacity Mix */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Generation Capacity Mix</h3>
          <div className="h-64 flex items-center justify-center">
            {capacityMixData.length > 0 ? (
              <ResponsiveContainer width="100%\" height=\"100%">
                <PieChart>
                  <Pie
                    data={capacityMixData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value} MW`}
                  >
                    {capacityMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-400">
                <BoltIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No capacity data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Market Results */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Market Results</h3>
        {marketResults && marketResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400">Year</th>
                  <th className="text-left py-2 text-gray-400">Period</th>
                  <th className="text-left py-2 text-gray-400">Clearing Price</th>
                  <th className="text-left py-2 text-gray-400">Quantity</th>
                  <th className="text-left py-2 text-gray-400">Total Energy</th>
                  <th className="text-left py-2 text-gray-400">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {marketResults.slice(-10).map((result: any, index: number) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-2 text-white">{result.year}</td>
                    <td className="py-2 text-gray-300 capitalize">
                      {result.period.replace('_', ' ')}
                    </td>
                    <td className="py-2 text-green-400">${result.clearing_price.toFixed(2)}/MWh</td>
                    <td className="py-2 text-blue-400">{result.cleared_quantity.toLocaleString()} MW</td>
                    <td className="py-2 text-purple-400">{(result.total_energy / 1000).toFixed(1)} GWh</td>
                    <td className="py-2 text-gray-400">
                      {new Date(result.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No market results yet. Start the simulation to see trading activity.</p>
          </div>
        )}
      </div>

      {/* Utility Status */}
      {allUtilities && allUtilities.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Utility Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUtilities.map((utility: any) => (
              <div key={utility.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white">{utility.username}</h4>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Budget:</span>
                    <span className="text-green-400">${(utility.budget / 1e9).toFixed(1)}B</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Capacity:</span>
                    <span className="text-blue-400">{(utility.total_capacity_mw || 0).toLocaleString()} MW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plants:</span>
                    <span className="text-purple-400">{utility.plant_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Demand Forecast */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Current Year Demand Forecast</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300">Off-Peak Hours</h4>
            <p className="text-xl font-bold text-white mt-1">1,200 MW</p>
            <p className="text-sm text-gray-400">5,000 hours</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300">Shoulder Hours</h4>
            <p className="text-xl font-bold text-white mt-1">1,800 MW</p>
            <p className="text-sm text-gray-400">2,500 hours</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300">Peak Hours</h4>
            <p className="text-xl font-bold text-white mt-1">2,400 MW</p>
            <p className="text-sm text-gray-400">1,260 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;