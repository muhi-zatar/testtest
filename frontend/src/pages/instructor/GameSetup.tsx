import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon,
  CogIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  FireIcon,
  UserGroupIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

interface GameSessionConfig {
  name: string;
  start_year: number;
  end_year: number;
  carbon_price_per_ton: number;
  demand_profile: {
    off_peak_demand: number;
    shoulder_demand: number;
    peak_demand: number;
    demand_growth_rate: number;
  };
  fuel_prices: Record<string, Record<string, number>>;
  max_utilities: number;
  market_volatility: 'low' | 'medium' | 'high';
  regulatory_environment: 'stable' | 'changing' | 'strict';
}

interface GameScenario {
  id: string;
  name: string;
  description: string;
  duration_years: number;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  focus_areas: string[];
  default_config: Partial<GameSessionConfig>;
}

const GameSetup: React.FC = () => {
  const { setCurrentSession, currentSession } = useGameStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'create' | 'scenarios' | 'manage' | 'portfolios'>('create');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  // Form state for new game creation
  const [gameConfig, setGameConfig] = useState<GameSessionConfig>({
    name: '',
    start_year: 2025,
    end_year: 2035,
    carbon_price_per_ton: 50,
    demand_profile: {
      off_peak_demand: 2800,
      shoulder_demand: 3200,
      peak_demand: 3800,
      demand_growth_rate: 0.021,
    },
    fuel_prices: {
      '2025': { natural_gas: 3.5, coal: 2.1, uranium: 0.8 },
      '2030': { natural_gas: 4.2, coal: 2.3, uranium: 0.9 },
      '2035': { natural_gas: 4.8, coal: 2.5, uranium: 1.0 },
    },
    max_utilities: 4,
    market_volatility: 'medium',
    regulatory_environment: 'stable',
  });

  // Predefined scenarios
  const predefinedScenarios: GameScenario[] = [
    {
      id: 'intro_tutorial',
      name: 'Introduction Tutorial',
      description: 'Basic 5-year simulation perfect for learning electricity market fundamentals',
      duration_years: 5,
      complexity: 'beginner',
      focus_areas: ['Basic Bidding', 'Simple Investment', 'Merit Order'],
      default_config: {
        start_year: 2025,
        end_year: 2030,
        carbon_price_per_ton: 30,
        max_utilities: 2,
        market_volatility: 'low',
        regulatory_environment: 'stable',
      }
    },
    {
      id: 'renewable_transition',
      name: 'Renewable Energy Transition',
      description: 'Navigate the clean energy transition with declining costs and policy support',
      duration_years: 10,
      complexity: 'intermediate',
      focus_areas: ['Renewable Investment', 'Carbon Pricing', 'Storage Strategy'],
      default_config: {
        carbon_price_per_ton: 75,
        market_volatility: 'medium',
        regulatory_environment: 'changing',
      }
    },
    {
      id: 'capacity_crunch',
      name: 'Capacity Shortage Crisis',
      description: 'High demand growth with limited new capacity - strategic planning essential',
      duration_years: 8,
      complexity: 'advanced',
      focus_areas: ['Capacity Planning', 'Peak Pricing', 'Financial Risk'],
      default_config: {
        demand_profile: {
          off_peak_demand: 3200,
          shoulder_demand: 3800,
          peak_demand: 4500,
          demand_growth_rate: 0.035,
        },
        carbon_price_per_ton: 100,
        market_volatility: 'high',
      }
    },
    {
      id: 'deregulated_market',
      name: 'Competitive Market Dynamics',
      description: 'Intense competition with 6 utilities competing for market share',
      duration_years: 10,
      complexity: 'advanced',
      focus_areas: ['Competition', 'Portfolio Optimization', 'Market Strategy'],
      default_config: {
        max_utilities: 6,
        market_volatility: 'high',
        regulatory_environment: 'stable',
      }
    },
    {
      id: 'climate_policy',
      name: 'Aggressive Climate Policy',
      description: 'Rapid decarbonization with high carbon prices and renewable mandates',
      duration_years: 12,
      complexity: 'advanced',
      focus_areas: ['Decarbonization', 'Policy Compliance', 'Technology Transition'],
      default_config: {
        start_year: 2025,
        end_year: 2037,
        carbon_price_per_ton: 150,
        regulatory_environment: 'strict',
      }
    },
  ];

  // Get portfolio templates
  const { data: portfolioTemplates } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: ElectricityMarketAPI.getPortfolioTemplates,
  });

  // Get utilities for current session
  const { data: utilitiesData } = useQuery({
    queryKey: ['session-utilities', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getAllUtilities(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Get existing game sessions
  const { data: existingSessions, isLoading } = useQuery({
    queryKey: ['game-sessions'],
    queryFn: async () => {
      // This would be a real API call to get all sessions
      // For now, returning mock data
      return [
        {
          id: 'sample_game_1',
          name: 'Advanced Electricity Market Simulation 2025-2035',
          start_year: 2025,
          end_year: 2035,
          current_year: 2025,
          state: 'year_planning',
          operator_id: 'operator_1',
          participant_count: 3,
          created_at: '2024-01-15',
        }
      ];
    },
  });

  // Create game session mutation
  const createGameMutation = useMutation({
    mutationFn: (config: GameSessionConfig) => {
      return ElectricityMarketAPI.createGameSession({
        name: config.name,
        operator_id: 'operator_1', // This would come from auth context
        start_year: config.start_year,
        end_year: config.end_year,
        carbon_price_per_ton: config.carbon_price_per_ton,
      });
    },
    onSuccess: (data) => {
      toast.success('Game session created successfully!');
      setCurrentSession(data);
      queryClient.invalidateQueries({ queryKey: ['game-sessions'] });
      // Reset form
      setGameConfig({
        ...gameConfig,
        name: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create game session');
    }
  });

  // Create sample data mutation
  const createSampleDataMutation = useMutation({
    mutationFn: ElectricityMarketAPI.createSampleData,
    onSuccess: () => {
      toast.success('Sample data created successfully!');
      queryClient.invalidateQueries({ queryKey: ['game-sessions'] });
    },
    onError: () => {
      toast.error('Failed to create sample data');
    }
  });

  // Portfolio assignment mutations
  const assignPortfolioMutation = useMutation({
    mutationFn: ({ utilityId, portfolio }: { utilityId: string; portfolio: any }) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.assignPortfolio(currentSession.id, utilityId, portfolio);
    },
    onSuccess: () => {
      toast.success('Portfolio assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['session-utilities'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to assign portfolio');
    }
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (assignments: any) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.bulkAssignPortfolios(currentSession.id, assignments);
    },
    onSuccess: (data) => {
      toast.success(`Bulk assignment completed: ${data.successful_assignments.length} successful`);
      queryClient.invalidateQueries({ queryKey: ['session-utilities'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to bulk assign portfolios');
    }
  });

  const handleCreateGame = () => {
    if (!gameConfig.name.trim()) {
      toast.error('Please enter a game name');
      return;
    }
    
    if (gameConfig.end_year <= gameConfig.start_year) {
      toast.error('End year must be after start year');
      return;
    }

    createGameMutation.mutate(gameConfig);
  };

  const applyScenario = (scenario: GameScenario) => {
    setGameConfig({
      ...gameConfig,
      name: scenario.name,
      ...scenario.default_config,
    });
    setActiveTab('create');
    toast.success(`Applied ${scenario.name} scenario template`);
  };

  const handleAssignPortfolio = (utilityId: string, templateId: string) => {
    const template = portfolioTemplates?.templates.find((t: any) => t.id === templateId);
    if (!template) {
      toast.error('Template not found');
      return;
    }

    assignPortfolioMutation.mutate({ utilityId, portfolio: template });
  };

  const handleBulkAssignDefault = () => {
    if (!portfolioTemplates || !utilitiesData) {
      toast.error('Data not loaded');
      return;
    }

    const templates = portfolioTemplates.templates;
    const utilities = utilitiesData.utilities;

    if (utilities.length < 3) {
      toast.error('Need at least 3 utilities for default assignment');
      return;
    }

    const assignments = {
      utility_assignments: {
        [utilities[0].id]: templates.find((t: any) => t.id === 'traditional'),
        [utilities[1].id]: templates.find((t: any) => t.id === 'mixed'),
        [utilities[2].id]: templates.find((t: any) => t.id === 'renewable'),
      }
    };

    bulkAssignMutation.mutate(assignments);
  };

  const updateDemandProfile = (field: keyof GameSessionConfig['demand_profile'], value: number) => {
    setGameConfig({
      ...gameConfig,
      demand_profile: {
        ...gameConfig.demand_profile,
        [field]: value,
      }
    });
  };

  const updateFuelPrice = (year: string, fuel: string, price: number) => {
    setGameConfig({
      ...gameConfig,
      fuel_prices: {
        ...gameConfig.fuel_prices,
        [year]: {
          ...gameConfig.fuel_prices[year],
          [fuel]: price,
        }
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Setup</h1>
          <p className="text-gray-400">Create and configure electricity market simulations</p>
        </div>
        
        <button
          onClick={() => createSampleDataMutation.mutate()}
          disabled={createSampleDataMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
          <span>{createSampleDataMutation.isPending ? 'Creating...' : 'Create Sample Data'}</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex border-b border-gray-700">
          {[
            { id: 'create', name: 'Create New Game', icon: PlusIcon },
            { id: 'scenarios', name: 'Scenario Templates', icon: DocumentDuplicateIcon },
            { id: 'manage', name: 'Manage Sessions', icon: CogIcon },
            { id: 'portfolios', name: 'Portfolio Assignment', icon: UserGroupIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Create New Game Tab */}
        {activeTab === 'create' && (
          <div className="p-6 space-y-6">
            {/* Basic Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Basic Configuration</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Name *
                  </label>
                  <input
                    type="text"
                    value={gameConfig.name}
                    onChange={(e) => setGameConfig({ ...gameConfig, name: e.target.value })}
                    placeholder="e.g., Spring 2024 Electricity Markets"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Year
                    </label>
                    <select
                      value={gameConfig.start_year}
                      onChange={(e) => setGameConfig({ ...gameConfig, start_year: Number(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = 2025 + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Year
                    </label>
                    <select
                      value={gameConfig.end_year}
                      onChange={(e) => setGameConfig({ ...gameConfig, end_year: Number(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 15 }, (_, i) => {
                        const year = 2028 + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Maximum Utilities
                    </label>
                    <select
                      value={gameConfig.max_utilities}
                      onChange={(e) => setGameConfig({ ...gameConfig, max_utilities: Number(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value={2}>2 Utilities</option>
                      <option value={3}>3 Utilities</option>
                      <option value={4}>4 Utilities</option>
                      <option value={5}>5 Utilities</option>
                      <option value={6}>6 Utilities</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Carbon Price ($/ton CO₂)
                    </label>
                    <input
                      type="number"
                      value={gameConfig.carbon_price_per_ton}
                      onChange={(e) => setGameConfig({ ...gameConfig, carbon_price_per_ton: Number(e.target.value) })}
                      min="0"
                      max="200"
                      step="5"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Game Summary */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Game Summary</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white">{gameConfig.end_year - gameConfig.start_year} years</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Simulation Period:</span>
                    <span className="text-white">{gameConfig.start_year} - {gameConfig.end_year}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Market Participants:</span>
                    <span className="text-white">{gameConfig.max_utilities} utilities</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Carbon Policy:</span>
                    <span className="text-white">${gameConfig.carbon_price_per_ton}/ton CO₂</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Market Type:</span>
                    <span className="text-white">Competitive Wholesale</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <h5 className="font-medium text-white mb-2">Learning Objectives</h5>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Long-term capacity planning and investment decisions</li>
                    <li>• Understanding electricity market merit order dispatch</li>
                    <li>• Financial modeling and risk management</li>
                    <li>• Technology portfolio optimization strategies</li>
                    <li>• Competitive bidding and pricing strategies</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Advanced Configuration */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 mb-4"
              >
                <CogIcon className="w-5 h-5" />
                <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Configuration</span>
              </button>

              {showAdvanced && (
                <div className="space-y-6 bg-gray-700 rounded-lg p-6">
                  {/* Demand Profile */}
                  <div>
                    <h4 className="font-medium text-white mb-4 flex items-center">
                      <BoltIcon className="w-5 h-5 mr-2" />
                      Demand Profile Configuration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Off-Peak Demand (MW)
                          </label>
                          <input
                            type="number"
                            value={gameConfig.demand_profile.off_peak_demand}
                            onChange={(e) => updateDemandProfile('off_peak_demand', Number(e.target.value))}
                            min="1000"
                            max="10000"
                            step="100"
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">Night and weekend hours (5,000 hrs/year)</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Shoulder Demand (MW)
                          </label>
                          <input
                            type="number"
                            value={gameConfig.demand_profile.shoulder_demand}
                            onChange={(e) => updateDemandProfile('shoulder_demand', Number(e.target.value))}
                            min="1000"
                            max="10000"
                            step="100"
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">Daytime non-peak hours (2,500 hrs/year)</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Peak Demand (MW)
                          </label>
                          <input
                            type="number"
                            value={gameConfig.demand_profile.peak_demand}
                            onChange={(e) => updateDemandProfile('peak_demand', Number(e.target.value))}
                            min="1000"
                            max="10000"
                            step="100"
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">Evening high-demand hours (1,260 hrs/year)</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Annual Demand Growth Rate (%)
                          </label>
                          <input
                            type="number"
                            value={gameConfig.demand_profile.demand_growth_rate * 100}
                            onChange={(e) => updateDemandProfile('demand_growth_rate', Number(e.target.value) / 100)}
                            min="0"
                            max="10"
                            step="0.1"
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">Typical range: 1-3% annually</p>
                        </div>
                      </div>

                      <div className="bg-gray-600 rounded-lg p-4">
                        <h5 className="font-medium text-white mb-3">Demand Profile Analysis</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Total Capacity Needed:</span>
                            <span className="text-white font-medium">
                              {gameConfig.demand_profile.peak_demand.toLocaleString()} MW
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Annual Energy Demand:</span>
                            <span className="text-white font-medium">
                              {(
                                (gameConfig.demand_profile.off_peak_demand * 5000 +
                                 gameConfig.demand_profile.shoulder_demand * 2500 +
                                 gameConfig.demand_profile.peak_demand * 1260) / 1000000
                              ).toFixed(1)} TWh
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Load Factor:</span>
                            <span className="text-white font-medium">
                              {(
                                (gameConfig.demand_profile.off_peak_demand * 5000 +
                                 gameConfig.demand_profile.shoulder_demand * 2500 +
                                 gameConfig.demand_profile.peak_demand * 1260) /
                                (gameConfig.demand_profile.peak_demand * 8760) * 100
                              ).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Peak/Off-Peak Ratio:</span>
                            <span className="text-white font-medium">
                              {(gameConfig.demand_profile.peak_demand / gameConfig.demand_profile.off_peak_demand).toFixed(2)}x
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-500">
                          <h6 className="font-medium text-white mb-2">Market Implications</h6>
                          <ul className="text-xs text-gray-300 space-y-1">
                            <li>• Higher peak/off-peak ratio = more volatile pricing</li>
                            <li>• Low load factor = greater need for peaking plants</li>
                            <li>• High growth rate = more investment opportunities</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fuel Price Configuration */}
                  <div>
                    <h4 className="font-medium text-white mb-4 flex items-center">
                      <FireIcon className="w-5 h-5 mr-2" />
                      Fuel Price Projections ($/MMBtu)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(gameConfig.fuel_prices).map(([year, prices]) => (
                        <div key={year} className="bg-gray-600 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-3 text-center">{year}</h5>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Natural Gas</label>
                              <input
                                type="number"
                                value={prices.natural_gas}
                                onChange={(e) => updateFuelPrice(year, 'natural_gas', Number(e.target.value))}
                                min="1"
                                max="15"
                                step="0.1"
                                className="w-full bg-gray-500 border border-gray-400 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Coal</label>
                              <input
                                type="number"
                                value={prices.coal}
                                onChange={(e) => updateFuelPrice(year, 'coal', Number(e.target.value))}
                                min="1"
                                max="10"
                                step="0.1"
                                className="w-full bg-gray-500 border border-gray-400 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Uranium</label>
                              <input
                                type="number"
                                value={prices.uranium}
                                onChange={(e) => updateFuelPrice(year, 'uranium', Number(e.target.value))}
                                min="0.5"
                                max="3"
                                step="0.1"
                                className="w-full bg-gray-500 border border-gray-400 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Market Environment */}
                  <div>
                    <h4 className="font-medium text-white mb-4">Market Environment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Market Volatility
                        </label>
                        <select
                          value={gameConfig.market_volatility}
                          onChange={(e) => setGameConfig({ ...gameConfig, market_volatility: e.target.value as any })}
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="low">Low - Predictable market conditions</option>
                          <option value="medium">Medium - Moderate price swings</option>
                          <option value="high">High - Frequent market shocks</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Regulatory Environment
                        </label>
                        <select
                          value={gameConfig.regulatory_environment}
                          onChange={(e) => setGameConfig({ ...gameConfig, regulatory_environment: e.target.value as any })}
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="stable">Stable - Predictable regulations</option>
                          <option value="changing">Changing - Evolving policy landscape</option>
                          <option value="strict">Strict - Aggressive environmental policies</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Create Game Button */}
            <div className="flex justify-center pt-6">
              <button
                onClick={handleCreateGame}
                disabled={createGameMutation.isPending || !gameConfig.name.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold px-8 py-3 rounded-lg flex items-center space-x-2 text-lg"
              >
                <PlayIcon className="w-6 h-6" />
                <span>
                  {createGameMutation.isPending ? 'Creating Game...' : 'Create Game Session'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Scenario Templates Tab */}
        {activeTab === 'scenarios' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Pre-configured Scenarios</h3>
              <p className="text-gray-400">Ready-to-use templates for different learning objectives and complexity levels</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {predefinedScenarios.map((scenario) => (
                <div key={scenario.id} className="bg-gray-700 rounded-lg p-6 border border-gray-600 hover:border-blue-500 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-white mb-1">{scenario.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        scenario.complexity === 'beginner' ? 'bg-green-900 text-green-300' :
                        scenario.complexity === 'intermediate' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-red-900 text-red-300'
                      }`}>
                        {scenario.complexity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Duration</p>
                      <p className="text-white font-medium">{scenario.duration_years} years</p>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-4">{scenario.description}</p>

                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-white mb-2">Focus Areas</h5>
                    <div className="flex flex-wrap gap-1">
                      {scenario.focus_areas.map((area) => (
                        <span key={area} className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 text-sm space-y-1">
                    {scenario.default_config.carbon_price_per_ton && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Carbon Price:</span>
                        <span className="text-white">${scenario.default_config.carbon_price_per_ton}/ton</span>
                      </div>
                    )}
                    {scenario.default_config.max_utilities && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Max Utilities:</span>
                        <span className="text-white">{scenario.default_config.max_utilities}</span>
                      </div>
                    )}
                    {scenario.default_config.market_volatility && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volatility:</span>
                        <span className="text-white capitalize">{scenario.default_config.market_volatility}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => applyScenario(scenario)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Use This Scenario
                  </button>
                </div>
              ))}
            </div>

            {/* Custom Scenario Creation */}
            <div className="mt-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="w-6 h-6 text-purple-400 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-purple-300">Need a Custom Scenario?</h3>
                  <p className="text-gray-300 mt-2 mb-4">
                    These templates provide excellent starting points, but you can fully customize any scenario 
                    in the "Create New Game" tab. Adjust demand profiles, fuel prices, market volatility, 
                    and regulatory environments to match your specific learning objectives.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-white mb-2">💡 Customization Options</h4>
                      <ul className="text-gray-300 space-y-1">
                        <li>• Adjust simulation duration (3-15 years)</li>
                        <li>• Configure demand growth patterns</li>
                        <li>• Set fuel price volatility scenarios</li>
                        <li>• Choose carbon pricing policies</li>
                        <li>• Control market competitiveness (2-6 utilities)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-2">🎯 Educational Focus</h4>
                      <ul className="text-gray-300 space-y-1">
                        <li>• Beginner: Basic market mechanics</li>
                        <li>• Intermediate: Strategic planning</li>
                        <li>• Advanced: Complex market dynamics</li>
                        <li>• Research: Policy scenario analysis</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Assignment Tab */}
        {activeTab === 'portfolios' && (
          <div className="p-6 space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Portfolio Assignment</h3>
              <p className="text-gray-400">Assign starting portfolios and bank accounts to utilities</p>
            </div>

            {!currentSession ? (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 text-center">
                <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-yellow-400 mb-2">No Active Session</h3>
                <p className="text-gray-300">Create or select a game session first</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quick Assignment */}
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-blue-300">Quick Assignment</h4>
                      <p className="text-gray-400 text-sm">Assign default portfolios to all utilities</p>
                    </div>
                    <button
                      onClick={handleBulkAssignDefault}
                      disabled={bulkAssignMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
                    >
                      {bulkAssignMutation.isPending ? 'Assigning...' : 'Assign Default Portfolios'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-300">
                    This will assign: Traditional portfolio to Utility 1, Mixed portfolio to Utility 2, 
                    and Renewable portfolio to Utility 3.
                  </p>
                </div>

                {/* Current Utilities */}
                {utilitiesData && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h4 className="font-semibold text-white mb-4">Current Utilities</h4>
                    <div className="space-y-4">
                      {utilitiesData.utilities.map((utility: any) => (
                        <div key={utility.id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h5 className="font-medium text-white">{utility.username}</h5>
                              <p className="text-sm text-gray-400">ID: {utility.id}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-400">Budget</p>
                              <p className="text-lg font-semibold text-green-400">
                                ${(utility.budget / 1e9).toFixed(1)}B
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-gray-600 rounded p-3">
                              <p className="text-xs text-gray-400">Debt</p>
                              <p className="text-white font-medium">${(utility.debt / 1e9).toFixed(1)}B</p>
                            </div>
                            <div className="bg-gray-600 rounded p-3">
                              <p className="text-xs text-gray-400">Equity</p>
                              <p className="text-white font-medium">${(utility.equity / 1e9).toFixed(1)}B</p>
                            </div>
                            <div className="bg-gray-600 rounded p-3">
                              <p className="text-xs text-gray-400">Plants</p>
                              <p className="text-white font-medium">{utility.plant_count} ({utility.total_capacity_mw.toLocaleString()} MW)</p>
                            </div>
                          </div>

                          {utility.plants.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-300 mb-2">Current Plants:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {utility.plants.map((plant: any) => (
                                  <div key={plant.id} className="bg-gray-600 rounded p-2">
                                    <p className="text-sm text-white font-medium">{plant.name}</p>
                                    <p className="text-xs text-gray-400">
                                      {plant.plant_type.replace('_', ' ')} • {plant.capacity_mw} MW • {plant.status}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Portfolio Assignment Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {portfolioTemplates?.templates.map((template: any) => (
                              <button
                                key={template.id}
                                onClick={() => handleAssignPortfolio(utility.id, template.id)}
                                disabled={assignPortfolioMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                              >
                                Assign {template.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Portfolio Templates */}
                {portfolioTemplates && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h4 className="font-semibold text-white mb-4">Available Portfolio Templates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {portfolioTemplates.templates.map((template: any) => (
                        <div key={template.id} className="bg-gray-700 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-2">{template.name}</h5>
                          <p className="text-sm text-gray-400 mb-4">{template.description}</p>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Initial Budget:</span>
                              <span className="text-green-400">${(template.initial_budget / 1e9).toFixed(1)}B</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Plants:</span>
                              <span className="text-white">{template.plants.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Total Capacity:</span>
                              <span className="text-blue-400">
                                {template.plants.reduce((sum: number, plant: any) => sum + plant.capacity_mw, 0).toLocaleString()} MW
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-300">Plants:</p>
                            {template.plants.map((plant: any, index: number) => (
                              <p key={index} className="text-xs text-gray-400">
                                • {plant.plant_name} ({plant.capacity_mw} MW {plant.plant_type.replace('_', ' ')})
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage Sessions Tab */}
        {activeTab === 'manage' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Existing Game Sessions</h3>
              <p className="text-gray-400">Monitor and manage your electricity market simulations</p>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading game sessions...</p>
              </div>
            ) : existingSessions && existingSessions.length > 0 ? (
              <div className="space-y-4">
                {existingSessions.map((session: any) => (
                  <div key={session.id} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{session.name}</h4>
                        <p className="text-gray-400 text-sm">
                          Created: {new Date(session.created_at).toLocaleDateString()} • 
                          Session ID: {session.id}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          session.state === 'year_planning' ? 'bg-blue-900 text-blue-300' :
                          session.state === 'bidding_open' ? 'bg-green-900 text-green-300' :
                          session.state === 'market_clearing' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-gray-600 text-gray-300'
                        }`}>
                          {session.state.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center bg-gray-600 rounded-lg p-3">
                        <p className="text-gray-400 text-sm">Current Year</p>
                        <p className="text-white font-bold text-lg">{session.current_year}</p>
                      </div>
                      <div className="text-center bg-gray-600 rounded-lg p-3">
                        <p className="text-gray-400 text-sm">Simulation Period</p>
                        <p className="text-white font-medium">{session.start_year}-{session.end_year}</p>
                      </div>
                      <div className="text-center bg-gray-600 rounded-lg p-3">
                        <p className="text-gray-400 text-sm">Participants</p>
                        <p className="text-white font-bold text-lg">{session.participant_count}</p>
                      </div>
                      <div className="text-center bg-gray-600 rounded-lg p-3">
                        <p className="text-gray-400 text-sm">Progress</p>
                        <p className="text-white font-medium">
                          {Math.round(((session.current_year - session.start_year) / (session.end_year - session.start_year)) * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <ClockIcon className="w-4 h-4" />
                        <span>
                          Year {session.current_year} of {session.end_year - session.start_year + 1}
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setCurrentSession(session);
                            toast.success(`Switched to ${session.name}`);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-1"
                        >
                          <PlayIcon className="w-4 h-4" />
                          <span>Select</span>
                        </button>
                        
                        <button className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-1">
                          <PencilIcon className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        
                        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-1">
                          <TrashIcon className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Session Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{session.start_year}</span>
                        <span>Current: {session.current_year}</span>
                        <span>{session.end_year}</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${((session.current_year - session.start_year) / (session.end_year - session.start_year)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BuildingOffice2Icon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Game Sessions Yet</h3>
                <p className="text-gray-500 mb-6">
                  Create your first electricity market simulation to get started
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Create Your First Game
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tips and Best Practices */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-700 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <CheckCircleIcon className="w-6 h-6 text-green-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-green-300">Setup Best Practices</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">🎯 Choosing Duration</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• <strong>5 years:</strong> Focus on bidding and basic strategy</li>
                  <li>• <strong>8-10 years:</strong> Include major investment decisions</li>
                  <li>• <strong>12+ years:</strong> Full technology transition scenarios</li>
                  <li>• Consider semester length and class schedule</li>
                  <li>• Allow 1-2 weeks per simulated year</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">⚡ Market Difficulty</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• <strong>Beginner:</strong> 2-3 utilities, low volatility</li>
                  <li>• <strong>Intermediate:</strong> 4 utilities, medium volatility</li>
                  <li>• <strong>Advanced:</strong> 5-6 utilities, high volatility</li>
                  <li>• Higher carbon prices increase strategy complexity</li>
                  <li>• Demand growth affects investment timing</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">📊 Demand Configuration</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Peak demand drives capacity requirements</li>
                  <li>• Higher peak/baseload ratio = more volatile prices</li>
                  <li>• 2-3% growth rate is realistic for most regions</li>
                  <li>• Consider electrification scenarios (5%+ growth)</li>
                  <li>• Load factor affects plant utilization</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">💰 Economic Realism</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• $30-50/ton CO₂ represents current policies</li>
                  <li>• $100+ ton models aggressive climate action</li>
                  <li>• Fuel price volatility creates strategic challenges</li>
                  <li>• Regulatory uncertainty affects planning</li>
                  <li>• Match scenarios to learning objectives</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;