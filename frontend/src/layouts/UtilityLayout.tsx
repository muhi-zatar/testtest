import React from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { 
  HomeIcon, 
  BuildingOffice2Icon, 
  CurrencyDollarIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '../store/gameStore';
import ElectricityMarketAPI from '../api/client';

const UtilityLayout: React.FC = () => {
  const location = useLocation();
  const { utilityId } = useParams<{ utilityId: string }>();
  const { currentSession } = useGameStore();

  // Get fresh session data with frequent updates
  const { data: sessionData } = useQuery({
    queryKey: ['game-session', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getGameSession(currentSession.id) : null,
    enabled: !!currentSession,
    refetchInterval: 5000, // Check every 5 seconds for state changes
    onSuccess: (data) => {
      if (data && data.state !== currentSession?.state) {
        console.log('🔄 Game state updated in layout:', data.state);
        setCurrentSession(data);
      }
    }
  });

  // Use the most up-to-date session data
  const activeSession = sessionData || currentSession;

  // Get utility financial data
  const { data: financials } = useQuery({
    queryKey: ['utility-financials', utilityId, activeSession?.id],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getUserFinancials(utilityId, currentSession.id) : null,
    enabled: !!utilityId && !!activeSession,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get utility plants
  const { data: plants } = useQuery({
    queryKey: ['utility-plants', utilityId, activeSession?.id],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getPowerPlants(currentSession.id, utilityId) : null,
    enabled: !!utilityId && !!activeSession,
    refetchInterval: 5000, // Add refetch interval
  });

  const navigation = [
    { name: 'Dashboard', href: `/utility/${utilityId}/dashboard`, icon: HomeIcon },
    { name: 'Portfolio', href: `/utility/${utilityId}/portfolio`, icon: BuildingOffice2Icon },
    { name: 'Investment', href: `/utility/${utilityId}/investment`, icon: CurrencyDollarIcon },
    { name: 'Bidding', href: `/utility/${utilityId}/bidding`, icon: DocumentTextIcon },
    { name: 'Market Analysis', href: `/utility/${utilityId}/analysis`, icon: ChartBarIcon },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Calculate portfolio metrics
  const operatingPlants = plants?.filter(plant => plant.status === 'operating') || [];
  const totalCapacity = operatingPlants.reduce((sum, plant) => sum + plant.capacity_mw, 0);
  const totalInvestment = plants?.reduce((sum, plant) => sum + plant.capital_cost_total, 0) || 0;

  // Calculate debt-to-equity ratio
  const debtToEquity = financials ? (financials.debt / financials.equity) : 0;

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-72 bg-gray-800 border-r border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-green-600 p-2 rounded-lg">
              <BuildingOffice2Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {utilityId?.replace('_', ' ').toUpperCase()}
              </h1>
              <p className="text-sm text-gray-400">Utility Company</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        {financials && (
          <div className="p-4 mx-4 mt-4 bg-green-900/20 rounded-lg border border-green-700/50">
            <h3 className="text-sm font-medium text-green-300 mb-3">Financial Position</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Available Budget:</span>
                <span className="text-white font-medium">
                  ${(financials.budget / 1e9).toFixed(1)}B
                </span>
              </div>
              
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Total Debt:</span>
                <span className="text-red-400">
                  ${(financials.debt / 1e9).toFixed(1)}B
                </span>
              </div>
              
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Equity:</span>
                <span className="text-blue-400">
                  ${(financials.equity / 1e9).toFixed(1)}B
                </span>
              </div>
              
              <div className="flex justify-between text-xs pt-2 border-t border-gray-600">
                <span className="text-gray-400">D/E Ratio:</span>
                <span className={`font-medium ${debtToEquity > 2 ? 'text-red-400' : debtToEquity > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {debtToEquity.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Summary */}
        <div className="p-4 mx-4 mt-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
          <h3 className="text-sm font-medium text-blue-300 mb-3">Portfolio Overview</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total Capacity:</span>
              <span className="text-white font-medium">
                {totalCapacity.toLocaleString()} MW
              </span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Operating Plants:</span>
              <span className="text-green-400">
                {operatingPlants.length}
              </span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total Investment:</span>
              <span className="text-blue-400">
                ${(totalInvestment / 1e9).toFixed(1)}B
              </span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Annual Fixed Costs:</span>
              <span className="text-yellow-400">
                ${((financials?.annual_fixed_costs || 0) / 1e6).toFixed(0)}M/yr
              </span>
            </div>
          </div>
        </div>

        {/* Game Session Info */}
        {activeSession && (
          <div className="p-4 mx-4 mt-4 bg-purple-900/20 rounded-lg border border-purple-700/50">
            <h3 className="text-sm font-medium text-purple-300 mb-2">Current Session</h3>
            <p className="text-white font-medium text-sm mb-2">{activeSession.name}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Current Year:</span>
                <span className="text-white font-medium">{activeSession.current_year}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Simulation:</span>
                <span className="text-white">{activeSession.start_year}-{activeSession.end_year}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Market State:</span>
                <span className={`capitalize ${
                  activeSession.state === 'bidding_open' ? 'text-green-400' :
                  activeSession.state === 'year_planning' ? 'text-blue-400' :
                  activeSession.state === 'market_clearing' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {activeSession.state.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Carbon Price:</span>
                <span className="text-yellow-400">${activeSession.carbon_price_per_ton}/ton</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-6 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-green-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 w-72 p-4 border-t border-gray-700">
          <Link
            to="/"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
            Exit to Role Selection
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {navigation.find(item => isActive(item.href))?.name || 'Utility Dashboard'}
              </h2>
              <p className="text-sm text-gray-400">
                {utilityId?.replace('_', ' ').toUpperCase()} • Strategic Portfolio Management
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* ROI Indicator */}
              {financials && totalInvestment > 0 && (
                <div className="bg-gray-700 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-300">Portfolio ROI:</span>
                    <span className="text-sm text-green-400 font-medium">
                      {((financials.budget / totalInvestment - 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
              
              {/* Credit Rating */}
              <div className="bg-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">Credit Rating:</span>
                  <span className={`text-sm font-medium ${
                    debtToEquity < 1 ? 'text-green-400' : 
                    debtToEquity < 2 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {debtToEquity < 1 ? 'AAA' : debtToEquity < 1.5 ? 'AA' : debtToEquity < 2 ? 'A' : 'BBB'}
                  </span>
                </div>
              </div>
              
              {/* Capacity Factor */}
              {totalCapacity > 0 && (
                <div className="bg-gray-700 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-300">Avg. CF:</span>
                    <span className="text-sm text-blue-400 font-medium">
                      {operatingPlants.length > 0 ? 
                        (operatingPlants.reduce((sum, plant) => sum + plant.capacity_factor, 0) / operatingPlants.length * 100).toFixed(1)
                        : '0'
                      }%
                    </span>
                  </div>
                </div>
              )}
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default UtilityLayout;