import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CogIcon,
  ChartBarIcon,
  ChartBarIcon,
  UserGroupIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BuildingOffice2Icon,
  BoltIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

interface PortfolioTemplate {
  id: string;
  name: string;
  description: string;
  plants: Array<{
    plant_type: string;
    capacity_mw: number;
    name: string;
  }>;
}

interface CustomPlant {
  plant_type: string;
  capacity_mw: number;
  name: string;
  commissioning_year: number;
  retirement_year: number;
}

interface UtilityConfig {
  id: string;
  name: string;
  budget: number;
  debt: number;
  equity: number;
  plants: CustomPlant[];
}

interface GameSetupData {
  sessionName: string;
  startYear: number;
  endYear: number;
  carbonPrice: number;
  numberOfUtilities: number;
  utilityConfigs: UtilityConfig[];
  demandProfile: {
    off_peak_demand: number;
    shoulder_demand: number;
    peak_demand: number;
    demand_growth_rate: number;
  };
  fuelPrices: Record<string, Record<string, number>>;
}

const GameSetup: React.FC = () => {
  const { currentSession, setCurrentSession } = useGameStore();
  const queryClient = useQueryClient();

  const [setupData, setSetupData] = useState<GameSetupData>({
    sessionName: 'Electricity Market Simulation',
    startYear: 2025,
    endYear: 2035,
    carbonPrice: 50,
    numberOfUtilities: 3,
    utilityConfigs: [],
    demandProfile: {
      off_peak_demand: 1200,
      shoulder_demand: 1800,
      peak_demand: 2400,
      demand_growth_rate: 0.02
    },
    fuelPrices: {
      "2025": { "coal": 2.50, "natural_gas": 4.00, "uranium": 0.75 },
      "2026": { "coal": 2.55, "natural_gas": 4.20, "uranium": 0.76 },
      "2027": { "coal": 2.60, "natural_gas": 4.50, "uranium": 0.77 },
      "2028": { "coal": 2.65, "natural_gas": 4.80, "uranium": 0.78 },
      "2029": { "coal": 2.70, "natural_gas": 5.00, "uranium": 0.79 },
      "2030": { "coal": 2.75, "natural_gas": 5.20, "uranium": 0.80 }
    }
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [createdUtilities, setCreatedUtilities] = useState<Array<{id: string, username: string}>>([]);
  const [gameSessionId, setGameSessionId] = useState<string>('');
  const [selectedUtilityIndex, setSelectedUtilityIndex] = useState<number>(0);

  // Initialize utility configs
  useEffect(() => {
    if (setupData.utilityConfigs.length === 0) {
      const sessionId = Date.now().toString().slice(-4);
      const newConfigs = Array.from({ length: setupData.numberOfUtilities }, (_, i) => ({
        id: `utility_${i + 1}_${sessionId}`,
        name: `Utility ${i + 1} (${sessionId})`,
        budget: 2000000000, // $2B
        debt: 0,
        equity: 2000000000,
        plants: []
      }));
      setSetupData(prev => ({ ...prev, utilityConfigs: newConfigs }));
    }
  }, [setupData.numberOfUtilities, setupData.utilityConfigs.length]);

  // Get plant templates
  const { data: plantTemplates } = useQuery({
    queryKey: ['plant-templates'],
    queryFn: ElectricityMarketAPI.getPlantTemplates,
  });

  // Get portfolio templates
  const { data: portfolioTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: ElectricityMarketAPI.getPortfolioTemplates,
  });

  // Create game session mutation
  const createSessionMutation = useMutation({
    mutationFn: (sessionData: any) => ElectricityMarketAPI.createGameSession(sessionData),
    onSuccess: (data) => {
      setGameSessionId(data.id);
      setCurrentSession(data);
      toast.success('Game session created successfully!');
      setCurrentStep(2);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create game session';
      toast.error(errorMessage);
    }
  });

  // Create utilities mutation
  const createUtilitiesMutation = useMutation({
    mutationFn: async (utilityConfigs: UtilityConfig[]) => {
      const utilities = [];
      for (const config of utilityConfigs) {
        const utility = await ElectricityMarketAPI.createUser({
          username: config.name.toLowerCase().replace(/\s+/g, '_'),
          user_type: 'utility'
        });
        
        // Update utility finances if different from defaults
        if (config.budget !== 2000000000 || config.debt !== 0 ||config.equity !== 2000000000) {
          await ElectricityMarketAPI.updateUtilityFinancials(utility.id, {
            budget: config.budget,
            debt: config.debt,
            equity: config.equity
          });
        }
        
        utilities.push(utility);
      }
      return utilities;
    },
    onSuccess: (utilities) => {
      setCreatedUtilities(utilities);
      toast.success(`${utilities.length} utilities created successfully!`);
      setCurrentStep(3);
    },
    onError: () => {
      toast.error('Failed to create utilities');
    }
  });

  // Create custom plants mutation
  const createCustomPlantsMutation = useMutation({
    mutationFn: async () => {
      if (!gameSessionId) throw new Error('No game session');
      
      const results = [];
      
      for (let i = 0; i < createdUtilities.length; i++) {
        const utility = createdUtilities[i];
        const config = setupData.utilityConfigs[i];
        
        if (!config || !config.plants || config.plants.length === 0) continue;
        
        for (const plant of config.plants) {
          const result = await ElectricityMarketAPI.createPowerPlant(
            gameSessionId,
            utility.id,
            {
              name: plant.name,
              plant_type: plant.plant_type,
              capacity_mw: plant.capacity_mw,
              construction_start_year: plant.commissioning_year - 3, // Estimate construction start
              commissioning_year: plant.commissioning_year,
              retirement_year: plant.retirement_year
            }
          );
          results.push(result);
        }
      }
      
      return results;
    },
    onSuccess: () => {
      toast.success('Custom plants created successfully!');
      setCurrentStep(4);
      queryClient.invalidateQueries({ queryKey: ['game-utilities'] });
    },
    onError: () => {
      toast.error('Failed to create custom plants');
    }
  });

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: () => {
      if (!gameSessionId) throw new Error('No game session');
      return ElectricityMarketAPI.updateGameState(gameSessionId, 'year_planning');
    },
    onSuccess: () => {
      toast.success('Game started! Year planning phase is now active.');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast.error('Failed to start game');
    }
  });

  // Load sample data mutation
  const loadSampleDataMutation = useMutation({
    mutationFn: ElectricityMarketAPI.createSampleData,
    onSuccess: (data) => {
      toast.success('Sample data loaded successfully!');
      // Set the sample game as current session
      ElectricityMarketAPI.getGameSession(data.game_session_id).then(session => {
        setCurrentSession(session);
        setGameSessionId(session.id);
        setCurrentStep(4);
      });
    },
    onError: () => {
      toast.error('Failed to load sample data');
    }
  });

  const handleUtilityCountChange = (count: number) => {
    // Generate unique names for this session
    const sessionId = Date.now().toString().slice(-4);
    const newConfigs = Array.from({ length: count }, (_, i) => ({
      id: `utility_${i + 1}_${sessionId}`,
      name: `Utility ${i + 1} (${sessionId})`,
      budget: 2000000000, // $2B
      debt: 0,
      equity: 2000000000,
      plants: []
    }));
    
    setSetupData(prev => ({
      ...prev,
      numberOfUtilities: count,
      utilityConfigs: newConfigs
    }));
    
    // Reset selected utility
    setSelectedUtilityIndex(0);
  };

  const handleUtilityNameChange = (index: number, name: string) => {
    setSetupData(prev => ({
      ...prev,
      utilityConfigs: prev.utilityConfigs.map((config, i) => 
        i === index ? { ...config, name } : config
      )
    }));
  };

  const handleUtilityFinanceChange = (index: number, field: 'budget' | 'debt' | 'equity', value: number) => {
    setSetupData(prev => ({
      ...prev,
      utilityConfigs: prev.utilityConfigs.map((config, i) => 
        i === index ? { ...config, [field]: value } : config
      )
    }));
  };

  const handleAddPlantToUtility = (utilityIndex: number, plant: CustomPlant) => {
    setSetupData(prev => ({
      ...prev,
      utilityConfigs: prev.utilityConfigs.map((config, i) => 
        i === utilityIndex ? 
        { 
          ...config, 
          plants: [...config.plants, plant]
        } : config
      )
    }));
  };

  const handleRemovePlantFromUtility = (utilityIndex: number, plantIndex: number) => {
    setSetupData(prev => ({
      ...prev,
      utilityConfigs: prev.utilityConfigs.map((config, i) => 
        i === utilityIndex ? 
        { 
          ...config, 
          plants: config.plants.filter((_, pIndex) => pIndex !== plantIndex)
        } : config
      )
    }));
  };

  const handleApplyPortfolioTemplate = (utilityIndex: number, templateId: string) => {
    const template = portfolioTemplates?.find((t: PortfolioTemplate) => t.id === templateId);
    if (!template) return;
    
    // Convert template plants to custom plants
    const customPlants = template.plants.map(plant => ({
      plant_type: plant.plant_type,
      capacity_mw: plant.capacity_mw,
      name: plant.name,
      commissioning_year: setupData.startYear - 2, // 2 years before start
      retirement_year: setupData.startYear + 23 // 25 year lifespan
    }));
    
    setSetupData(prev => ({
      ...prev,
      utilityConfigs: prev.utilityConfigs.map((config, i) => 
        i === utilityIndex ? { ...config, plants: customPlants } : config
      )
    }));
  };

  const handleCreateSession = () => {
    createSessionMutation.mutate({
      name: setupData.sessionName,
      operator_id: 'operator_1', // Assuming instructor is operator_1
      start_year: setupData.startYear,
      end_year: setupData.endYear,
      carbon_price_per_ton: setupData.carbonPrice
    });
  };

  const handleCreateUtilities = () => {
    createUtilitiesMutation.mutate(setupData.utilityConfigs);
  };

  const handleCreateCustomPlants = () => {
    createCustomPlantsMutation.mutate();
  };

  const handleStartGame = () => {
    startGameMutation.mutate();
  };

  const handleLoadSampleData = () => {
    loadSampleDataMutation.mutate();
  };

  const handleUpdateDemandProfile = (field: keyof GameSetupData['demandProfile'], value: number) => {
    setSetupData(prev => ({
      ...prev,
      demandProfile: {
        ...prev.demandProfile,
        [field]: value
      }
    }));
  };

  const handleUpdateFuelPrice = (year: string, fuel: string, price: number) => {
    setSetupData(prev => ({
      ...prev,
      fuelPrices: {
        ...prev.fuelPrices,
        [year]: {
          ...prev.fuelPrices[year],
          [fuel]: price
        }
      }
    }));
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return !!gameSessionId;
      case 2: return createdUtilities.length > 0;
      case 3: return setupData.utilityConfigs.every(config => config.plants.length > 0);
      case 4: return true;
      default: return false;
    }
  };

  const canProceedToStep = (step: number): boolean => {
    return step <= currentStep || isStepComplete(step - 1);
  };

  // Calculate total capacity for a utility
  const calculateTotalCapacity = (plants: CustomPlant[]) => {
    return plants.reduce((sum, plant) => sum + plant.capacity_mw, 0);
  };

  // Get plant template by type
  const getPlantTemplate = (plantType: string) => {
    return plantTemplates?.find(template => template.plant_type === plantType);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Setup</h1>
          <p className="text-gray-400">Configure and initialize a new electricity market simulation</p>
        </div>
        
        <button
          onClick={handleLoadSampleData}
          disabled={loadSampleDataMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          {loadSampleDataMutation.isPending ? 'Loading...' : 'Load Sample Data'}
        </button>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-600 text-gray-400'
              }`}>
                {isStepComplete(step) ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <span>{step}</span>
                )}
              </div>
              {step < 4 && (
                <div className={`w-24 h-1 mx-4 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <h3 className="font-medium text-white">Session Setup</h3>
            <p className="text-sm text-gray-400">Configure game parameters</p>
          </div>
          <div>
            <h3 className="font-medium text-white">Create Utilities</h3>
            <p className="text-sm text-gray-400">Add participating utilities</p>
          </div>
          <div>
            <h3 className="font-medium text-white">Configure Plants</h3>
            <p className="text-sm text-gray-400">Set initial plant portfolios</p>
          </div>
          <div>
            <h3 className="font-medium text-white">Start Game</h3>
            <p className="text-sm text-gray-400">Launch the simulation</p>
          </div>
        </div>
      </div>

      {/* Step 1: Session Configuration */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <CogIcon className="w-6 h-6 mr-2" />
              Step 1: Session Configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  value={setupData.sessionName}
                  onChange={(e) => setSetupData(prev => ({ ...prev, sessionName: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Utilities
                </label>
                <select
                  value={setupData.numberOfUtilities}
                  onChange={(e) => handleUtilityCountChange(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={2}>2 Utilities</option>
                  <option value={3}>3 Utilities</option>
                  <option value={4}>4 Utilities</option>
                  <option value={5}>5 Utilities</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Year
                </label>
                <input
                  type="number"
                  value={setupData.startYear}
                  onChange={(e) => setSetupData(prev => ({ ...prev, startYear: Number(e.target.value) }))}
                  min="2025"
                  max="2030"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Year
                </label>
                <input
                  type="number"
                  value={setupData.endYear}
                  onChange={(e) => setSetupData(prev => ({ ...prev, endYear: Number(e.target.value) }))}
                  min={setupData.startYear + 5}
                  max="2050"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Carbon Price ($/ton CO₂)
                </label>
                <input
                  type="number"
                  value={setupData.carbonPrice}
                  onChange={(e) => setSetupData(prev => ({ ...prev, carbonPrice: Number(e.target.value) }))}
                  min="0"
                  max="200"
                  step="5"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Demand Profile Configuration */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <ChartBarIcon className="w-6 h-6 mr-2" />
              Demand Profile Configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Off-Peak Demand (MW)
                </label>
                <input
                  type="number"
                  value={setupData.demandProfile.off_peak_demand}
                  onChange={(e) => handleUpdateDemandProfile('off_peak_demand', Number(e.target.value))}
                  min="500"
                  max="5000"
                  step="100"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">5,000 hours per year</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Shoulder Demand (MW)
                </label>
                <input
                  type="number"
                  value={setupData.demandProfile.shoulder_demand}
                  onChange={(e) => handleUpdateDemandProfile('shoulder_demand', Number(e.target.value))}
                  min="1000"
                  max="6000"
                  step="100"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">2,500 hours per year</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Peak Demand (MW)
                </label>
                <input
                  type="number"
                  value={setupData.demandProfile.peak_demand}
                  onChange={(e) => handleUpdateDemandProfile('peak_demand', Number(e.target.value))}
                  min="1500"
                  max="8000"
                  step="100"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">1,260 hours per year</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Annual Demand Growth Rate (%)
                </label>
                <input
                  type="number"
                  value={setupData.demandProfile.demand_growth_rate * 100}
                  onChange={(e) => handleUpdateDemandProfile('demand_growth_rate', Number(e.target.value) / 100)}
                  min="0"
                  max="10"
                  step="0.1"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Percentage growth per year</p>
              </div>
            </div>
          </div>

          {/* Fuel Price Configuration */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <FireIcon className="w-6 h-6 mr-2" />
              Fuel Price Configuration
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 text-gray-400">Year</th>
                    <th className="text-left py-2 text-gray-400">Coal ($/MMBtu)</th>
                    <th className="text-left py-2 text-gray-400">Natural Gas ($/MMBtu)</th>
                    <th className="text-left py-2 text-gray-400">Uranium ($/MMBtu)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(setupData.fuelPrices).map((year) => (
                    <tr key={year} className="border-b border-gray-700/50">
                      <td className="py-2 text-white">{year}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          value={setupData.fuelPrices[year].coal}
                          onChange={(e) => handleUpdateFuelPrice(year, 'coal', Number(e.target.value))}
                          min="0.5"
                          max="10"
                          step="0.05"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          value={setupData.fuelPrices[year].natural_gas}
                          onChange={(e) => handleUpdateFuelPrice(year, 'natural_gas', Number(e.target.value))}
                          min="1"
                          max="15"
                          step="0.1"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          value={setupData.fuelPrices[year].uranium}
                          onChange={(e) => handleUpdateFuelPrice(year, 'uranium', Number(e.target.value))}
                          min="0.1"
                          max="5"
                          step="0.01"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Configure fuel prices for each year of the simulation. These prices affect plant marginal costs.
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending || !setupData.sessionName}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg"
            >
              {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Create Utilities */}
      {currentStep === 2 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <UserGroupIcon className="w-6 h-6 mr-2" />
            Step 2: Create Utilities
          </h2>
          
          <div className="mb-6">
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-blue-300">Utility Setup</span>
              </div>
              <p className="text-sm text-gray-300">
                Configure each utility's starting financial position. You can customize the budget, debt, and equity for each utility.
                In the next step, you'll configure their plant portfolios.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {setupData.utilityConfigs.map((config, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <BuildingOffice2Icon className="w-8 h-8 text-green-400" />
                    <div>
                      <input
                        type="text"
                        value={config.name}
                        onChange={(e) => handleUtilityNameChange(index, e.target.value)}
                        className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Starting Budget ($B)
                    </label>
                    <input
                      type="number"
                      value={config.budget / 1e9}
                      onChange={(e) => handleUtilityFinanceChange(index, 'budget', Number(e.target.value) * 1e9)}
                      min="0.5"
                      max="10"
                      step="0.1"
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Starting Debt ($B)
                    </label>
                    <input
                      type="number"
                      value={config.debt / 1e9}
                      onChange={(e) => handleUtilityFinanceChange(index, 'debt', Number(e.target.value) * 1e9)}
                      min="0"
                      max="5"
                      step="0.1"
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Starting Equity ($B)
                    </label>
                    <input
                      type="number"
                      value={config.equity / 1e9}
                      onChange={(e) => handleUtilityFinanceChange(index, 'equity', Number(e.target.value) * 1e9)}
                      min="0.5"
                      max="10"
                      step="0.1"
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentStep(1)}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg"
            >
              Back
            </button>
            <button
              onClick={handleCreateUtilities}
              disabled={createUtilitiesMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg"
            >
              {createUtilitiesMutation.isPending ? 'Creating...' : 'Create Utilities'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configure Plant Portfolios */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <BoltIcon className="w-6 h-6 mr-2" />
              Step 3: Configure Plant Portfolios
            </h2>

            {/* Utility Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Utility to Configure
              </label>
              <div className="flex space-x-2">
                {setupData.utilityConfigs.map((config, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedUtilityIndex(index)}
                    className={`px-4 py-2 rounded-lg ${
                      selectedUtilityIndex === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Utility's Plants */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white">
                  {setupData.utilityConfigs[selectedUtilityIndex]?.name}'s Plant Portfolio
                </h3>
                
                <div className="flex space-x-2">
                  {/* Portfolio Template Quick Apply */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApplyPortfolioTemplate(selectedUtilityIndex, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Apply Template...</option>
                    {portfolioTemplates?.map((template: PortfolioTemplate) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Add Plant Button */}
                  <button
                    onClick={() => {
                      // Add a default plant
                      if (plantTemplates && plantTemplates.length > 0) {
                        const defaultTemplate = plantTemplates[0];
                        handleAddPlantToUtility(selectedUtilityIndex, {
                          plant_type: defaultTemplate.plant_type,
                          capacity_mw: 100,
                          name: `${defaultTemplate.name} 100MW`,
                          commissioning_year: setupData.startYear - 2,
                          retirement_year: setupData.startYear + 23
                        });
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center"
                  >
                    <PlusIcon className="w-5 h-5 mr-1" />
                    Add Plant
                  </button>
                </div>
              </div>
              
              {/* Plant List */}
              <div className="space-y-3">
                {setupData.utilityConfigs[selectedUtilityIndex]?.plants.map((plant, plantIndex) => {
                  const template = getPlantTemplate(plant.plant_type);
                  
                  return (
                    <div key={plantIndex} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {plant.plant_type.includes('coal') ? '🔥' :
                             plant.plant_type.includes('gas') ? '🔥' :
                             plant.plant_type === 'nuclear' ? '⚛️' :
                             plant.plant_type === 'solar' ? '☀️' :
                             plant.plant_type.includes('wind') ? '💨' :
                             plant.plant_type === 'battery' ? '🔋' : '⚡'}
                          </span>
                          <div>
                            <input
                              type="text"
                              value={plant.name}
                              onChange={(e) => {
                                const updatedPlants = [...setupData.utilityConfigs[selectedUtilityIndex].plants];
                                updatedPlants[plantIndex] = {
                                  ...updatedPlants[plantIndex],
                                  name: e.target.value
                                };
                                
                                setSetupData(prev => ({
                                  ...prev,
                                  utilityConfigs: prev.utilityConfigs.map((config, i) => 
                                    i === selectedUtilityIndex ? { ...config, plants: updatedPlants } : config
                                  )
                                }));
                              }}
                              className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500 font-medium"
                            />
                            <p className="text-sm text-gray-400 capitalize">
                              {plant.plant_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleRemovePlantFromUtility(selectedUtilityIndex, plantIndex)}
                          className="bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Capacity (MW)
                          </label>
                          <input
                            type="number"
                            value={plant.capacity_mw}
                            onChange={(e) => {
                              const updatedPlants = [...setupData.utilityConfigs[selectedUtilityIndex].plants];
                              updatedPlants[plantIndex] = {
                                ...updatedPlants[plantIndex],
                                capacity_mw: Number(e.target.value)
                              };
                              
                              setSetupData(prev => ({
                                ...prev,
                                utilityConfigs: prev.utilityConfigs.map((config, i) => 
                                  i === selectedUtilityIndex ? { ...config, plants: updatedPlants } : config
                                )
                              }));
                            }}
                            min="10"
                            max="2000"
                            step="10"
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Commissioning Year
                          </label>
                          <input
                            type="number"
                            value={plant.commissioning_year}
                            onChange={(e) => {
                              const updatedPlants = [...setupData.utilityConfigs[selectedUtilityIndex].plants];
                              updatedPlants[plantIndex] = {
                                ...updatedPlants[plantIndex],
                                commissioning_year: Number(e.target.value)
                              };
                              
                              setSetupData(prev => ({
                                ...prev,
                                utilityConfigs: prev.utilityConfigs.map((config, i) => 
                                  i === selectedUtilityIndex ? { ...config, plants: updatedPlants } : config
                                )
                              }));
                            }}
                            min="2020"
                            max={setupData.startYear + 5}
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Retirement Year
                          </label>
                          <input
                            type="number"
                            value={plant.retirement_year}
                            onChange={(e) => {
                              const updatedPlants = [...setupData.utilityConfigs[selectedUtilityIndex].plants];
                              updatedPlants[plantIndex] = {
                                ...updatedPlants[plantIndex],
                                retirement_year: Number(e.target.value)
                              };
                              
                              setSetupData(prev => ({
                                ...prev,
                                utilityConfigs: prev.utilityConfigs.map((config, i) => 
                                  i === selectedUtilityIndex ? { ...config, plants: updatedPlants } : config
                                )
                              }));
                            }}
                            min={plant.commissioning_year + 10}
                            max="2080"
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Plant Type: {template?.name || plant.plant_type}</span>
                          <span>
                            Capital Cost: ${template ? ((plant.capacity_mw * 1000 * template.overnight_cost_per_kw) / 1e6).toFixed(0) : '?'}M
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {setupData.utilityConfigs[selectedUtilityIndex]?.plants.length === 0 && (
                  <div className="bg-gray-700 rounded-lg p-6 text-center">
                    <BuildingOffice2Icon className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                    <p className="text-gray-400">No plants configured yet</p>
                    <p className="text-sm text-gray-500 mt-1">Add plants or apply a portfolio template</p>
                  </div>
                )}
              </div>
              
              {/* Portfolio Summary */}
              {setupData.utilityConfigs[selectedUtilityIndex]?.plants.length > 0 && (
                <div className="mt-4 bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Portfolio Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Total Plants:</span>
                      <span className="text-white ml-2">
                        {setupData.utilityConfigs[selectedUtilityIndex]?.plants.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Capacity:</span>
                      <span className="text-white ml-2">
                        {calculateTotalCapacity(setupData.utilityConfigs[selectedUtilityIndex]?.plants || [])} MW
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Technology Mix:</span>
                      <span className="text-white ml-2">
                        {Array.from(new Set(setupData.utilityConfigs[selectedUtilityIndex]?.plants.map(p => p.plant_type))).length} types
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Est. Capital Cost:</span>
                      <span className="text-white ml-2">
                        ${setupData.utilityConfigs[selectedUtilityIndex]?.plants.reduce((sum, plant) => {
                          const template = getPlantTemplate(plant.plant_type);
                          return sum + (template ? (plant.capacity_mw * 1000 * template.overnight_cost_per_kw) / 1e9 : 0);
                        }, 0).toFixed(1)}B
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Add New Plant Form */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-white mb-4">Add New Plant</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Plant Type
                  </label>
                  <select
                    id="new-plant-type"
                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {plantTemplates?.map(template => (
                      <option key={template.plant_type} value={template.plant_type}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Capacity (MW)
                  </label>
                  <input
                    type="number"
                    id="new-plant-capacity"
                    defaultValue={100}
                    min="10"
                    max="2000"
                    step="10"
                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="new-plant-name"
                    placeholder="Plant Name"
                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Commissioning Year
                  </label>
                  <input
                    type="number"
                    id="new-plant-commission"
                    defaultValue={setupData.startYear - 2}
                    min="2020"
                    max={setupData.startYear + 5}
                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      const plantType = (document.getElementById('new-plant-type') as HTMLSelectElement).value;
                      const capacity = Number((document.getElementById('new-plant-capacity') as HTMLInputElement).value);
                      const name = (document.getElementById('new-plant-name') as HTMLInputElement).value || 
                                  `${getPlantTemplate(plantType)?.name || 'New Plant'} ${capacity}MW`;
                      const commissionYear = Number((document.getElementById('new-plant-commission') as HTMLInputElement).value);
                      
                      const template = getPlantTemplate(plantType);
                      const retirementYear = commissionYear + (template?.economic_life_years || 25);
                      
                      handleAddPlantToUtility(selectedUtilityIndex, {
                        plant_type: plantType,
                        capacity_mw: capacity,
                        name,
                        commissioning_year: commissionYear,
                        retirement_year: retirementYear
                      });
                      
                      // Reset form
                      (document.getElementById('new-plant-name') as HTMLInputElement).value = '';
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    Add to Portfolio
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleCreateCustomPlants}
                disabled={createCustomPlantsMutation.isPending || setupData.utilityConfigs.some(config => config.plants.length === 0)}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg"
              >
                {createCustomPlantsMutation.isPending ? 'Creating...' : 'Create Plants'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Start Game */}
      {currentStep === 4 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <PlayIcon className="w-6 h-6 mr-2" />
            Step 4: Start Game
          </h2>

          <div className="space-y-6">
            {/* Game Summary */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
              <h3 className="font-medium text-green-300 mb-4">Game Setup Complete!</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="bg-blue-600 p-3 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-400">Simulation Period</p>
                  <p className="font-medium text-white">{setupData.startYear} - {setupData.endYear}</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-green-600 p-3 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <UserGroupIcon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-400">Utilities</p>
                  <p className="font-medium text-white">{createdUtilities.length}</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-purple-600 p-3 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <CurrencyDollarIcon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-400">Carbon Price</p>
                  <p className="font-medium text-white">${setupData.carbonPrice}/ton</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-yellow-600 p-3 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <BoltIcon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-400">Total Plants</p>
                  <p className="font-medium text-white">
                    {setupData.utilityConfigs.reduce((sum, config) => sum + config.plants.length, 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Utility Overview */}
            <div>
              <h3 className="font-medium text-white mb-4">Participating Utilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {createdUtilities.map((utility, index) => {
                  const config = setupData.utilityConfigs[index];
                  if (!config) return null;
                  
                  return (
                    <div key={utility.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <BuildingOffice2Icon className="w-6 h-6 text-green-400" />
                        <div>
                          <h4 className="font-medium text-white">{utility.username}</h4>
                          <p className="text-sm text-gray-400">Ready to compete</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Plants:</span>
                          <span className="text-blue-400">
                            {config.plants.length} plants
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Capacity:</span>
                          <span className="text-blue-400">
                            {calculateTotalCapacity(config.plants)} MW
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Budget:</span>
                          <span className="text-green-400">${(config.budget / 1e9).toFixed(1)}B</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className="text-green-400">Ready</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
              <h3 className="font-medium text-blue-300 mb-4">Next Steps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-white mb-3">For Instructor:</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Start the year planning phase</li>
                    <li>• Monitor utility participation</li>
                    <li>• Open bidding when ready</li>
                    <li>• Clear markets and advance years</li>
                    <li>• Trigger market events as needed</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-white mb-3">For Utilities:</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Log in with utility credentials</li>
                    <li>• Review initial portfolio</li>
                    <li>• Plan investment strategies</li>
                    <li>• Submit competitive bids</li>
                    <li>• Monitor market performance</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleStartGame}
                disabled={startGameMutation.isPending}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold"
              >
                {startGameMutation.isPending ? 'Starting...' : 'Start Game!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Session Info */}
      {currentSession && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Current Active Session</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Session Name</p>
              <p className="font-medium text-white">{currentSession.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Current Year</p>
              <p className="font-medium text-white">{currentSession.current_year}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Game State</p>
              <p className="font-medium text-green-400 capitalize">{currentSession.state.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSetup;