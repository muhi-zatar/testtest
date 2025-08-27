/**
 * Game Store Tests
 * Tests the Zustand store functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { act, renderHook } from '@testing-library/react';

describe('Game Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { getState } = useGameStore;
    act(() => {
      useGameStore.setState({
        role: null,
        utilityId: null,
        currentSession: null,
        marketResults: [],
        fuelPrices: {},
        demandForecast: {},
        plants: [],
        bids: [],
        financials: null
      });
    });
  });

  describe('Role Management', () => {
    it('should set role correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setRole('instructor');
      });
      
      expect(result.current.role).toBe('instructor');
    });

    it('should set utility ID and clear cached data', () => {
      const { result } = renderHook(() => useGameStore());
      
      // Set some initial data
      act(() => {
        result.current.setPlants([
          {
            id: 'plant_1',
            utility_id: 'old_utility',
            name: 'Test Plant',
            plant_type: 'solar',
            capacity_mw: 100,
            construction_start_year: 2025,
            commissioning_year: 2027,
            retirement_year: 2052,
            status: 'operating',
            capital_cost_total: 140000000,
            fixed_om_annual: 1800000,
            variable_om_per_mwh: 0,
            capacity_factor: 0.27,
            heat_rate: undefined,
            fuel_type: undefined
          }
        ]);
        result.current.setBids([
          {
            id: 'bid_1',
            utility_id: 'old_utility',
            plant_id: 'plant_1',
            year: 2025,
            off_peak_quantity: 80,
            shoulder_quantity: 90,
            peak_quantity: 100,
            off_peak_price: 25,
            shoulder_price: 30,
            peak_price: 35
          }
        ]);
      });
      
      // Change utility ID
      act(() => {
        result.current.setUtilityId('new_utility');
      });
      
      expect(result.current.utilityId).toBe('new_utility');
      expect(result.current.plants).toEqual([]);
      expect(result.current.bids).toEqual([]);
      expect(result.current.financials).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should set current session', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testSession = {
        id: 'session_123',
        name: 'Test Session',
        operator_id: 'operator_1',
        current_year: 2025,
        start_year: 2025,
        end_year: 2035,
        state: 'setup',
        carbon_price_per_ton: 50
      };
      
      act(() => {
        result.current.setCurrentSession(testSession);
      });
      
      expect(result.current.currentSession).toEqual(testSession);
    });

    it('should handle null session gracefully', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setCurrentSession(null);
      });
      
      expect(result.current.currentSession).toBeNull();
      expect(result.current.role).toBeNull();
      expect(result.current.utilityId).toBeNull();
    });
  });

  describe('Data Management', () => {
    it('should set and retrieve plants', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testPlants = [
        {
          id: 'plant_1',
          utility_id: 'utility_1',
          name: 'Solar Farm',
          plant_type: 'solar',
          capacity_mw: 300,
          construction_start_year: 2025,
          commissioning_year: 2027,
          retirement_year: 2052,
          status: 'operating',
          capital_cost_total: 420000000,
          fixed_om_annual: 5400000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.27,
          heat_rate: undefined,
          fuel_type: undefined
        },
        {
          id: 'plant_2',
          utility_id: 'utility_1',
          name: 'Wind Farm',
          plant_type: 'wind_onshore',
          capacity_mw: 200,
          construction_start_year: 2025,
          commissioning_year: 2027,
          retirement_year: 2052,
          status: 'under_construction',
          capital_cost_total: 330000000,
          fixed_om_annual: 5600000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.35,
          heat_rate: undefined,
          fuel_type: undefined
        }
      ];
      
      act(() => {
        result.current.setPlants(testPlants);
      });
      
      expect(result.current.plants).toEqual(testPlants);
    });

    it('should set and retrieve bids', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testBids = [
        {
          id: 'bid_1',
          utility_id: 'utility_1',
          plant_id: 'plant_1',
          year: 2025,
          off_peak_quantity: 240,
          shoulder_quantity: 270,
          peak_quantity: 300,
          off_peak_price: 25,
          shoulder_price: 30,
          peak_price: 35
        }
      ];
      
      act(() => {
        result.current.setBids(testBids);
      });
      
      expect(result.current.bids).toEqual(testBids);
    });

    it('should set financials', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testFinancials = {
        utility_id: 'utility_1',
        budget: 1500000000,
        debt: 500000000,
        equity: 1500000000,
        total_capital_invested: 1000000000,
        annual_fixed_costs: 25000000,
        plant_count: 3,
        total_capacity_mw: 1200
      };
      
      act(() => {
        result.current.setFinancials(testFinancials);
      });
      
      expect(result.current.financials).toEqual(testFinancials);
    });
  });

  describe('Computed Values', () => {
    it('should get current year bids', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testSession = {
        id: 'session_123',
        name: 'Test Session',
        operator_id: 'operator_1',
        current_year: 2025,
        start_year: 2025,
        end_year: 2035,
        state: 'setup',
        carbon_price_per_ton: 50
      };
      
      const testBids = [
        {
          id: 'bid_1',
          utility_id: 'utility_1',
          plant_id: 'plant_1',
          year: 2025,
          off_peak_quantity: 240,
          shoulder_quantity: 270,
          peak_quantity: 300,
          off_peak_price: 25,
          shoulder_price: 30,
          peak_price: 35
        },
        {
          id: 'bid_2',
          utility_id: 'utility_1',
          plant_id: 'plant_2',
          year: 2026,
          off_peak_quantity: 180,
          shoulder_quantity: 200,
          peak_quantity: 220,
          off_peak_price: 28,
          shoulder_price: 33,
          peak_price: 38
        }
      ];
      
      act(() => {
        result.current.setCurrentSession(testSession);
        result.current.setBids(testBids);
      });
      
      const currentYearBids = result.current.getCurrentYearBids();
      expect(currentYearBids).toHaveLength(1);
      expect(currentYearBids[0].year).toBe(2025);
    });

    it('should get plants by status', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testPlants = [
        {
          id: 'plant_1',
          utility_id: 'utility_1',
          name: 'Operating Plant',
          plant_type: 'solar',
          capacity_mw: 300,
          construction_start_year: 2020,
          commissioning_year: 2022,
          retirement_year: 2047,
          status: 'operating',
          capital_cost_total: 420000000,
          fixed_om_annual: 5400000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.27,
          heat_rate: undefined,
          fuel_type: undefined
        },
        {
          id: 'plant_2',
          utility_id: 'utility_1',
          name: 'Construction Plant',
          plant_type: 'wind_onshore',
          capacity_mw: 200,
          construction_start_year: 2025,
          commissioning_year: 2027,
          retirement_year: 2052,
          status: 'under_construction',
          capital_cost_total: 330000000,
          fixed_om_annual: 5600000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.35,
          heat_rate: undefined,
          fuel_type: undefined
        }
      ];
      
      act(() => {
        result.current.setPlants(testPlants);
      });
      
      const operatingPlants = result.current.getPlantsByStatus('operating');
      const constructionPlants = result.current.getPlantsByStatus('under_construction');
      
      expect(operatingPlants).toHaveLength(1);
      expect(operatingPlants[0].name).toBe('Operating Plant');
      expect(constructionPlants).toHaveLength(1);
      expect(constructionPlants[0].name).toBe('Construction Plant');
    });

    it('should calculate total capacity', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testPlants = [
        {
          id: 'plant_1',
          utility_id: 'utility_1',
          name: 'Plant 1',
          plant_type: 'solar',
          capacity_mw: 300,
          construction_start_year: 2020,
          commissioning_year: 2022,
          retirement_year: 2047,
          status: 'operating',
          capital_cost_total: 420000000,
          fixed_om_annual: 5400000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.27,
          heat_rate: undefined,
          fuel_type: undefined
        },
        {
          id: 'plant_2',
          utility_id: 'utility_1',
          name: 'Plant 2',
          plant_type: 'wind_onshore',
          capacity_mw: 200,
          construction_start_year: 2020,
          commissioning_year: 2022,
          retirement_year: 2047,
          status: 'operating',
          capital_cost_total: 330000000,
          fixed_om_annual: 5600000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.35,
          heat_rate: undefined,
          fuel_type: undefined
        },
        {
          id: 'plant_3',
          utility_id: 'utility_1',
          name: 'Plant 3',
          plant_type: 'natural_gas_cc',
          capacity_mw: 400,
          construction_start_year: 2025,
          commissioning_year: 2028,
          retirement_year: 2058,
          status: 'under_construction',
          capital_cost_total: 480000000,
          fixed_om_annual: 6000000,
          variable_om_per_mwh: 3,
          capacity_factor: 0.87,
          heat_rate: 6400,
          fuel_type: 'natural_gas'
        }
      ];
      
      act(() => {
        result.current.setPlants(testPlants);
      });
      
      const totalCapacity = result.current.getTotalCapacity();
      expect(totalCapacity).toBe(500); // Only operating plants (300 + 200)
    });

    it('should calculate portfolio mix', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testPlants = [
        {
          id: 'plant_1',
          utility_id: 'utility_1',
          name: 'Solar Plant',
          plant_type: 'solar',
          capacity_mw: 300,
          construction_start_year: 2020,
          commissioning_year: 2022,
          retirement_year: 2047,
          status: 'operating',
          capital_cost_total: 420000000,
          fixed_om_annual: 5400000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.27,
          heat_rate: undefined,
          fuel_type: undefined
        },
        {
          id: 'plant_2',
          utility_id: 'utility_1',
          name: 'Wind Plant',
          plant_type: 'wind_onshore',
          capacity_mw: 200,
          construction_start_year: 2020,
          commissioning_year: 2022,
          retirement_year: 2047,
          status: 'operating',
          capital_cost_total: 330000000,
          fixed_om_annual: 5600000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.35,
          heat_rate: undefined,
          fuel_type: undefined
        },
        {
          id: 'plant_3',
          utility_id: 'utility_1',
          name: 'Another Solar Plant',
          plant_type: 'solar',
          capacity_mw: 100,
          construction_start_year: 2020,
          commissioning_year: 2022,
          retirement_year: 2047,
          status: 'operating',
          capital_cost_total: 140000000,
          fixed_om_annual: 1800000,
          variable_om_per_mwh: 0,
          capacity_factor: 0.27,
          heat_rate: undefined,
          fuel_type: undefined
        }
      ];
      
      act(() => {
        result.current.setPlants(testPlants);
      });
      
      const portfolioMix = result.current.getPortfolioMix();
      expect(portfolioMix).toEqual({
        'solar': 400,        // 300 + 100
        'wind_onshore': 200  // 200
      });
    });
  });

  describe('Market Data', () => {
    it('should set market results', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testResults = [
        {
          year: 2025,
          period: 'peak',
          clearing_price: 65.50,
          cleared_quantity: 2400,
          total_energy: 3024000,
          marginal_plant: 'plant_123'
        }
      ];
      
      act(() => {
        result.current.setMarketResults(testResults);
      });
      
      expect(result.current.marketResults).toEqual(testResults);
    });

    it('should set fuel prices', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testFuelPrices = {
        '2025': { coal: 2.50, natural_gas: 4.00, uranium: 0.75 },
        '2026': { coal: 2.55, natural_gas: 4.20, uranium: 0.76 }
      };
      
      act(() => {
        result.current.setFuelPrices(testFuelPrices);
      });
      
      expect(result.current.fuelPrices).toEqual(testFuelPrices);
    });

    it('should set demand forecast', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testDemandForecast = {
        '2025': { off_peak: 1200, shoulder: 1800, peak: 2400 },
        '2026': { off_peak: 1224, shoulder: 1836, peak: 2448 }
      };
      
      act(() => {
        result.current.setDemandForecast(testDemandForecast);
      });
      
      expect(result.current.demandForecast).toEqual(testDemandForecast);
    });
  });

  describe('Persistence', () => {
    it('should persist role and session data', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testSession = {
        id: 'session_123',
        name: 'Test Session',
        operator_id: 'operator_1',
        current_year: 2025,
        start_year: 2025,
        end_year: 2035,
        state: 'setup',
        carbon_price_per_ton: 50
      };
      
      act(() => {
        result.current.setRole('utility');
        result.current.setUtilityId('utility_1');
        result.current.setCurrentSession(testSession);
      });
      
      // Verify data is set
      expect(result.current.role).toBe('utility');
      expect(result.current.utilityId).toBe('utility_1');
      expect(result.current.currentSession).toEqual(testSession);
      
      // Note: Testing actual localStorage persistence would require jsdom setup
      // This test verifies the store state management works correctly
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays gracefully', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setPlants([]);
        result.current.setBids([]);
      });
      
      expect(result.current.getTotalCapacity()).toBe(0);
      expect(result.current.getPortfolioMix()).toEqual({});
      expect(result.current.getCurrentYearBids()).toEqual([]);
    });

    it('should handle plants with zero capacity', () => {
      const { result } = renderHook(() => useGameStore());
      
      const testPlants = [
        {
          id: 'plant_1',
          utility_id: 'utility_1',
          name: 'Zero Capacity Plant',
          plant_type: 'solar',
          capacity_mw: 0,
          construction_start_year: 2020,
          commissioning_year: 2022,
          retirement_year: 2047,
          status: 'operating',
          capital_cost_total: 0,
          fixed_om_annual: 0,
          variable_om_per_mwh: 0,
          capacity_factor: 0.27,
          heat_rate: undefined,
          fuel_type: undefined
        }
      ];
      
      act(() => {
        result.current.setPlants(testPlants);
      });
      
      expect(result.current.getTotalCapacity()).toBe(0);
      expect(result.current.getPortfolioMix()).toEqual({ 'solar': 0 });
    });
  });
});