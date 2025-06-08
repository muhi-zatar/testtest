import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CogIcon,
  UserGroupIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BuildingOffice2Icon,
  BoltIcon,
  CurrencyDollarIcon,
  ClockIcon
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

interface GameSetupData {
  sessionName: string;
  startYear: number;
  endYear: number;
  carbonPrice: number;
  numberOfUtilities: number;
  utilityNames: string[];
  portfolioAssignments: Record<string, string>;
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
    utilityNames: [],
    portfolioAssignments: {}
  });

  // Initialize utility names with unique identifiers
  useEffect(() => {
    if (setupData.utilityNames.length === 0) {
      const sessionId = Date.now().toString().slice(-4);
      const newNames = Array.from({ length: setupData.numberOfUtilities }, (_, i) => `Utility ${i + 1} (${sessionId})`);
      setSetupData(prev => ({ ...prev, utilityNames: newNames }));
    }
  }, [setupData.numberOfUtilities, setupData.utilityNames.length]);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [createdUtilities, setCreatedUtilities] = useState<Array<{id: string, username: string}>>([]);
  const [gameSessionId, setGameSessionId] = useState<string>('');

  // Get portfolio templates
  const { data: portfolioTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: ElectricityMarketAPI.getPortfolioTemplates,
  });

  // Get existing utilities for the current session
  const { data: existingUtilities } = useQuery({
    queryKey: ['game-utilities', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getAllUtilities(currentSession.id) : null,
    enabled: !!currentSession,
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
    onError: () => {
      toast.error('Failed to create game session');
    }
  });

  // Create utilities mutation
  const createUtilitiesMutation = useMutation({
    mutationFn: async (utilityNames: string[]) => {
      const utilities = [];
      for (const name of utilityNames) {
        // Create unique username by adding timestamp or session ID
        const uniqueUsername = `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString().slice(-6)}`;
        const utility = await ElectricityMarketAPI.createUser({
          username: uniqueUsername,
          user_type: 'utility'
        });
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

  // Assign portfolios mutation
  const assignPortfoliosMutation = useMutation({
    mutationFn: (assignments: Record<string, string>) => {
      if (!gameSessionId) throw new Error('No game session');
      return ElectricityMarketAPI.bulkAssignPortfolios(gameSessionId, assignments);
    },
    onSuccess: () => {
      toast.success('Portfolios assigned successfully!');
      setCurrentStep(4);
      queryClient.invalidateQueries({ queryKey: ['game-utilities'] });
    },
    onError: () => {
      toast.error('Failed to assign portfolios');
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
    const newNames = Array.from({ length: count }, (_, i) => `Utility ${i + 1} (${sessionId})`);
    setSetupData(prev => ({
      ...prev,
      numberOfUtilities: count,
      utilityNames: newNames,
      portfolioAssignments: {}
    }));
  };

  const handleUtilityNameChange = (index: number, name: string) => {
    setSetupData(prev => ({
      ...prev,
      utilityNames: prev.utilityNames.map((n, i) => i === index ? name : n)
    }));
  };

  const handlePortfolioAssignment = (utilityId: string, templateId: string) => {
    setSetupData(prev => ({
      ...prev,
      portfolioAssignments: {
        ...prev.portfolioAssignments,
        [utilityId]: templateId
      }
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
    createUtilitiesMutation.mutate(setupData.utilityNames);
  };

  const handleAssignPortfolios = () => {
    assignPortfoliosMutation.mutate(setupData.portfolioAssignments);
  };

  const handleStartGame = () => {
    startGameMutation.mutate();
  };

  const handleLoadSampleData = () => {
    loadSampleDataMutation.mutate();
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return !!gameSessionId;
      case 2: return createdUtilities.length > 0;
      case 3: return Object.keys(setupData.portfolioAssignments).length === createdUtilities.length;
      case 4: return true;
      default: return false;
    }
  };

  const canProceedToStep = (step: number): boolean => {
    return step <= currentStep || isStepComplete(step - 1);
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
            <h3 className="font-medium text-white">Assign Portfolios</h3>
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

          <div className="mt-6">
            <h4 className="font-medium text-white mb-4">Utility Names</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {setupData.utilityNames.map((name, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Utility {index + 1}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleUtilityNameChange(index, e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
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
                Each utility will be created with a $2B starting budget and can participate in the electricity market.
                Utilities will compete by building plants, submitting bids, and optimizing their portfolios.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {setupData.utilityNames.map((name, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <BuildingOffice2Icon className="w-8 h-8 text-green-400" />
                  <div>
                    <h4 className="font-medium text-white">{name}</h4>
                    <p className="text-sm text-gray-400">Starting Budget: $2.0B</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
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

      {/* Step 3: Assign Portfolios */}
      {currentStep === 3 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <BoltIcon className="w-6 h-6 mr-2" />
            Step 3: Assign Initial Portfolios
          </h2>

          {templatesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading portfolio templates...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Portfolio Templates */}
              <div>
                <h3 className="font-medium text-white mb-4">Available Portfolio Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {portfolioTemplates?.map((template: PortfolioTemplate) => (
                    <div key={template.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h4 className="font-medium text-white mb-2">{template.name}</h4>
                      <p className="text-sm text-gray-400 mb-3">{template.description}</p>
                      <div className="space-y-1">
                        {template.plants.map((plant, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-gray-300">{plant.name}</span>
                            <span className="text-blue-400">{plant.capacity_mw} MW</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Total Capacity:</span>
                          <span className="text-white font-medium">
                            {template.plants.reduce((sum, plant) => sum + plant.capacity_mw, 0)} MW
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Utility Assignments */}
              <div>
                <h3 className="font-medium text-white mb-4">Assign Portfolios to Utilities</h3>
                <div className="space-y-4">
                  {createdUtilities.map((utility) => (
                    <div key={utility.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <BuildingOffice2Icon className="w-6 h-6 text-green-400" />
                          <div>
                            <h4 className="font-medium text-white">{utility.username}</h4>
                            <p className="text-sm text-gray-400">Utility ID: {utility.id}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <select
                            value={setupData.portfolioAssignments[utility.id] || ''}
                            onChange={(e) => handlePortfolioAssignment(utility.id, e.target.value)}
                            className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Select Portfolio...</option>
                            {portfolioTemplates?.map((template: PortfolioTemplate) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                          
                          {setupData.portfolioAssignments[utility.id] && (
                            <CheckCircleIcon className="w-6 h-6 text-green-400" />
                          )}
                        </div>
                      </div>
                      
                      {setupData.portfolioAssignments[utility.id] && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <p className="text-sm text-gray-400">
                            Assigned: {portfolioTemplates?.find((t: PortfolioTemplate) => t.id === setupData.portfolioAssignments[utility.id])?.name}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
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
                  onClick={handleAssignPortfolios}
                  disabled={
                    assignPortfoliosMutation.isPending || 
                    Object.keys(setupData.portfolioAssignments).length !== createdUtilities.length
                  }
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg"
                >
                  {assignPortfoliosMutation.isPending ? 'Assigning...' : 'Assign Portfolios'}
                </button>
              </div>
            </div>
          )}
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
                  <p className="text-sm text-gray-400">Total Capacity</p>
                  <p className="font-medium text-white">
                    {existingUtilities ? 
                      existingUtilities.reduce((sum: number, utility: any) => sum + (utility.total_capacity_mw || 0), 0).toLocaleString() 
                      : '0'} MW
                  </p>
                </div>
              </div>
            </div>

            {/* Utility Overview */}
            <div>
              <h3 className="font-medium text-white mb-4">Participating Utilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {createdUtilities.map((utility) => (
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
                        <span className="text-gray-400">Portfolio:</span>
                        <span className="text-blue-400">
                          {portfolioTemplates?.find((t: PortfolioTemplate) => t.id === setupData.portfolioAssignments[utility.id])?.name || 'Assigned'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Budget:</span>
                        <span className="text-green-400">$2.0B</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-green-400">Ready</span>
                      </div>
                    </div>
                  </div>
                ))}
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

export default GameSetup