import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DocumentTextIcon,
  CurrencyDollarIcon,
  BoltIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalculatorIcon,
  FireIcon
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
  Line
} from 'recharts';
import toast from 'react-hot-toast';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

interface BidFormData {
  plant_id: string;
  off_peak_quantity: number;
  shoulder_quantity: number;
  peak_quantity: number;
  off_peak_price: number;
  shoulder_price: number;
  peak_price: number;
}

const Bidding: React.FC = () => {
  const { utilityId } = useParams<{ utilityId: string }>();
  const { currentSession, setCurrentSession } = useGameStore();
  const queryClient = useQueryClient();

  const [selectedPlant, setSelectedPlant] = useState<string>('');
  const [bidData, setBidData] = useState<BidFormData>({
    plant_id: '',
    off_peak_quantity: 0,
    shoulder_quantity: 0,
    peak_quantity: 0,
    off_peak_price: 0,
    shoulder_price: 0,
    peak_price: 0,
  });
  const [showCalculator, setShowCalculator] = useState<boolean>(false);

  // Get fresh session data with frequent updates
  const { data: sessionData } = useQuery({
    queryKey: ['game-session', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getGameSession(currentSession.id) : null,
    enabled: !!currentSession,
    refetchInterval: 3000, // Check every 3 seconds for state changes
    onSuccess: (data) => {
      if (data && data.state !== currentSession?.state) {
        console.log('🔄 Game state updated in bidding:', data.state);
        setCurrentSession(data);
      }
    }
  });

  // Use the most up-to-date session data
  const activeSession = sessionData || currentSession;

  // Get utility plants available for bidding
  const { data: plants, isLoading: plantsLoading } = useQuery({
    queryKey: ['utility-plants', utilityId, activeSession?.id],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getPowerPlants(currentSession.id, utilityId) : null,
    enabled: !!utilityId && !!activeSession,
  });

  // Get existing bids for current year
  const { data: existingBids, isLoading: bidsLoading } = useQuery({
    queryKey: ['utility-bids', utilityId, activeSession?.id, activeSession?.current_year],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getYearlyBids(currentSession.id, currentSession.current_year, utilityId) : null,
    enabled: !!utilityId && !!activeSession,
  });

  // Get fuel prices for cost calculations
  const { data: fuelPrices } = useQuery({
    queryKey: ['fuel-prices', activeSession?.id, activeSession?.current_year],
    queryFn: () => currentSession ? 
      ElectricityMarketAPI.getFuelPrices(currentSession.id, currentSession.current_year) : null,
    enabled: !!activeSession,
  });

  // Get renewable availability for current year
  const { data: renewableAvailability } = useQuery({
    queryKey: ['renewable-availability', activeSession?.id, activeSession?.current_year],
    queryFn: () => currentSession ? 
      ElectricityMarketAPI.getRenewableAvailability(currentSession.id, currentSession.current_year) : null,
    enabled: !!activeSession,
  });

  // Get plant economics for selected plant
  const { data: plantEconomics } = useQuery({
    queryKey: ['plant-economics', activeSession?.id, selectedPlant, activeSession?.current_year],
    queryFn: () => currentSession && selectedPlant ? 
      ElectricityMarketAPI.getPlantEconomics(currentSession.id, selectedPlant, currentSession.current_year) : null,
    enabled: !!activeSession && !!selectedPlant,
  });

  // Submit bid mutation
  const submitBidMutation = useMutation({
    mutationFn: (bidData: BidFormData) => {
      if (!utilityId || !currentSession) throw new Error('Missing required data');
      return ElectricityMarketAPI.submitYearlyBid(currentSession.id, utilityId, {
        ...bidData,
        year: currentSession.current_year,
      });
    },
    onSuccess: () => {
      toast.success('Bid submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['utility-bids'] });
      // Reset form
      setBidData({
        plant_id: '',
        off_peak_quantity: 0,
        shoulder_quantity: 0,
        peak_quantity: 0,
        off_peak_price: 0,
        shoulder_price: 0,
        peak_price: 0,
      });
      setSelectedPlant('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to submit bid');
    }
  });

  // Filter operating plants
  const operatingPlants = plants?.filter(plant => 
    plant.status === 'operating' && 
    plant.commissioning_year <= (activeSession?.current_year || 2025)
  ) || [];

  // Calculate marginal costs
  const calculateMarginalCost = (plant: any) => {
    if (!plantEconomics || !fuelPrices) return plant.variable_om_per_mwh;
    
    let marginalCost = plant.variable_om_per_mwh;
    
    // Add fuel cost
    if (plant.fuel_type && plant.heat_rate) {
      const fuelPrice = fuelPrices.fuel_prices[plant.fuel_type] || 0;
      const fuelCost = (plant.heat_rate * fuelPrice) / 1000; // Convert BTU to MMBtu
      marginalCost += fuelCost;
    }
    
    // Add carbon cost (simplified)
    const carbonCost = getPlantEmissions(plant.plant_type) * (activeSession?.carbon_price_per_ton || 0);
    marginalCost += carbonCost;
    
    return marginalCost;
  };

  const getPlantEmissions = (plantType: string): number => {
    const emissions: Record<string, number> = {
      'coal': 0.95,
      'natural_gas_cc': 0.35,
      'natural_gas_ct': 0.55,
      'nuclear': 0.0,
      'solar': 0.0,
      'wind_onshore': 0.0,
      'wind_offshore': 0.0,
      'battery': 0.0,
      'hydro': 0.0,
    };
    return emissions[plantType] || 0;
  };

  const handlePlantSelect = (plantId: string) => {
    setSelectedPlant(plantId);
    const plant = operatingPlants.find(p => p.id === plantId);
    if (plant) {
      const marginalCost = calculateMarginalCost(plant);
      setBidData({
        plant_id: plantId,
        off_peak_quantity: plant.capacity_mw * 0.8, // Default to 80% capacity
        shoulder_quantity: plant.capacity_mw * 0.9,
        peak_quantity: plant.capacity_mw,
        off_peak_price: marginalCost,
        shoulder_price: marginalCost * 1.1,
        peak_price: marginalCost * 1.2,
      });
    }
  };

  const handleSubmitBid = () => {
    if (!bidData.plant_id) {
      toast.error('Please select a plant');
      return;
    }
    
    if (bidData.off_peak_price <= 0 || bidData.shoulder_price <= 0 || bidData.peak_price <= 0) {
      toast.error('All prices must be greater than zero');
      return;
    }
    
    submitBidMutation.mutate(bidData);
  };

  // Load period information
  const loadPeriods = [
    {
      id: 'off_peak',
      name: 'Off-Peak',
      hours: 5000,
      description: 'Night and weekend hours',
      color: 'bg-blue-600',
      quantityKey: 'off_peak_quantity' as keyof BidFormData,
      priceKey: 'off_peak_price' as keyof BidFormData,
    },
    {
      id: 'shoulder',
      name: 'Shoulder',
      hours: 2500,
      description: 'Daytime non-peak hours',
      color: 'bg-yellow-600',
      quantityKey: 'shoulder_quantity' as keyof BidFormData,
      priceKey: 'shoulder_price' as keyof BidFormData,
    },
    {
      id: 'peak',
      name: 'Peak',
      hours: 1260,
      description: 'Evening high-demand hours',
      color: 'bg-red-600',
      quantityKey: 'peak_quantity' as keyof BidFormData,
      priceKey: 'peak_price' as keyof BidFormData,
    },
  ];

  // Revenue projection data
  const revenueProjection = loadPeriods.map(period => ({
    period: period.name,
    hours: period.hours,
    quantity: bidData[period.quantityKey] as number,
    price: bidData[period.priceKey] as number,
    revenue: (bidData[period.quantityKey] as number) * (bidData[period.priceKey] as number) * period.hours / 1000000, // Convert to millions
  }));

  if (plantsLoading || bidsLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading bidding interface...</p>
        </div>
      </div>
    );
  }

  if (!activeSession) {
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

  if (activeSession.state !== 'bidding_open') {
    return (
      <div className="p-6">
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 text-center">
          <ClockIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-400 mb-2">Bidding Not Open</h3>
          <p className="text-gray-300 mb-4">
            Current market state: <span className="capitalize">{activeSession.state.replace('_', ' ')}</span>
          </p>
          <p className="text-gray-400">Wait for the instructor to open the bidding phase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Annual Bidding</h1>
          <p className="text-gray-400">
            Submit bids for Year {activeSession.current_year} • All Load Periods
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-400">Bidding Status</p>
          <p className="text-lg font-semibold text-green-400">OPEN</p>
        </div>
      </div>

      {/* Bidding Instructions */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-300">Bidding Instructions</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">📊 Load Periods</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• <strong>Off-Peak:</strong> 5,000 hours (nights, weekends)</li>
                  <li>• <strong>Shoulder:</strong> 2,500 hours (daytime non-peak)</li>
                  <li>• <strong>Peak:</strong> 1,260 hours (evening high-demand)</li>
                  <li>• Submit separate bids for each period</li>
                  <li>• Consider different pricing strategies</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">💰 Pricing Strategy</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Price above marginal cost for profit</li>
                  <li>• Peak hours typically command higher prices</li>
                  <li>• Consider fuel costs and carbon pricing</li>
                  <li>• Balance competitiveness with profitability</li>
                  <li>• Use the calculator for cost guidance</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">⚡ Capacity Bidding</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Bid up to your plant's maximum capacity</li>
                  <li>• Consider plant availability and maintenance</li>
                  <li>• Lower bids for off-peak periods are common</li>
                  <li>• Renewable plants bid at full capacity</li>
                  <li>• Storage can bid negative (charging)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Bids Summary */}
      {existingBids && existingBids.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Submitted Bids for Year {activeSession.current_year}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400">Plant</th>
                  <th className="text-left py-2 text-gray-400">Off-Peak</th>
                  <th className="text-left py-2 text-gray-400">Shoulder</th>
                  <th className="text-left py-2 text-gray-400">Peak</th>
                  <th className="text-left py-2 text-gray-400">Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {existingBids.map((bid) => {
                  const plant = operatingPlants.find(p => p.id === bid.plant_id);
                  const totalRevenue = (
                    bid.off_peak_quantity * bid.off_peak_price * 5000 +
                    bid.shoulder_quantity * bid.shoulder_price * 2500 +
                    bid.peak_quantity * bid.peak_price * 1260
                  ) / 1000000; // Convert to millions
                  
                  return (
                    <tr key={bid.id} className="border-b border-gray-700/50">
                      <td className="py-2 text-white font-medium">{plant?.name || 'Unknown Plant'}</td>
                      <td className="py-2">
                        <div className="text-white">{bid.off_peak_quantity.toLocaleString()} MW</div>
                        <div className="text-blue-400 text-xs">${bid.off_peak_price.toFixed(2)}/MWh</div>
                      </td>
                      <td className="py-2">
                        <div className="text-white">{bid.shoulder_quantity.toLocaleString()} MW</div>
                        <div className="text-yellow-400 text-xs">${bid.shoulder_price.toFixed(2)}/MWh</div>
                      </td>
                      <td className="py-2">
                        <div className="text-white">{bid.peak_quantity.toLocaleString()} MW</div>
                        <div className="text-red-400 text-xs">${bid.peak_price.toFixed(2)}/MWh</div>
                      </td>
                      <td className="py-2 text-green-400 font-medium">
                        ${totalRevenue.toFixed(1)}M
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bid Submission Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plant Selection and Bid Form */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Submit New Bid</h3>
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                showCalculator 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <CalculatorIcon className="w-4 h-4 inline mr-1" />
              Calculator
            </button>
          </div>

          {/* Plant Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Plant
            </label>
            <select
              value={selectedPlant}
              onChange={(e) => handlePlantSelect(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Choose a plant...</option>
              {operatingPlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name} ({plant.capacity_mw} MW - {plant.plant_type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Bid Form */}
          {selectedPlant && (
            <div className="space-y-6">
              {loadPeriods.map((period) => (
                <div key={period.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-4 h-4 rounded-full ${period.color}`} />
                    <div>
                      <h4 className="font-medium text-white">{period.name} Period</h4>
                      <p className="text-sm text-gray-400">{period.description} • {period.hours.toLocaleString()} hours/year</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Quantity (MW)
                      </label>
                      <input
                        type="number"
                        value={bidData[period.quantityKey] as number}
                        onChange={(e) => setBidData({
                          ...bidData,
                          [period.quantityKey]: Number(e.target.value)
                        })}
                        min="0"
                        max={operatingPlants.find(p => p.id === selectedPlant)?.capacity_mw || 0}
                        step="0.1"
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Price ($/MWh)
                      </label>
                      <input
                        type="number"
                        value={bidData[period.priceKey] as number}
                        onChange={(e) => setBidData({
                          ...bidData,
                          [period.priceKey]: Number(e.target.value)
                        })}
                        min="0"
                        max="1000"
                        step="0.01"
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-400">
                    Period Revenue: ${(((bidData[period.quantityKey] as number) * (bidData[period.priceKey] as number) * period.hours) / 1000000).toFixed(2)}M
                  </div>
                </div>
              ))}

              {/* Submit Button */}
              <button
                onClick={handleSubmitBid}
                disabled={submitBidMutation.isPending || !selectedPlant}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {submitBidMutation.isPending ? 'Submitting...' : 'Submit Bid'}
              </button>
            </div>
          )}
        </div>

        {/* Revenue Projection and Calculator */}
        <div className="space-y-6">
          {/* Revenue Projection Chart */}
          {selectedPlant && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Projection</h3>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueProjection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="period" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}M`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Annual Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Total Revenue:</span>
                    <span className="text-green-400 ml-2 font-medium">
                      ${revenueProjection.reduce((sum, period) => sum + period.revenue, 0).toFixed(2)}M
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Energy:</span>
                    <span className="text-blue-400 ml-2 font-medium">
                      {revenueProjection.reduce((sum, period) => sum + (period.quantity * period.hours), 0).toLocaleString()} MWh
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Avg Price:</span>
                    <span className="text-white ml-2">
                      ${(revenueProjection.reduce((sum, period) => sum + period.revenue, 0) * 1000000 / 
                        revenueProjection.reduce((sum, period) => sum + (period.quantity * period.hours), 0)).toFixed(2)}/MWh
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Capacity Factor:</span>
                    <span className="text-white ml-2">
                      {selectedPlant ? 
                        ((revenueProjection.reduce((sum, period) => sum + (period.quantity * period.hours), 0) / 
                          ((operatingPlants.find(p => p.id === selectedPlant)?.capacity_mw || 1) * 8760)) * 100).toFixed(1)
                        : '0'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cost Calculator */}
          {showCalculator && selectedPlant && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CalculatorIcon className="w-5 h-5 mr-2" />
                Cost Calculator
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">Marginal Cost Breakdown</h4>
                  {plantEconomics ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Variable O&M:</span>
                      <span className="text-white">${plantEconomics.marginal_cost_per_mwh.toFixed(2)}/MWh</span>
                    </div>
                    {plantEconomics.fuel_costs > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fuel Cost:</span>
                        <span className="text-orange-400">${plantEconomics.fuel_costs.toFixed(2)}/MMBtu</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Carbon Cost:</span>
                      <span className="text-yellow-400">
                        ${(getPlantEmissions(operatingPlants.find(p => p.id === selectedPlant)?.plant_type || '') * 
                          (activeSession?.carbon_price_per_ton || 0)).toFixed(2)}/MWh
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600 pt-2">
                      <span className="text-gray-400 font-medium">Total Marginal Cost:</span>
                      <span className="text-white font-medium">${calculateMarginalCost(operatingPlants.find(p => p.id === selectedPlant)).toFixed(2)}/MWh</span>
                    </div>
                  </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Estimated Marginal Cost:</span>
                        <span className="text-white font-medium">${calculateMarginalCost(operatingPlants.find(p => p.id === selectedPlant)).toFixed(2)}/MWh</span>
                      </div>
                      <p className="text-xs text-gray-400">Detailed breakdown will be available once plant economics are loaded</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">Pricing Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    {loadPeriods.map((period) => {
                      const marginalCost = calculateMarginalCost(operatingPlants.find(p => p.id === selectedPlant));
                      const multipliers = { off_peak: 1.0, shoulder: 1.1, peak: 1.2 };
                      const recommendedPrice = marginalCost * multipliers[period.id as keyof typeof multipliers];
                      
                      return (
                        <div key={period.id} className="flex justify-between">
                          <span className="text-gray-400">{period.name}:</span>
                          <span className="text-white">${recommendedPrice.toFixed(2)}/MWh</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    * Recommendations include 0-20% markup over marginal cost
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Market Context */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Market Context</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Current Market Conditions</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Year:</span>
                    <span className="text-white ml-2">{activeSession.current_year}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Carbon Price:</span>
                    <span className="text-yellow-400 ml-2">${activeSession.carbon_price_per_ton}/ton</span>
                  </div>
                </div>
              </div>

              {fuelPrices && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3 flex items-center">
                    <FireIcon className="w-4 h-4 mr-2" />
                    Fuel Prices
                  </h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(fuelPrices.fuel_prices).map(([fuel, price]) => (
                      <div key={fuel} className="flex justify-between">
                        <span className="text-gray-400 capitalize">{fuel.replace('_', ' ')}:</span>
                        <span className="text-white">${(price as number).toFixed(2)}/MMBtu</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h4 className="font-medium text-blue-300 mb-2">Bidding Tips</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Price competitively but above marginal cost</li>
                  <li>• Peak periods typically have higher clearing prices</li>
                  <li>• Consider your competitors' likely strategies</li>
                  {renewableAvailability && renewableAvailability.impact_analysis.recommendations.map((rec: string, index: number) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bidding;