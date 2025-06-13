import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface GameSession {
  id: string;
  name: string;
  operator_id: string;
  current_year: number;
  start_year: number;
  end_year: number;
  state: string;
  carbon_price_per_ton: number;
}

export interface PowerPlant {
  id: string;
  utility_id: string;
  name: string;
  plant_type: string;
  capacity_mw: number;
  construction_start_year: number;
  commissioning_year: number;
  retirement_year: number;
  status: string;
  capital_cost_total: number;
  fixed_om_annual: number;
  variable_om_per_mwh: number;
  capacity_factor: number;
  heat_rate?: number;
  fuel_type?: string;
}

export interface YearlyBid {
  id: string;
  utility_id: string;
  plant_id: string;
  year: number;
  off_peak_quantity: number;
  shoulder_quantity: number;
  peak_quantity: number;
  off_peak_price: number;
  shoulder_price: number;
  peak_price: number;
}

export interface MarketResult {
  year: number;
  period: string;
  clearing_price: number;
  cleared_quantity: number;
  total_energy: number;
  marginal_plant?: string;
}

export interface UtilityFinancials {
  utility_id: string;
  budget: number;
  debt: number;
  equity: number;
  total_capital_invested: number;
  annual_fixed_costs: number;
  plant_count: number;
  total_capacity_mw: number;
}

interface GameStore {
  // User state
  role: 'instructor' | 'utility' | null;
  utilityId: string | null;
  
  // Game session state
  currentSession: GameSession | null;
  
  // Market data
  marketResults: MarketResult[];
  fuelPrices: Record<string, Record<string, number>>;
  demandForecast: Record<string, any>;
  
  // Utility-specific data
  plants: PowerPlant[];
  bids: YearlyBid[];
  financials: UtilityFinancials | null;
  
  // Actions
  setRole: (role: 'instructor' | 'utility') => void;
  setUtilityId: (id: string) => void;
  setCurrentSession: (session: GameSession) => void;
  setMarketResults: (results: MarketResult[]) => void;
  setFuelPrices: (prices: Record<string, Record<string, number>>) => void;
  setDemandForecast: (forecast: Record<string, any>) => void;
  setPlants: (plants: PowerPlant[]) => void;
  setBids: (bids: YearlyBid[]) => void;
  setFinancials: (financials: UtilityFinancials) => void;
  
  // Computed values
  getCurrentYearBids: () => YearlyBid[];
  getPlantsByStatus: (status: string) => PowerPlant[];
  getTotalCapacity: () => number;
  getPortfolioMix: () => Record<string, number>;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      role: null,
      utilityId: null,
      currentSession: null,
      marketResults: [],
      fuelPrices: {},
      demandForecast: {},
      plants: [],
      bids: [],
      financials: null,

      // Actions
      setRole: (role) => set({ role }),
      setUtilityId: (utilityId) => {
        set({ utilityId });
        // Clear cached data when switching utilities
        set({ plants: [], bids: [], financials: null });
      },
      setCurrentSession: (currentSession) => {
        const { currentSession: prevSession } = get();
        
        // Validate that the session exists before setting it
        if (!currentSession) {
          console.warn('🔄 Attempting to set null session, clearing store');
          set({ currentSession: null, role: null, utilityId: null });
          return;
        }
        
        // Check if state changed and show notification
        if (prevSession && currentSession && prevSession.state !== currentSession.state) {
          const stateMessages: Record<string, string> = {
            'year_planning': '📋 Year planning phase started - Review market conditions and plan investments',
            'bidding_open': '📝 Bidding is now open - Submit your bids for all load periods',
            'market_clearing': '⚡ Markets are clearing - Results will be available soon',
            'year_complete': '✅ Year completed - Review your performance and prepare for next year',
            'game_complete': '🎉 Game completed - Final results are available'
          };
          
          const message = stateMessages[currentSession.state] || `Game state changed to ${currentSession.state.replace('_', ' ')}`;
          
          // Use a timeout to ensure the toast appears after component renders
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.location.pathname.includes('/utility/')) {
              // Only show notifications for utility users
              import('react-hot-toast').then(({ default: toast }) => {
                toast.success(message, { duration: 6000 });
              });
            }
          }, 500);
        }
        
        set({ currentSession });
      },
      setMarketResults: (marketResults) => set({ marketResults }),
      setFuelPrices: (fuelPrices) => set({ fuelPrices }),
      setDemandForecast: (demandForecast) => set({ demandForecast }),
      setPlants: (plants) => set({ plants }),
      setBids: (bids) => set({ bids }),
      setFinancials: (financials) => set({ financials }),

      // Computed values
      getCurrentYearBids: () => {
        const { bids, currentSession } = get();
        if (!currentSession) return [];
        return bids.filter(bid => bid.year === currentSession.current_year);
      },

      getPlantsByStatus: (status) => {
        const { plants } = get();
        return plants.filter(plant => plant.status === status);
      },

      getTotalCapacity: () => {
        const { plants } = get();
        return plants
          .filter(plant => plant.status === 'operating')
          .reduce((total, plant) => total + plant.capacity_mw, 0);
      },

      getPortfolioMix: () => {
        const { plants } = get();
        const mix: Record<string, number> = {};
        
        plants
          .filter(plant => plant.status === 'operating')
          .forEach(plant => {
            mix[plant.plant_type] = (mix[plant.plant_type] || 0) + plant.capacity_mw;
          });
        
        return mix;
      },
    }),
    {
      name: 'electricity-market-game',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        role: state.role,
        utilityId: state.utilityId,
        currentSession: state.currentSession,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔄 Store rehydrated successfully');
          
          // Validate the rehydrated session
          if (state.currentSession) {
            console.log('🔍 Validating rehydrated session:', state.currentSession.id);
            // The API interceptor will handle invalid sessions
          }
        } else {
          console.log('🔄 Store rehydration failed or empty');
        }
      },
    }
  )
);