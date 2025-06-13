import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  StopIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  FireIcon,
  CloudIcon,
  CogIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

interface MarketEvent {
  id: string;
  type: 'plant_outage' | 'fuel_shock' | 'weather_event' | 'regulation_change' | 'demand_surge';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  duration_years: number;
  impact_description: string;
  affected_utilities?: string[];
  custom_parameters?: Record<string, any>;
}

interface GamePhase {
  id: string;
  name: string;
  description: string;
  duration_estimate: string;
  required_actions: string[];
}

const MarketControl: React.FC = () => {
  const { currentSession, setCurrentSession } = useGameStore();
  const queryClient = useQueryClient();

  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>([]);

  // Game phases for the current year
  const gamePhases: GamePhase[] = [
    {
      id: 'planning',
      name: 'Year Planning',
      description: 'Utilities plan investments and review market conditions',
      duration_estimate: '5-10 minutes',
      required_actions: ['Review demand forecasts', 'Plan new investments', 'Analyze competitors']
    },
    {
      id: 'bidding',
      name: 'Annual Bidding',
      description: 'Submit bids for all three load periods',
      duration_estimate: '10-15 minutes',
      required_actions: ['Calculate marginal costs', 'Submit plant bids', 'Optimize portfolio strategy']
    },
    {
      id: 'clearing',
      name: 'Market Clearing',
      description: 'Markets clear and results are calculated',
      duration_estimate: '1-2 minutes',
      required_actions: ['Process all bids', 'Determine clearing prices', 'Calculate revenues']
    },
    {
      id: 'analysis',
      name: 'Results Analysis',
      description: 'Review performance and plan for next year',
      duration_estimate: '5-10 minutes',
      required_actions: ['Analyze financial results', 'Review market outcomes', 'Plan future strategy']
    }
  ];

  // Predefined market events
  const availableEvents: MarketEvent[] = [
    {
      id: 'plant_outage_major',
      type: 'plant_outage',
      title: 'Major Plant Outage',
      description: 'A large power plant experiences an unexpected outage',
      severity: 'high',
      duration_years: 1,
      impact_description: 'Reduced capacity available for bidding, higher market prices',
      custom_parameters: { capacity_reduction: 0.15, price_impact: 0.20 }
    },
    {
      id: 'gas_price_spike',
      type: 'fuel_shock',
      title: 'Natural Gas Price Spike',
      description: 'Supply disruption causes natural gas prices to surge 40%',
      severity: 'high',
      duration_years: 2,
      impact_description: 'Higher operating costs for gas plants, margin compression',
      custom_parameters: { gas_price_multiplier: 1.4, duration_months: 18 }
    },
    {
      id: 'drought_hydro',
      type: 'weather_event',
      title: 'Severe Drought',
      description: 'Extended drought reduces hydroelectric generation',
      severity: 'medium',
      duration_years: 1,
      impact_description: 'Reduced renewable output, increased thermal generation',
      custom_parameters: { hydro_reduction: 0.6, renewable_cf_impact: -0.1 }
    },
    {
      id: 'carbon_tax_increase',
      type: 'regulation_change',
      title: 'Carbon Tax Increase',
      description: 'Government increases carbon price to $100/ton CO₂',
      severity: 'medium',
      duration_years: 5,
      impact_description: 'Higher costs for fossil fuel plants, renewable advantage',
      custom_parameters: { new_carbon_price: 100 }
    },
    {
      id: 'heatwave_demand',
      type: 'demand_surge',
      title: 'Extended Heatwave',
      description: 'Record temperatures drive air conditioning demand surge',
      severity: 'medium',
      duration_years: 1,
      impact_description: 'Peak demand increases 15%, higher summer prices',
      custom_parameters: { peak_demand_increase: 0.15, seasonal_impact: 'summer' }
    },
    {
      id: 'renewable_mandate',
      type: 'regulation_change',
      title: 'Renewable Portfolio Standard',
      description: 'New law requires 50% renewable generation by 2030',
      severity: 'high',
      duration_years: 10,
      impact_description: 'Forces renewable investment, potential stranded assets',
      custom_parameters: { renewable_target: 0.5, compliance_year: 2030 }
    }
  ];

  // Get game dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getGameDashboard(currentSession.id) : null,
    enabled: !!currentSession,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get multi-year analysis for trend monitoring
  const { data: analysisData } = useQuery({
    queryKey: ['multi-year-analysis', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getMultiYearAnalysis(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Market control mutations
  const startYearPlanningMutation = useMutation({
    mutationFn: (year: number) => currentSession ? 
      ElectricityMarketAPI.startYearPlanning(currentSession.id, year) : Promise.reject(),
    onSuccess: () => {
      toast.success('Year planning phase started');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to start year planning')
  });

  const openBiddingMutation = useMutation({
    mutationFn: (year: number) => currentSession ? 
      ElectricityMarketAPI.openAnnualBidding(currentSession.id, year) : Promise.reject(),
    onSuccess: () => {
      toast.success('Bidding phase opened');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to open bidding')
  });

  const clearMarketsMutation = useMutation({
    mutationFn: (year: number) => currentSession ? 
      ElectricityMarketAPI.clearAnnualMarkets(currentSession.id, year) : Promise.reject(),
    onSuccess: () => {
      toast.success('Markets cleared successfully');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to clear markets')
  });

  const completeYearMutation = useMutation({
    mutationFn: (year: number) => currentSession ? 
      ElectricityMarketAPI.completeYear(currentSession.id, year) : Promise.reject(),
    onSuccess: (data) => {
      toast.success(`Year ${data.year} completed`);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (currentSession) {
        setCurrentSession({ ...currentSession, current_year: data.year + 1 });
      }
    },
    onError: () => toast.error('Failed to complete year')
  });

  const advanceYearMutation = useMutation({
    mutationFn: () => currentSession ? ElectricityMarketAPI.advanceYear(currentSession.id) : Promise.reject(),
    onSuccess: () => {
      // Instead of advancing year, start planning for next year
      const nextYear = currentSession.current_year + 1;
      if (nextYear <= currentSession.end_year) {
        startYearPlanningMutation.mutate(nextYear);
      } else {
        toast.success('Simulation completed!');
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to advance year')
  });

  // Handle triggering market events
  const triggerEvent = (event: MarketEvent) => {
    // This would integrate with the backend to trigger the event
    toast.success(`Triggered: ${event.title}`);
    setShowEventModal(false);
    setSelectedEvent(null);
    
    // Simulate event impact
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // Get current phase based on game state
  const getCurrentPhase = () => {
    if (!currentSession) return null;
    
    switch (currentSession.state) {
      case 'year_planning': return gamePhases.find(p => p.id === 'planning');
      case 'bidding_open': return gamePhases.find(p => p.id === 'bidding');
      case 'market_clearing': return gamePhases.find(p => p.id === 'clearing');
      case 'year_complete': return gamePhases.find(p => p.id === 'analysis');
      default: return gamePhases[0];
    }
  };

  const currentPhase = getCurrentPhase();

  // Simulate utility participation data
  const participationData = [
    { utility: 'Utility 1', bids_submitted: 3, plants_operating: 3, status: 'active' },
    { utility: 'Utility 2', bids_submitted: 3, plants_operating: 3, status: 'active' },
    { utility: 'Utility 3', bids_submitted: 2, plants_operating: 3, status: 'needs_attention' },
  ];

  // Market performance metrics
  const performanceData = analysisData?.yearly_data ? 
    Object.entries(analysisData.yearly_data).map(([year, data]: [string, any]) => ({
      year: parseInt(year),
      avg_price: data.average_price,
      total_energy: data.total_energy / 1000000, // TWh
      renewable_pct: data.renewable_penetration * 100,
      capacity_util: data.capacity_utilization * 100
    })) : [];

  if (!currentSession) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-400 mb-2">No Active Game Session</h3>
          <p className="text-gray-300 mb-4">
            Select or create a game session to begin market control operations.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Go to Game Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Session Info */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Control Center</h1>
          <p className="text-gray-400">Orchestrate the electricity market simulation</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Auto-advance toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-300 text-sm">Auto-advance phases</span>
          </label>
          
          {/* Game status */}
          <div className="bg-gray-700 rounded-lg px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-300">Session Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Session Overview */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">{currentSession.name}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Year:</span>
                <span className="text-white font-medium">{currentSession.current_year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Simulation:</span>
                <span className="text-white">{currentSession.start_year}-{currentSession.end_year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Progress:</span>
                <span className="text-white">
                  {Math.round(((currentSession.current_year - currentSession.start_year) / 
                              (currentSession.end_year - currentSession.start_year)) * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-white mb-3">Current Phase</h4>
            {currentPhase && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-blue-400 font-medium">{currentPhase.name}</span>
                </div>
                <p className="text-gray-300 text-sm mb-2">{currentPhase.description}</p>
                <p className="text-gray-400 text-xs">Est. {currentPhase.duration_estimate}</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium text-white mb-3">Market Stats</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Capacity:</span>
                <span className="text-white">
                  {dashboardData?.market_stats?.total_capacity_mw?.toLocaleString() || '0'} MW
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Utilities:</span>
                <span className="text-white">{participationData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Carbon Price:</span>
                <span className="text-white">${currentSession.carbon_price_per_ton}/ton</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-white mb-3">Year Progress</h4>
            <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${((currentSession.current_year - currentSession.start_year) / 
                          (currentSession.end_year - currentSession.start_year)) * 100}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{currentSession.start_year}</span>
              <span>{currentSession.end_year}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Flow Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase Controls */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <PlayIcon className="w-5 h-5 mr-2" />
            Phase Controls
          </h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => startYearPlanningMutation.mutate(currentSession.current_year)}
                disabled={startYearPlanningMutation.isPending}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <CogIcon className="w-4 h-4" />
                <span>Start Planning</span>
              </button>
              
              <button
                onClick={() => openBiddingMutation.mutate(currentSession.current_year)}
                disabled={openBiddingMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>Open Bidding</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => clearMarketsMutation.mutate(currentSession.current_year)}
                disabled={clearMarketsMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <BoltIcon className="w-4 h-4" />
                <span>Clear Markets</span>
              </button>
              
              <button
                onClick={() => completeYearMutation.mutate(currentSession.current_year)}
                disabled={completeYearMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>Complete Year</span>
              </button>
            </div>
            
            <button
              onClick={() => advanceYearMutation.mutate()}
              disabled={advanceYearMutation.isPending}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 font-medium"
            >
              <ForwardIcon className="w-5 h-5" />
              <span>Advance to {currentSession.current_year + 1}</span>
            </button>
          </div>

          {/* Phase Progress */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="font-medium text-white mb-3">Phase Checklist</h4>
            {currentPhase && (
              <div className="space-y-2">
                {currentPhase.required_actions.map((action, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300 text-sm">{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Utility Participation Monitor */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BuildingOffice2Icon className="w-5 h-5 mr-2" />
            Utility Participation
          </h3>
          
          <div className="space-y-3">
            {participationData.map((utility) => (
              <div key={utility.utility} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">{utility.utility}</h4>
                  <p className="text-sm text-gray-400">
                    {utility.plants_operating} plants • {utility.bids_submitted} bids submitted
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    utility.status === 'active' ? 'bg-green-900 text-green-300' :
                    utility.status === 'needs_attention' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {utility.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {utility.status === 'needs_attention' && (
                    <p className="text-xs text-yellow-400 mt-1">Missing bids</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <InformationCircleIcon className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 font-medium text-sm">Participation Tips</span>
            </div>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Monitor utility progress during bidding phases</li>
              <li>• Send reminders for incomplete submissions</li>
              <li>• Use auto-advance only when all utilities are ready</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Market Events & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Events */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              Market Events
            </h3>
            <button
              onClick={() => setShowEventModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Trigger Event
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {availableEvents.slice(0, 4).map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  event.severity === 'high' ? 'border-red-600 hover:bg-red-900/20' :
                  event.severity === 'medium' ? 'border-yellow-600 hover:bg-yellow-900/20' :
                  'border-blue-600 hover:bg-blue-900/20'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {event.type === 'plant_outage' ? <BoltIcon className="w-4 h-4" /> :
                   event.type === 'fuel_shock' ? <FireIcon className="w-4 h-4" /> :
                   event.type === 'weather_event' ? <CloudIcon className="w-4 h-4" /> :
                   <CogIcon className="w-4 h-4" />}
                  <span className="text-white font-medium text-sm">{event.title}</span>
                </div>
                <p className="text-gray-300 text-xs">{event.impact_description}</p>
              </button>
            ))}
          </div>

          <div className="bg-gray-700 rounded-lg p-3">
            <h4 className="font-medium text-white mb-2 text-sm">Recent Events</h4>
            {analysisData?.market_events?.length > 0 ? (
              <div className="space-y-2">
                {analysisData.market_events.slice(-3).map((event: any, index: number) => (
                  <div key={index} className="text-xs">
                    <span className="text-gray-400">Year {currentSession.current_year}:</span>
                    <span className="text-white ml-2">{event.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs">No events triggered this session</p>
            )}
          </div>
        </div>

        {/* Performance Dashboard */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Market Performance
          </h3>
          
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
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
                <Line type="monotone" dataKey="avg_price" stroke="#3B82F6" strokeWidth={2} name="Avg Price ($/MWh)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Current Avg Price:</p>
              <p className="text-white font-medium">
                ${performanceData.length > 0 ? performanceData[performanceData.length - 1]?.avg_price?.toFixed(2) : '0'}/MWh
              </p>
            </div>
            <div>
              <p className="text-gray-400">Renewable %:</p>
              <p className="text-white font-medium">
                {performanceData.length > 0 ? performanceData[performanceData.length - 1]?.renewable_pct?.toFixed(1) : '0'}%
              </p>
            </div>
            <div>
              <p className="text-gray-400">Capacity Utilization:</p>
              <p className="text-white font-medium">
                {performanceData.length > 0 ? performanceData[performanceData.length - 1]?.capacity_util?.toFixed(1) : '0'}%
              </p>
            </div>
            <div>
              <p className="text-gray-400">Total Energy:</p>
              <p className="text-white font-medium">
                {performanceData.length > 0 ? performanceData[performanceData.length - 1]?.total_energy?.toFixed(1) : '0'} TWh
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {selectedEvent ? 'Trigger Market Event' : 'Select Market Event'}
              </h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            {!selectedEvent ? (
              <div>
                <p className="text-gray-300 mb-4">Choose a market event to trigger:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {availableEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        event.severity === 'high' ? 'border-red-600 hover:bg-red-900/20' :
                        event.severity === 'medium' ? 'border-yellow-600 hover:bg-yellow-900/20' :
                        'border-blue-600 hover:bg-blue-900/20'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        {event.type === 'plant_outage' ? <BoltIcon className="w-5 h-5 text-red-400" /> :
                         event.type === 'fuel_shock' ? <FireIcon className="w-5 h-5 text-orange-400" /> :
                         event.type === 'weather_event' ? <CloudIcon className="w-5 h-5 text-blue-400" /> :
                         event.type === 'regulation_change' ? <CogIcon className="w-5 h-5 text-purple-400" /> :
                         <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />}
                        <span className="text-white font-medium">{event.title}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.severity === 'high' ? 'bg-red-900 text-red-300' :
                          event.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-blue-900 text-blue-300'
                        }`}>
                          {event.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{event.description}</p>
                      <p className="text-gray-400 text-xs">{event.impact_description}</p>
                      <p className="text-gray-500 text-xs mt-1">Duration: {event.duration_years} year(s)</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    {selectedEvent.type === 'plant_outage' ? <BoltIcon className="w-6 h-6 text-red-400" /> :
                     selectedEvent.type === 'fuel_shock' ? <FireIcon className="w-6 h-6 text-orange-400" /> :
                     selectedEvent.type === 'weather_event' ? <CloudIcon className="w-6 h-6 text-blue-400" /> :
                     selectedEvent.type === 'regulation_change' ? <CogIcon className="w-6 h-6 text-purple-400" /> :
                     <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />}
                    <div>
                      <h4 className="text-lg font-semibold text-white">{selectedEvent.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        selectedEvent.severity === 'high' ? 'bg-red-900 text-red-300' :
                        selectedEvent.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-blue-900 text-blue-300'
                      }`}>
                        {selectedEvent.severity.toUpperCase()} IMPACT
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-3">{selectedEvent.description}</p>
                  <p className="text-gray-400 text-sm mb-3">{selectedEvent.impact_description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white ml-2">{selectedEvent.duration_years} year(s)</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white ml-2 capitalize">{selectedEvent.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Event Parameters */}
                {selectedEvent.custom_parameters && (
                  <div className="bg-gray-700 rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-white mb-3">Event Parameters</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(selectedEvent.custom_parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                          <span className="text-white">
                            {typeof value === 'number' ? 
                              (key.includes('multiplier') || key.includes('reduction') ? 
                                `${((value as number - 1) * 100).toFixed(0)}%` :
                                key.includes('price') ? `${value}` :
                                value
                              ) : 
                              String(value)
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affected Utilities Selection */}
                <div className="mb-4">
                  <h5 className="font-medium text-white mb-3">Affected Utilities</h5>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedUtilities.length === participationData.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUtilities(participationData.map(u => u.utility));
                          } else {
                            setSelectedUtilities([]);
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">All Utilities</span>
                    </label>
                    {participationData.map((utility) => (
                      <label key={utility.utility} className="flex items-center space-x-2 ml-6">
                        <input
                          type="checkbox"
                          checked={selectedUtilities.includes(utility.utility)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUtilities([...selectedUtilities, utility.utility]);
                            } else {
                              setSelectedUtilities(selectedUtilities.filter(u => u !== utility.utility));
                            }
                          }}
                          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-300">{utility.utility}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Educational Impact */}
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-4">
                  <h5 className="font-medium text-blue-300 mb-2">Educational Impact</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {selectedEvent.type === 'plant_outage' && (
                      <>
                        <li>• Demonstrates importance of reserve capacity</li>
                        <li>• Shows how supply shortages affect market prices</li>
                        <li>• Highlights grid reliability considerations</li>
                      </>
                    )}
                    {selectedEvent.type === 'fuel_shock' && (
                      <>
                        <li>• Illustrates fuel cost impact on plant economics</li>
                        <li>• Shows merit order changes with cost shifts</li>
                        <li>• Demonstrates hedging strategy importance</li>
                      </>
                    )}
                    {selectedEvent.type === 'weather_event' && (
                      <>
                        <li>• Shows renewable energy intermittency challenges</li>
                        <li>• Demonstrates weather impact on grid operations</li>
                        <li>• Highlights need for backup generation</li>
                      </>
                    )}
                    {selectedEvent.type === 'regulation_change' && (
                      <>
                        <li>• Illustrates policy impact on investment decisions</li>
                        <li>• Shows regulatory risk in long-term planning</li>
                        <li>• Demonstrates compliance cost considerations</li>
                      </>
                    )}
                    {selectedEvent.type === 'demand_surge' && (
                      <>
                        <li>• Shows demand elasticity and price response</li>
                        <li>• Illustrates peak capacity value</li>
                        <li>• Demonstrates load forecasting challenges</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                  >
                    Back to Selection
                  </button>
                  <button
                    onClick={() => triggerEvent(selectedEvent)}
                    className={`flex-1 text-white px-4 py-2 rounded-lg font-medium ${
                      selectedEvent.severity === 'high' ? 'bg-red-600 hover:bg-red-700' :
                      selectedEvent.severity === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Trigger Event
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions & Tips */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-300">Market Orchestration Guide</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">🎮 Game Flow Management</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Start each year with planning phase (5-10 min)</li>
                  <li>• Open bidding when all utilities are ready</li>
                  <li>• Clear markets once all bids are submitted</li>
                  <li>• Allow time for results analysis (5-10 min)</li>
                  <li>• Use auto-advance for experienced players</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">⚡ Event Timing</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Trigger events during planning phases</li>
                  <li>• Space major events 2-3 years apart</li>
                  <li>• Use moderate events for learning</li>
                  <li>• Save high-impact events for advanced players</li>
                  <li>• Explain educational value after triggering</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">📊 Monitoring Tips</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Watch for utilities falling behind</li>
                  <li>• Monitor market concentration levels</li>
                  <li>• Track renewable penetration trends</li>
                  <li>• Observe price volatility patterns</li>
                  <li>• Document key learning moments</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-900/30 rounded-lg">
              <h4 className="font-medium text-white mb-2">💡 Pro Tips for Instructors</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Use the participation monitor to ensure all students are engaged</li>
                <li>• Trigger events to create teachable moments about market dynamics</li>
                <li>• Allow discussion time after major market events or surprising results</li>
                <li>• Use performance charts to facilitate comparative analysis discussions</li>
                <li>• Save session data for post-game analysis and reflection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketControl;