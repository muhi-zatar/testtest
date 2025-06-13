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
  CurrencyDollarIcon,
  AdjustmentsHorizontalIcon
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
  const [showYearConfigModal, setShowYearConfigModal] = useState<boolean>(false);
  const [yearConfig, setYearConfig] = useState({
    carbonPrice: currentSession?.carbon_price_per_ton || 50,
    fuelPrices: {
      coal: 2.50,
      natural_gas: 4.00,
      uranium: 0.75
    },
    demandProfile: {
      off_peak_demand: 1200,
      shoulder_demand: 1800,
      peak_demand: 2400,
      demand_growth_rate: 0.02
    },
    renewableAvailability: {
      solar: 1.0,
      wind: 1.0
    }
  });

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

  // Get fuel prices for current year
  const { data: fuelPrices } = useQuery({
    queryKey: ['fuel-prices', activeSession?.id, activeSession?.current_year],
    queryFn: () => currentSession ? 
      ElectricityMarketAPI.getFuelPrices(currentSession.id, currentSession.current_year) : null,
    enabled: !!activeSession,
    onSuccess: (data) => {
      if (data && data.fuel_prices) {
        setYearConfig(prev => ({
          ...prev,
          fuelPrices: {
            coal: data.fuel_prices.coal || 2.50,
            natural_gas: data.fuel_prices.natural_gas || 4.00,
            uranium: data.fuel_prices.uranium || 0.75
          }
        }));
      }
    }
  });
  
  // Get renewable availability for current year
  const { data: renewableAvailability } = useQuery({
    queryKey: ['renewable-availability', activeSession?.id, activeSession?.current_year],
    queryFn: () => currentSession ? 
      ElectricityMarketAPI.getRenewableAvailability(currentSession.id, currentSession.current_year) : null,
    enabled: !!activeSession,
    onSuccess: (data) => {
      if (data && data.renewable_availability) {
        setYearConfig(prev => ({
          ...prev,
          renewableAvailability: {
            solar: data.renewable_availability.solar_availability || 1.0,
            wind: data.renewable_availability.wind_availability || 1.0
          }
        }));
      }
    }
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

  // Update carbon price mutation
  const updateCarbonPriceMutation = useMutation({
    mutationFn: (price: number) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.updateCarbonPrice(currentSession.id, price);
    },
    onSuccess: () => {
      toast.success('Carbon price updated successfully');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['game-session'] });
    },
    onError: () => toast.error('Failed to update carbon price')
  });

  // Update fuel prices mutation
  const updateFuelPricesMutation = useMutation({
    mutationFn: (data: { year: number, fuelPrices: any }) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.updateFuelPrices(
        currentSession.id, 
        data.year, 
        data.fuelPrices
      );
    },
    onSuccess: () => {
      toast.success('Fuel prices updated successfully');
      queryClient.invalidateQueries({ queryKey: ['fuel-prices'] });
    },
    onError: () => toast.error('Failed to update fuel prices')
  });

  // Update renewable availability mutation
  const updateRenewableAvailabilityMutation = useMutation({
    mutationFn: (data: { year: number, availability: any }) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.updateRenewableAvailability(
        currentSession.id, 
        data.year, 
        data.availability
      );
    },
    onSuccess: () => {
      toast.success('Renewable availability updated successfully');
      queryClient.invalidateQueries({ queryKey: ['renewable-availability'] });
    },
    onError: () => toast.error('Failed to update renewable availability')
  });

  // Update demand profile mutation
  const updateDemandProfileMutation = useMutation({
    mutationFn: (demandProfile: any) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.updateDemandProfile(
        currentSession.id, 
        demandProfile
      );
    },
    onSuccess: () => {
      toast.success('Demand profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to update demand profile')
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

  // Handle saving year configuration
  const handleSaveYearConfig = () => {
    // Update carbon price
    updateCarbonPriceMutation.mutate(yearConfig.carbonPrice);
    
    // Update fuel prices
    updateFuelPricesMutation.mutate({
      year: currentSession?.current_year || 2025,
      fuelPrices: yearConfig.fuelPrices
    });
    
    // Update renewable availability
    updateRenewableAvailabilityMutation.mutate({
      year: currentSession?.current_year || 2025,
      availability: yearConfig.renewableAvailability
    });
    
    // Update demand profile
    updateDemandProfileMutation.mutate(yearConfig.demandProfile);
    
    // Close modal
    setShowYearConfigModal(false);
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
            
            <button
              onClick={() => setShowYearConfigModal(true)}
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 font-medium"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              <span>Configure Year {currentSession.current_year}</span>
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
                className={`p-3 rounded-lg