import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  BuildingOffice2Icon,
  BoltIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  FireIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

interface PlantPerformance {
  plant_id: string;
  annual_generation: number;
  capacity_factor: number;
  revenue: number;
  operating_costs: number;
  profit_margin: number;
}

const Portfolio: React.FC = () => {
  const { utilityId } = useParams<{ utilityId: string }>();
  const { currentSession } = useGameStore();
  
  const [selectedPlant, setSelectedPlant] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'performance' | 'maintenance'>('overview');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Get utility plants
  const { data: plants, isLoading: plantsLoading } = useQuery({
    queryKey: ['utility-plants', utilityId, currentSession?.id],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getPowerPlants(currentSession.id, utilityId) : null,
    enabled: !!utilityId && !!currentSession,
    refetchInterval: 5000, // Add refetch interval
  });

  // Get utility financial data
  const { data: financials } = useQuery({
    queryKey: ['utility-financials', utilityId, currentSession?.id],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getUserFinancials(utilityId, currentSession.id) : null,
    enabled: !!utilityId && !!currentSession,
    refetchInterval: 5000,
  });

  // Get fuel prices for cost calculations
  const { data: fuelPrices } = useQuery({
    queryKey: ['fuel-prices', currentSession?.id, currentSession?.current_year],
    queryFn: () => currentSession ? 
      ElectricityMarketAPI.getFuelPrices(currentSession.id, currentSession.current_year) : null,
    enabled: !!currentSession,
  });

  // Filter plants based on status
  const filteredPlants = plants?.filter(plant => {
    if (filterStatus === 'all') return true;
    return plant.status === filterStatus;
  }) || [];

  // Calculate portfolio metrics
  const portfolioMetrics = {
    totalCapacity: plants?.reduce((sum, plant) => sum + plant.capacity_mw, 0) || 0,
    operatingCapacity: plants?.filter(p => p.status === 'operating').reduce((sum, plant) => sum + plant.capacity_mw, 0) || 0,
    underConstruction: plants?.filter(p => p.status === 'under_construction').length || 0,
    avgCapacityFactor: plants?.length ? plants.reduce((sum, plant) => sum + plant.capacity_factor, 0) / plants.length : 0,
    totalInvestment: plants?.reduce((sum, plant) => sum + plant.capital_cost_total, 0) || 0,
    annualFixedCosts: plants?.reduce((sum, plant) => sum + plant.fixed_om_annual, 0) || 0,
  };

  // Technology mix for pie chart
  const technologyMix = plants?.reduce((acc, plant) => {
    const type = plant.plant_type;
    acc[type] = (acc[type] || 0) + plant.capacity_mw;
    return acc;
  }, {} as Record<string, number>) || {};

  const technologyChartData = Object.entries(technologyMix).map(([type, capacity]) => ({
    name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: capacity,
    percentage: ((capacity / portfolioMetrics.totalCapacity) * 100).toFixed(1)
  }));

  // Plant performance data (mock for demonstration)
  const plantPerformanceData = plants?.map(plant => ({
    name: plant.name.substring(0, 15) + (plant.name.length > 15 ? '...' : ''),
    capacity: plant.capacity_mw,
    capacityFactor: plant.capacity_factor * 100,
    revenue: (plant.capacity_mw * plant.capacity_factor * 8760 * 55) / 1000000, // Estimated revenue in millions
    costs: plant.fixed_om_annual / 1000000, // Fixed costs in millions
  })) || [];

  // Status colors and icons
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'operating':
        return { color: 'text-green-400', bgColor: 'bg-green-900/20', icon: CheckCircleIcon, label: 'Operating' };
      case 'under_construction':
        return { color: 'text-yellow-400', bgColor: 'bg-yellow-900/20', icon: CogIcon, label: 'Under Construction' };
      case 'maintenance':
        return { color: 'text-orange-400', bgColor: 'bg-orange-900/20', icon: WrenchScrewdriverIcon, label: 'Maintenance' };
      case 'retired':
        return { color: 'text-gray-400', bgColor: 'bg-gray-700/20', icon: ExclamationTriangleIcon, label: 'Retired' };
      default:
        return { color: 'text-blue-400', bgColor: 'bg-blue-900/20', icon: ClockIcon, label: 'Planned' };
    }
  };

  const getTechnologyIcon = (plantType: string) => {
    if (plantType.includes('gas') || plantType === 'coal') return '🔥';
    if (plantType === 'nuclear') return '⚛️';
    if (plantType === 'solar') return '☀️';
    if (plantType.includes('wind')) return '💨';
    if (plantType === 'battery') return '🔋';
    if (plantType === 'hydro') return '💧';
    return '⚡';
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  if (plantsLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portfolio data...</p>
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
          <h1 className="text-2xl font-bold text-white">Plant Portfolio</h1>
          <p className="text-gray-400">
            Comprehensive portfolio management and performance analytics
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="overview">Portfolio Overview</option>
            <option value="performance">Performance Analysis</option>
            <option value="maintenance">Maintenance Schedule</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Plants</option>
            <option value="operating">Operating</option>
            <option value="under_construction">Under Construction</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Capacity</p>
              <p className="text-2xl font-bold text-white">
                {portfolioMetrics.totalCapacity.toLocaleString()} MW
              </p>
              <p className="text-sm text-blue-400">{plants?.length || 0} plants</p>
            </div>
            <div className="bg-blue-600 p-3 rounded-lg">
              <BoltIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Operating Capacity</p>
              <p className="text-2xl font-bold text-white">
                {portfolioMetrics.operatingCapacity.toLocaleString()} MW
              </p>
              <p className="text-sm text-green-400">
                {((portfolioMetrics.operatingCapacity / portfolioMetrics.totalCapacity) * 100).toFixed(1)}% online
              </p>
            </div>
            <div className="bg-green-600 p-3 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Portfolio Value</p>
              <p className="text-2xl font-bold text-white">
                ${(portfolioMetrics.totalInvestment / 1e9).toFixed(1)}B
              </p>
              <p className="text-sm text-purple-400">Total investment</p>
            </div>
            <div className="bg-purple-600 p-3 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Capacity Factor</p>
              <p className="text-2xl font-bold text-white">
                {(portfolioMetrics.avgCapacityFactor * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-yellow-400">Portfolio efficiency</p>
            </div>
            <div className="bg-yellow-600 p-3 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Based on View Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Technology Mix Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Technology Mix</h3>
            {technologyChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={technologyChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {technologyChartData.map((entry, index) => (
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
                  <p>No plants in portfolio</p>
                </div>
              </div>
            )}
          </div>

          {/* Plant Status Summary */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Plant Status Summary</h3>
            <div className="space-y-4">
              {['operating', 'under_construction', 'maintenance', 'retired'].map(status => {
                const statusPlants = plants?.filter(p => p.status === status) || [];
                const statusInfo = getStatusInfo(status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={status} className={`flex items-center justify-between p-3 rounded-lg ${statusInfo.bgColor}`}>
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                      <div>
                        <h4 className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</h4>
                        <p className="text-sm text-gray-400">
                          {statusPlants.reduce((sum, plant) => sum + plant.capacity_mw, 0).toLocaleString()} MW
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{statusPlants.length}</p>
                      <p className="text-sm text-gray-400">plants</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'performance' && (
        <div className="space-y-6">
          {/* Performance Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Plant Performance Comparison</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={plantPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="capacityFactor" fill="#10B981" name="Capacity Factor %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial Performance */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Financial Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Annual Revenue (Est.)</h4>
                <p className="text-2xl font-bold text-green-400">
                  ${plantPerformanceData.reduce((sum, plant) => sum + plant.revenue, 0).toFixed(0)}M
                </p>
                <p className="text-sm text-gray-400">Based on $55/MWh average</p>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Annual Fixed Costs</h4>
                <p className="text-2xl font-bold text-red-400">
                  ${(portfolioMetrics.annualFixedCosts / 1e6).toFixed(0)}M
                </p>
                <p className="text-sm text-gray-400">Operations & maintenance</p>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Gross Margin (Est.)</h4>
                <p className="text-2xl font-bold text-blue-400">
                  ${(plantPerformanceData.reduce((sum, plant) => sum + plant.revenue, 0) - portfolioMetrics.annualFixedCosts / 1e6).toFixed(0)}M
                </p>
                <p className="text-sm text-gray-400">Before fuel & variable costs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'maintenance' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Maintenance Schedule
          </h3>
          
          <div className="space-y-4">
            {plants?.map(plant => {
              const maintenanceYears = plant.maintenance_years ? JSON.parse(plant.maintenance_years) : [];
              const nextMaintenance = maintenanceYears.find((year: number) => year >= (currentSession?.current_year || 2025));
              
              return (
                <div key={plant.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getTechnologyIcon(plant.plant_type)}</span>
                      <div>
                        <h4 className="font-medium text-white">{plant.name}</h4>
                        <p className="text-sm text-gray-400">
                          {plant.capacity_mw} MW • {plant.plant_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {plant.status === 'maintenance' ? (
                        <span className="px-3 py-1 bg-orange-900 text-orange-300 rounded-full text-sm">
                          Currently in Maintenance
                        </span>
                      ) : nextMaintenance ? (
                        <div>
                          <p className="text-white font-medium">Next Maintenance: {nextMaintenance}</p>
                          <p className="text-sm text-gray-400">
                            {nextMaintenance - (currentSession?.current_year || 2025)} years away
                          </p>
                        </div>
                      ) : (
                        <span className="text-green-400">No scheduled maintenance</span>
                      )}
                    </div>
                  </div>
                  
                  {maintenanceYears.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-sm text-gray-400 mb-2">Maintenance Schedule:</p>
                      <div className="flex flex-wrap gap-2">
                        {maintenanceYears.map((year: number) => (
                          <span 
                            key={year}
                            className={`px-2 py-1 rounded text-xs ${
                              year === currentSession?.current_year ? 'bg-orange-900 text-orange-300' :
                              year < (currentSession?.current_year || 2025) ? 'bg-gray-600 text-gray-400' :
                              'bg-blue-900 text-blue-300'
                            }`}
                          >
                            {year}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Plant List */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Plant Details</h3>
        
        {filteredPlants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 text-gray-400">Plant</th>
                  <th className="text-left py-3 text-gray-400">Technology</th>
                  <th className="text-left py-3 text-gray-400">Capacity</th>
                  <th className="text-left py-3 text-gray-400">Status</th>
                  <th className="text-left py-3 text-gray-400">Capacity Factor</th>
                  <th className="text-left py-3 text-gray-400">Commissioned</th>
                  <th className="text-left py-3 text-gray-400">Investment</th>
                  <th className="text-left py-3 text-gray-400">Annual O&M</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlants.map((plant) => {
                  const statusInfo = getStatusInfo(plant.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr 
                      key={plant.id} 
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedPlant(selectedPlant === plant.id ? '' : plant.id)}
                    >
                      <td className="py-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getTechnologyIcon(plant.plant_type)}</span>
                          <div>
                            <p className="font-medium text-white">{plant.name}</p>
                            {plant.fuel_type && (
                              <p className="text-xs text-gray-400 capitalize">
                                Fuel: {plant.fuel_type.replace('_', ' ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3">
                        <span className="text-gray-300 capitalize">
                          {plant.plant_type.replace('_', ' ')}
                        </span>
                      </td>
                      
                      <td className="py-3">
                        <span className="text-white font-medium">
                          {plant.capacity_mw.toLocaleString()} MW
                        </span>
                      </td>
                      
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          <span className={statusInfo.color}>{statusInfo.label}</span>
                        </div>
                      </td>
                      
                      <td className="py-3">
                        <span className="text-blue-400 font-medium">
                          {(plant.capacity_factor * 100).toFixed(1)}%
                        </span>
                      </td>
                      
                      <td className="py-3">
                        <span className="text-gray-300">{plant.commissioning_year}</span>
                      </td>
                      
                      <td className="py-3">
                        <span className="text-purple-400">
                          ${(plant.capital_cost_total / 1e9).toFixed(2)}B
                        </span>
                      </td>
                      
                      <td className="py-3">
                        <span className="text-red-400">
                          ${(plant.fixed_om_annual / 1e6).toFixed(1)}M/yr
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No plants found matching the current filter.</p>
            <p className="text-sm mt-2">Try changing the status filter or invest in new capacity.</p>
          </div>
        )}
      </div>

      {/* Selected Plant Details */}
      {selectedPlant && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          {(() => {
            const plant = plants?.find(p => p.id === selectedPlant);
            if (!plant) return null;
            
            const statusInfo = getStatusInfo(plant.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{getTechnologyIcon(plant.plant_type)}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{plant.name}</h3>
                      <p className="text-gray-400 capitalize">{plant.plant_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                    <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Technical Specs</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Capacity:</span>
                        <span className="text-white">{plant.capacity_mw.toLocaleString()} MW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Capacity Factor:</span>
                        <span className="text-blue-400">{(plant.capacity_factor * 100).toFixed(1)}%</span>
                      </div>
                      {plant.heat_rate && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Heat Rate:</span>
                          <span className="text-white">{plant.heat_rate.toLocaleString()} BTU/kWh</span>
                        </div>
                      )}
                      {plant.fuel_type && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fuel Type:</span>
                          <span className="text-orange-400 capitalize">{plant.fuel_type.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Construction Start:</span>
                        <span className="text-white">{plant.construction_start_year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Commissioned:</span>
                        <span className="text-green-400">{plant.commissioning_year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Retirement:</span>
                        <span className="text-red-400">{plant.retirement_year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Remaining Life:</span>
                        <span className="text-white">
                          {Math.max(0, plant.retirement_year - (currentSession?.current_year || 2025))} years
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Financial</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Capital Cost:</span>
                        <span className="text-purple-400">${(plant.capital_cost_total / 1e9).toFixed(2)}B</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fixed O&M:</span>
                        <span className="text-red-400">${(plant.fixed_om_annual / 1e6).toFixed(1)}M/yr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Variable O&M:</span>
                        <span className="text-yellow-400">${plant.variable_om_per_mwh.toFixed(2)}/MWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Est. Annual Gen:</span>
                        <span className="text-blue-400">
                          {(plant.capacity_mw * plant.capacity_factor * 8760 / 1000).toFixed(0)} GWh
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Est. Revenue:</span>
                        <span className="text-green-400">
                          ${((plant.capacity_mw * plant.capacity_factor * 8760 * 55) / 1e6).toFixed(0)}M/yr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Gross Margin:</span>
                        <span className="text-blue-400">
                          ${(((plant.capacity_mw * plant.capacity_factor * 8760 * 55) - plant.fixed_om_annual) / 1e6).toFixed(0)}M/yr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Utilization:</span>
                        <span className="text-white">{(plant.capacity_factor * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ROI (Simple):</span>
                        <span className="text-purple-400">
                          {(((plant.capacity_mw * plant.capacity_factor * 8760 * 55) - plant.fixed_om_annual) / plant.capital_cost_total * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Portfolio Insights */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-700 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-green-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-green-300">Portfolio Insights & Recommendations</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">🎯 Optimization Opportunities</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Monitor capacity factors for underperforming assets</li>
                  <li>• Plan maintenance during low-demand periods</li>
                  <li>• Consider retirement of aging, inefficient plants</li>
                  <li>• Evaluate fuel hedging for thermal plants</li>
                  <li>• Assess renewable energy expansion opportunities</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">⚠️ Risk Management</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Diversify technology mix to reduce concentration risk</li>
                  <li>• Monitor regulatory changes affecting plant values</li>
                  <li>• Plan for carbon pricing impact on thermal assets</li>
                  <li>• Maintain adequate reserve capacity margins</li>
                  <li>• Consider weather impact on renewable generation</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">📈 Strategic Planning</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Plan investments 3-5 years ahead of need</li>
                  <li>• Balance baseload and peaking capacity</li>
                  <li>• Consider energy storage for grid flexibility</li>
                  <li>• Monitor competitor capacity additions</li>
                  <li>• Align portfolio with decarbonization goals</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-900/30 rounded-lg">
              <h4 className="font-medium text-white mb-2">💡 Current Portfolio Assessment</h4>
              <p className="text-sm text-gray-300">
                Your portfolio shows {portfolioMetrics.totalCapacity.toLocaleString()} MW of total capacity with an average capacity factor of {(portfolioMetrics.avgCapacityFactor * 100).toFixed(1)}%. 
                {portfolioMetrics.avgCapacityFactor > 0.6 ? 
                  'This indicates a well-utilized, efficient portfolio.' :
                  portfolioMetrics.avgCapacityFactor > 0.4 ?
                  'Consider optimizing plant operations to improve utilization.' :
                  'Low capacity factors suggest need for portfolio optimization or market strategy review.'
                }
                {portfolioMetrics.underConstruction > 0 && 
                  ` You have ${portfolioMetrics.underConstruction} plants under construction, which will add future capacity.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;