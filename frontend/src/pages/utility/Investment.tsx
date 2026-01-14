import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  BoltIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
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

interface PlantTemplate {
  plant_type: string;
  name: string;
  overnight_cost_per_kw: number;
  construction_time_years: number;
  economic_life_years: number;
  capacity_factor_base: number;
  heat_rate?: number;
  fuel_type?: string;
  fixed_om_per_kw_year: number;
  variable_om_per_mwh: number;
  co2_emissions_tons_per_mwh: number;
}

interface InvestmentSimulation {
  investment_summary: {
    plant_type: string;
    capacity_mw: number;
    total_capex: number;
    construction_start: number;
    commissioning_year: number;
    economic_life: number;
  };
  financing_structure: {
    debt_financing: number;
    equity_financing: number;
    debt_percentage: number;
    equity_percentage: number;
  };
  financial_impact: {
    current_budget: number;
    post_investment_budget: number;
    current_debt: number;
    post_investment_debt: number;
    budget_sufficient: boolean;
  };
  revenue_projections: {
    annual_generation_mwh: number;
    estimated_revenue_per_mwh: number;
    annual_revenue_projection: number;
    annual_fixed_costs: number;
    annual_ebitda: number;
    annual_cash_flow: number;
  };
  key_metrics: {
    capacity_factor: number;
    heat_rate?: number;
    emissions_per_mwh: number;
    construction_time_years: number;
  };
  recommendation: string;
}

const Investment: React.FC = () => {
  const { utilityId } = useParams<{ utilityId: string }>();
  const { currentSession } = useGameStore();
  const queryClient = useQueryClient();

  const [selectedPlantType, setSelectedPlantType] = useState<string>('');
  const [investmentCapacity, setInvestmentCapacity] = useState<number>(100);
  const [constructionStartYear, setConstructionStartYear] = useState<number>(currentSession?.current_year || 2025);
  const [showROICalculator, setShowROICalculator] = useState<boolean>(false);
  const [filterTechnology, setFilterTechnology] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('cost');

  // Get plant templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['plant-templates'],
    queryFn: ElectricityMarketAPI.getPlantTemplates,
  });

  // Get investment analysis
  const { data: investmentAnalysis } = useQuery({
    queryKey: ['investment-analysis', utilityId, currentSession?.id],
    queryFn: () => utilityId && currentSession ? 
      ElectricityMarketAPI.getInvestmentAnalysis(currentSession.id, utilityId) : null,
    enabled: !!utilityId && !!currentSession,
  });

  // Get investment simulation
  const { data: simulation, isLoading: simulationLoading } = useQuery({
    queryKey: ['investment-simulation', utilityId, currentSession?.id, selectedPlantType, investmentCapacity, constructionStartYear],
    queryFn: () => utilityId && currentSession && selectedPlantType ? 
      ElectricityMarketAPI.simulateInvestment(currentSession.id, utilityId, {
        plant_type: selectedPlantType,
        capacity_mw: investmentCapacity,
        construction_start_year: constructionStartYear
      }) : null,
    enabled: !!utilityId && !!currentSession && !!selectedPlantType && showROICalculator,
  });

  // Create plant mutation
  const createPlantMutation = useMutation({
    mutationFn: (plantData: {
      name: string;
      plant_type: string;
      capacity_mw: number;
      construction_start_year: number;
      commissioning_year: number;
      retirement_year: number;
    }) => {
      if (!utilityId || !currentSession) throw new Error('Missing required data');
      return ElectricityMarketAPI.createPowerPlant(currentSession.id, utilityId, plantData);
    },
    onSuccess: () => {
      toast.success('Investment approved! Plant construction started.');
      queryClient.invalidateQueries({ queryKey: ['utility-plants'] });
      queryClient.invalidateQueries({ queryKey: ['utility-financials'] });
      queryClient.invalidateQueries({ queryKey: ['investment-analysis'] });
      setShowROICalculator(false);
      setSelectedPlantType('');
      setInvestmentCapacity(100);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create plant';
      console.error('Investment error:', error);
      toast.error(errorMessage);
    }
  });

  // Process and filter templates
  const processedTemplates = useMemo(() => {
    if (!templates) return [];
    
    let filtered = templates;
    
    // Filter by technology
    if (filterTechnology !== 'all') {
      filtered = filtered.filter((template: PlantTemplate) => {
        const category = getCategoryFromType(template.plant_type);
        return category === filterTechnology;
      });
    }
    
    // Sort templates
    filtered.sort((a: PlantTemplate, b: PlantTemplate) => {
      switch (sortBy) {
        case 'cost':
          return a.overnight_cost_per_kw - b.overnight_cost_per_kw;
        case 'capacity_factor':
          return b.capacity_factor_base - a.capacity_factor_base;
        case 'construction_time':
          return a.construction_time_years - b.construction_time_years;
        case 'emissions':
          return a.co2_emissions_tons_per_mwh - b.co2_emissions_tons_per_mwh;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [templates, filterTechnology, sortBy]);

  const getCategoryFromType = (plantType: string): string => {
    if (plantType.includes('gas') || plantType === 'coal') return 'thermal';
    if (plantType === 'nuclear') return 'nuclear';
    if (plantType === 'solar' || plantType.includes('wind')) return 'renewable';
    if (plantType === 'battery') return 'storage';
    return 'other';
  };

  const getTechnologyIcon = (plantType: string) => {
    const category = getCategoryFromType(plantType);
    switch (category) {
      case 'thermal': return '🔥';
      case 'nuclear': return '⚛️';
      case 'renewable': return plantType === 'solar' ? '☀️' : '💨';
      case 'storage': return '🔋';
      default: return '⚡';
    }
  };

  const getTechnologyColor = (plantType: string): string => {
    const category = getCategoryFromType(plantType);
    switch (category) {
      case 'thermal': return 'bg-red-900 text-red-300';
      case 'nuclear': return 'bg-yellow-900 text-yellow-300';
      case 'renewable': return 'bg-green-900 text-green-300';
      case 'storage': return 'bg-purple-900 text-purple-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const handleInvestment = () => {
    if (!selectedPlantType || !simulation) return;
    
    const template = templates?.find((t: PlantTemplate) => t.plant_type === selectedPlantType);
    if (!template) return;

    // Check if investment is financially viable
    if (!simulation.financial_impact.budget_sufficient) {
      toast.error('Insufficient budget for this investment');
      return;
    }
    const plantData = {
      name: `${template.name} ${investmentCapacity}MW`,
      plant_type: selectedPlantType,
      capacity_mw: investmentCapacity,
      construction_start_year: constructionStartYear,
      commissioning_year: constructionStartYear + template.construction_time_years,
      retirement_year: constructionStartYear + template.construction_time_years + template.economic_life_years,
    };

    createPlantMutation.mutate(plantData);
  };

  // ROI Analysis Chart Data
  const roiData = simulation ? Array.from({ length: 10 }, (_, i) => {
    const year = constructionStartYear + i;
    const isOperating = year >= simulation.investment_summary.commissioning_year;
    const annualCashFlow = isOperating ? simulation.revenue_projections.annual_cash_flow : 0;
    const cumulativeCashFlow = isOperating ? annualCashFlow * (year - simulation.investment_summary.commissioning_year + 1) : 0;
    
    return {
      year,
      annualCashFlow: annualCashFlow / 1e6, // Convert to millions
      cumulativeCashFlow: (cumulativeCashFlow - simulation.investment_summary.total_capex) / 1e6,
      breakeven: 0
    };
  }) : [];

  if (templatesLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading investment opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Investment Center</h1>
          <p className="text-gray-400">Strategic capacity planning and portfolio optimization</p>
        </div>
        
        {investmentAnalysis && (
          <div className="text-right">
            <p className="text-sm text-gray-400">Available Investment Capacity</p>
            <p className="text-2xl font-bold text-green-400">
              ${(investmentAnalysis.financial_position.available_investment_capacity / 1e9).toFixed(1)}B
            </p>
          </div>
        )}
      </div>

      {/* Investment Capacity Alert */}
      {investmentAnalysis && investmentAnalysis.financial_position.available_investment_capacity <= 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="font-semibold text-red-300">Limited Investment Capacity</h3>
              <p className="text-red-200 text-sm">
                Current debt-to-equity ratio limits new investments. Consider improving financial position.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Technology Filter</label>
              <select
                value={filterTechnology}
                onChange={(e) => setFilterTechnology(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Technologies</option>
                <option value="thermal">Thermal (Coal, Gas)</option>
                <option value="nuclear">Nuclear</option>
                <option value="renewable">Renewables</option>
                <option value="storage">Energy Storage</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="cost">Capital Cost</option>
                <option value="capacity_factor">Capacity Factor</option>
                <option value="construction_time">Construction Time</option>
                <option value="emissions">Emissions</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowROICalculator(!showROICalculator)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showROICalculator 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showROICalculator ? 'Hide Calculator' : 'Show ROI Calculator'}
            </button>
          </div>
        </div>
      </div>

      {/* Plant Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedTemplates.map((template: PlantTemplate) => (
          <div 
            key={template.plant_type}
            className={`bg-gray-800 rounded-lg p-6 border transition-all cursor-pointer ${
              selectedPlantType === template.plant_type 
                ? 'border-blue-500 bg-blue-900/20' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setSelectedPlantType(template.plant_type)}
          >
            {/* Plant Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getTechnologyIcon(template.plant_type)}</span>
                <div>
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getTechnologyColor(template.plant_type)}`}>
                    {getCategoryFromType(template.plant_type).toUpperCase()}
                  </span>
                </div>
              </div>
              {selectedPlantType === template.plant_type && (
                <CheckCircleIcon className="w-6 h-6 text-blue-400" />
              )}
            </div>

            {/* Key Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Capital Cost:</span>
                <span className="text-white font-medium">${template.overnight_cost_per_kw.toLocaleString()}/kW</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Capacity Factor:</span>
                <span className="text-green-400 font-medium">{(template.capacity_factor_base * 100).toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Construction:</span>
                <span className="text-blue-400 font-medium">{template.construction_time_years} years</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Economic Life:</span>
                <span className="text-purple-400 font-medium">{template.economic_life_years} years</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">CO₂ Emissions:</span>
                <span className={`font-medium ${template.co2_emissions_tons_per_mwh === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {template.co2_emissions_tons_per_mwh.toFixed(2)} t/MWh
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Fixed O&M:</span>
                <span className="text-gray-300">${template.fixed_om_per_kw_year}/kW/yr</span>
              </div>

              {template.fuel_type && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Fuel Type:</span>
                  <span className="text-orange-400 capitalize">{template.fuel_type.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            {/* Cost Analysis for 100MW */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Example: 100 MW Plant</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total CAPEX:</span>
                  <span className="text-white font-medium">
                    ${(100 * 1000 * template.overnight_cost_per_kw / 1e6).toFixed(0)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Annual Fixed O&M:</span>
                  <span className="text-gray-300">
                    ${(100 * 1000 * template.fixed_om_per_kw_year / 1e6).toFixed(1)}M/yr
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ROI Calculator */}
      {showROICalculator && selectedPlantType && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Investment ROI Calculator
          </h3>

          {/* Investment Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Plant Capacity (MW)
              </label>
              <input
                type="number"
                value={investmentCapacity}
                onChange={(e) => setInvestmentCapacity(Number(e.target.value))}
                min="1"
                max="2000"
                step="10"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Construction Start Year
              </label>
              <select
                value={constructionStartYear}
                onChange={(e) => setConstructionStartYear(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = (currentSession?.current_year || 2025) + i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleInvestment}
                disabled={
                  !simulation?.financial_impact.budget_sufficient || 
                  createPlantMutation.isPending ||
                  !selectedPlantType ||
                  investmentCapacity <= 0
                }
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {createPlantMutation.isPending ? 'Processing...' : 
                 !selectedPlantType ? 'Select Plant Type First' :
                 !simulation?.financial_impact.budget_sufficient ? 'Insufficient Budget' :
                 'Approve Investment'}
              </button>
            </div>
          </div>

          {/* Financial Analysis */}
          {simulation && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Investment Summary */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Investment Summary</h4>
                
                <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total CAPEX:</span>
                    <span className="text-white font-medium">
                      ${(simulation.investment_summary.total_capex / 1e9).toFixed(2)}B
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Debt Financing (70%):</span>
                    <span className="text-red-400">
                      ${(simulation.financing_structure.debt_financing / 1e9).toFixed(2)}B
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Equity Required (30%):</span>
                    <span className="text-blue-400">
                      ${(simulation.financing_structure.equity_financing / 1e9).toFixed(2)}B
                    </span>
                  </div>
                  
                  <div className="flex justify-between border-t border-gray-600 pt-2">
                    <span className="text-gray-400">Commissioning Year:</span>
                    <span className="text-green-400 font-medium">
                      {simulation.investment_summary.commissioning_year}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Economic Life:</span>
                    <span className="text-purple-400">
                      {simulation.investment_summary.economic_life} years
                    </span>
                  </div>
                </div>

                {/* Financial Impact */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-3">Financial Impact</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Budget:</span>
                      <span className="text-white">
                        ${(simulation.financial_impact.current_budget / 1e9).toFixed(1)}B
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Post-Investment Budget:</span>
                      <span className={simulation.financial_impact.budget_sufficient ? 'text-green-400' : 'text-red-400'}>
                        ${(simulation.financial_impact.post_investment_budget / 1e9).toFixed(1)}B
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Budget Sufficient:</span>
                      <span className={simulation.financial_impact.budget_sufficient ? 'text-green-400' : 'text-red-400'}>
                        {simulation.financial_impact.budget_sufficient ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {!simulation.financial_impact.budget_sufficient && (
                      <div className="mt-2 p-2 bg-red-900/30 rounded text-xs text-red-300">
                        ⚠️ This investment would exceed your available budget. Consider reducing capacity or improving financial position.
                      </div>
                    )}
                  </div>
                </div>

                {/* Revenue Projections */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-3">Annual Operations (Once Online)</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Generation:</span>
                      <span className="text-blue-400">
                        {(simulation.revenue_projections.annual_generation_mwh / 1000).toLocaleString()} GWh/yr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Revenue:</span>
                      <span className="text-green-400">
                        ${(simulation.revenue_projections.annual_revenue_projection / 1e6).toFixed(0)}M/yr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fixed Costs:</span>
                      <span className="text-red-400">
                        ${(simulation.revenue_projections.annual_fixed_costs / 1e6).toFixed(0)}M/yr
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600 pt-2">
                      <span className="text-gray-400">Annual Cash Flow:</span>
                      <span className={simulation.revenue_projections.annual_cash_flow > 0 ? 'text-green-400' : 'text-red-400'}>
                        ${(simulation.revenue_projections.annual_cash_flow / 1e6).toFixed(0)}M/yr
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROI Chart */}
              <div>
                <h4 className="font-semibold text-white mb-4">10-Year Cash Flow Projection</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={roiData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [
                          `$${value.toFixed(1)}M`, 
                          name === 'cumulativeCashFlow' ? 'Cumulative Cash Flow' : 'Annual Cash Flow'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeCashFlow" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="Cumulative"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="breakeven" 
                        stroke="#6B7280" 
                        strokeDasharray="5 5"
                        name="Break-even"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Recommendation */}
                <div className={`mt-4 p-4 rounded-lg ${
                  simulation.recommendation.includes('Proceed') 
                    ? 'bg-green-900/20 border border-green-700' 
                    : 'bg-yellow-900/20 border border-yellow-700'
                }`}>
                  <div className="flex items-start space-x-2">
                    {simulation.recommendation.includes('Proceed') ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5" />
                    ) : (
                      <InformationCircleIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-white">Investment Recommendation</p>
                      <p className="text-sm text-gray-300 mt-1">{simulation.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Investment;