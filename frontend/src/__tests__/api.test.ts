/**
 * Frontend API Client Tests
 * Tests all API client methods and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import ElectricityMarketAPI from '../api/client';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('ElectricityMarketAPI', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default axios mock
    mockedAxios.create.mockReturnValue({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    } as any);
  });

  describe('Health Check', () => {
    it('should check API health', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          version: '2.0.0',
          framework: 'FastAPI'
        }
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.healthCheck();
      
      expect(mockApi.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('User Management', () => {
    it('should create a new user', async () => {
      const userData = { username: 'test_user', user_type: 'utility' };
      const mockResponse = {
        data: {
          id: 'user_123',
          username: 'test_user',
          user_type: 'utility',
          budget: 2000000000
        }
      };
      
      const mockApi = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.createUser(userData);
      
      expect(mockApi.post).toHaveBeenCalledWith('/users', userData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should get user by ID', async () => {
      const userId = 'user_123';
      const mockResponse = {
        data: {
          id: userId,
          username: 'test_user',
          user_type: 'utility'
        }
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getUser(userId);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/users/${userId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should get user financials', async () => {
      const userId = 'user_123';
      const sessionId = 'session_456';
      const mockResponse = {
        data: {
          utility_id: userId,
          budget: 1500000000,
          debt: 500000000,
          equity: 1500000000,
          total_capital_invested: 1000000000
        }
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getUserFinancials(userId, sessionId);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/users/${userId}/financial-summary`, {
        params: { game_session_id: sessionId }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Game Session Management', () => {
    it('should create a game session', async () => {
      const sessionData = {
        name: 'Test Session',
        operator_id: 'operator_1',
        start_year: 2025,
        end_year: 2035
      };
      
      const mockResponse = {
        data: {
          id: 'session_123',
          ...sessionData,
          current_year: 2025,
          state: 'setup'
        }
      };
      
      const mockApi = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.createGameSession(sessionData);
      
      expect(mockApi.post).toHaveBeenCalledWith('/game-sessions', sessionData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should get game session', async () => {
      const sessionId = 'session_123';
      const mockResponse = {
        data: {
          id: sessionId,
          name: 'Test Session',
          current_year: 2025,
          state: 'setup'
        }
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getGameSession(sessionId);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/game-sessions/${sessionId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should update game state', async () => {
      const sessionId = 'session_123';
      const newState = 'year_planning';
      const mockResponse = {
        data: {
          message: 'Game state updated',
          session_id: sessionId,
          new_state: newState
        }
      };
      
      const mockApi = {
        put: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.updateGameState(sessionId, newState);
      
      expect(mockApi.put).toHaveBeenCalledWith(`/game-sessions/${sessionId}/state`, null, {
        params: { new_state: newState }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Plant Management', () => {
    it('should get plant templates', async () => {
      const mockResponse = {
        data: [
          {
            plant_type: 'solar',
            name: 'Utility Scale Solar PV',
            overnight_cost_per_kw: 1400,
            capacity_factor_base: 0.27
          },
          {
            plant_type: 'wind_onshore',
            name: 'Onshore Wind',
            overnight_cost_per_kw: 1650,
            capacity_factor_base: 0.35
          }
        ]
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getPlantTemplates();
      
      expect(mockApi.get).toHaveBeenCalledWith('/plant-templates');
      expect(result).toEqual(mockResponse.data);
    });

    it('should create power plant', async () => {
      const sessionId = 'session_123';
      const utilityId = 'utility_456';
      const plantData = {
        name: 'Test Solar Farm',
        plant_type: 'solar',
        capacity_mw: 300,
        construction_start_year: 2025,
        commissioning_year: 2027,
        retirement_year: 2052
      };
      
      const mockResponse = {
        data: {
          id: 'plant_789',
          ...plantData,
          status: 'under_construction',
          capital_cost_total: 420000000
        }
      };
      
      const mockApi = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.createPowerPlant(sessionId, utilityId, plantData);
      
      expect(mockApi.post).toHaveBeenCalledWith(
        `/game-sessions/${sessionId}/plants`,
        plantData,
        { params: { utility_id: utilityId } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should get power plants', async () => {
      const sessionId = 'session_123';
      const utilityId = 'utility_456';
      const mockResponse = {
        data: [
          {
            id: 'plant_1',
            name: 'Solar Farm',
            plant_type: 'solar',
            capacity_mw: 300,
            status: 'operating'
          },
          {
            id: 'plant_2',
            name: 'Wind Farm',
            plant_type: 'wind_onshore',
            capacity_mw: 200,
            status: 'under_construction'
          }
        ]
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getPowerPlants(sessionId, utilityId);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/game-sessions/${sessionId}/plants`, {
        params: { utility_id: utilityId }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Bidding System', () => {
    it('should submit yearly bid', async () => {
      const sessionId = 'session_123';
      const utilityId = 'utility_456';
      const bidData = {
        plant_id: 'plant_789',
        year: 2025,
        off_peak_quantity: 240,
        shoulder_quantity: 270,
        peak_quantity: 300,
        off_peak_price: 45,
        shoulder_price: 55,
        peak_price: 75
      };
      
      const mockResponse = {
        data: {
          id: 'bid_123',
          utility_id: utilityId,
          ...bidData
        }
      };
      
      const mockApi = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.submitYearlyBid(sessionId, utilityId, bidData);
      
      expect(mockApi.post).toHaveBeenCalledWith(
        `/game-sessions/${sessionId}/bids`,
        bidData,
        { params: { utility_id: utilityId } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should get yearly bids', async () => {
      const sessionId = 'session_123';
      const year = 2025;
      const utilityId = 'utility_456';
      
      const mockResponse = {
        data: [
          {
            id: 'bid_1',
            utility_id: utilityId,
            plant_id: 'plant_1',
            year: year,
            off_peak_price: 45,
            peak_price: 75
          }
        ]
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getYearlyBids(sessionId, year, utilityId);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/game-sessions/${sessionId}/bids`, {
        params: { year, utility_id: utilityId }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Market Operations', () => {
    it('should get fuel prices', async () => {
      const sessionId = 'session_123';
      const year = 2025;
      
      const mockResponse = {
        data: {
          year: year,
          fuel_prices: {
            coal: 2.50,
            natural_gas: 4.00,
            uranium: 0.75
          },
          currency: 'USD/MMBtu'
        }
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getFuelPrices(sessionId, year);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/game-sessions/${sessionId}/fuel-prices/${year}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should get renewable availability', async () => {
      const sessionId = 'session_123';
      const year = 2025;
      
      const mockResponse = {
        data: {
          year: year,
          renewable_availability: {
            solar_availability: 1.0,
            wind_availability: 1.0,
            weather_description: 'Normal conditions'
          },
          impact_analysis: {
            solar_impact: 'neutral',
            wind_impact: 'neutral',
            recommendations: []
          }
        }
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getRenewableAvailability(sessionId, year);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/game-sessions/${sessionId}/renewable-availability/${year}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should get market results', async () => {
      const sessionId = 'session_123';
      const year = 2025;
      const period = 'peak';
      
      const mockResponse = {
        data: [
          {
            year: year,
            period: period,
            clearing_price: 65.50,
            cleared_quantity: 2400,
            total_energy: 3024000,
            marginal_plant: 'plant_123'
          }
        ]
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getMarketResults(sessionId, year, period);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/game-sessions/${sessionId}/market-results`, {
        params: { year, period }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Not found' }
        }
      };
      
      const mockApi = {
        get: vi.fn().mockRejectedValue(mockError)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      await expect(ElectricityMarketAPI.healthCheck()).rejects.toEqual(mockError);
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network Error');
      
      const mockApi = {
        get: vi.fn().mockRejectedValue(mockError)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      await expect(ElectricityMarketAPI.healthCheck()).rejects.toEqual(mockError);
    });
  });

  describe('Portfolio Templates', () => {
    it('should get portfolio templates', async () => {
      const mockResponse = {
        data: [
          {
            id: 'balanced_traditional',
            name: 'Balanced Traditional',
            description: 'Coal, gas, and nuclear mix',
            plants: [
              { plant_type: 'coal', capacity_mw: 600, name: 'Coal Plant' },
              { plant_type: 'natural_gas_cc', capacity_mw: 400, name: 'Gas Plant' }
            ]
          }
        ]
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getPortfolioTemplates();
      
      expect(mockApi.get).toHaveBeenCalledWith('/portfolio-templates');
      expect(result).toEqual(mockResponse.data);
    });

    it('should assign portfolio to utility', async () => {
      const sessionId = 'session_123';
      const utilityId = 'utility_456';
      const portfolioData = {
        utility_id: utilityId,
        portfolio_id: 'balanced_traditional'
      };
      
      const mockResponse = {
        data: {
          message: 'Portfolio assigned successfully',
          utility_id: utilityId,
          plants_created: [
            { id: 'plant_1', name: 'Coal Plant', type: 'coal' }
          ]
        }
      };
      
      const mockApi = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.assignPortfolio(sessionId, utilityId, portfolioData);
      
      expect(mockApi.post).toHaveBeenCalledWith(
        `/game-sessions/${sessionId}/assign-portfolio`,
        portfolioData,
        { params: { utility_id: utilityId } }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Investment Analysis', () => {
    it('should get investment analysis', async () => {
      const sessionId = 'session_123';
      const utilityId = 'utility_456';
      
      const mockResponse = {
        data: {
          utility_id: utilityId,
          financial_position: {
            current_budget: 1500000000,
            debt_to_equity_ratio: 0.75,
            credit_rating: 'AA'
          },
          market_opportunities: [
            {
              technology: 'solar',
              recommended_capacity_mw: 200,
              estimated_roi: 0.12
            }
          ]
        }
      };
      
      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.getInvestmentAnalysis(sessionId, utilityId);
      
      expect(mockApi.get).toHaveBeenCalledWith(`/game-sessions/${sessionId}/investment-analysis`, {
        params: { utility_id: utilityId }
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should simulate investment', async () => {
      const sessionId = 'session_123';
      const utilityId = 'utility_456';
      const investmentData = {
        plant_type: 'solar',
        capacity_mw: 300,
        construction_start_year: 2025
      };
      
      const mockResponse = {
        data: {
          investment_summary: {
            plant_type: 'solar',
            capacity_mw: 300,
            total_capex: 420000000
          },
          financial_impact: {
            budget_sufficient: true,
            post_investment_budget: 1200000000
          },
          recommendation: 'Proceed with investment'
        }
      };
      
      const mockApi = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.simulateInvestment(sessionId, utilityId, investmentData);
      
      expect(mockApi.post).toHaveBeenCalledWith(
        `/game-sessions/${sessionId}/simulate-investment`,
        null,
        {
          params: {
            utility_id: utilityId,
            plant_type: investmentData.plant_type,
            capacity_mw: investmentData.capacity_mw,
            construction_start_year: investmentData.construction_start_year
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Sample Data', () => {
    it('should create sample data', async () => {
      const mockResponse = {
        data: {
          message: 'Sample data created successfully',
          game_session_id: 'sample_game_1',
          operator_id: 'operator_1',
          utility_ids: ['utility_1', 'utility_2', 'utility_3']
        }
      };
      
      const mockApi = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };
      mockedAxios.create.mockReturnValue(mockApi as any);
      
      const result = await ElectricityMarketAPI.createSampleData();
      
      expect(mockApi.post).toHaveBeenCalledWith('/sample-data/create');
      expect(result).toEqual(mockResponse.data);
    });
  });
});