import axios from 'axios';
import { GameSession, PowerPlant, YearlyBid, UtilityFinancials } from '../store/gameStore';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use((config) => {
  console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    throw error;
  }
);

// API Client class
export class ElectricityMarketAPI {
  // Health check
  static async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  }

  // Game Session Management
  static async createGameSession(data: {
    name: string;
    operator_id: string;
    start_year?: number;
    end_year?: number;
    carbon_price_per_ton?: number;
  }) {
    const response = await api.post('/game-sessions', data);
    return response.data;
  }

  static async getGameSession(sessionId: string): Promise<GameSession> {
    const response = await api.get(`/game-sessions/${sessionId}`);
    return response.data;
  }

  static async updateGameState(sessionId: string, newState: string) {
    const response = await api.put(`/game-sessions/${sessionId}/state`, null, {
      params: { new_state: newState }
    });
    return response.data;
  }

  static async advanceYear(sessionId: string) {
    const response = await api.put(`/game-sessions/${sessionId}/advance-year`);
    return response.data;
  }

  static async getGameDashboard(sessionId: string) {
    const response = await api.get(`/game-sessions/${sessionId}/dashboard`);
    return response.data;
  }

  // User Management
  static async createUser(data: { username: string; user_type: string }) {
    const response = await api.post('/users', data);
    return response.data;
  }

  static async getUser(userId: string) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  }

  static async getUserFinancials(userId: string, gameSessionId: string): Promise<UtilityFinancials> {
    const response = await api.get(`/users/${userId}/financial-summary`, {
      params: { game_session_id: gameSessionId }
    });
    return response.data;
  }

  // Plant Management
  static async getPlantTemplates() {
    const response = await api.get('/plant-templates');
    return response.data;
  }

  static async getPlantTemplate(plantType: string) {
    const response = await api.get(`/plant-templates/${plantType}`);
    return response.data;
  }

  static async createPowerPlant(sessionId: string, utilityId: string, data: {
    name: string;
    plant_type: string;
    capacity_mw: number;
    construction_start_year: number;
    commissioning_year: number;
    retirement_year: number;
  }) {
    const response = await api.post(`/game-sessions/${sessionId}/plants`, data, {
      params: { utility_id: utilityId }
    });
    return response.data;
  }

  static async getPowerPlants(sessionId: string, utilityId?: string): Promise<PowerPlant[]> {
    const response = await api.get(`/game-sessions/${sessionId}/plants`, {
      params: utilityId ? { utility_id: utilityId } : {}
    });
    return response.data;
  }

  static async getPlantEconomics(sessionId: string, plantId: string, year: number) {
    const response = await api.get(`/game-sessions/${sessionId}/plants/${plantId}/economics`, {
      params: { year }
    });
    return response.data;
  }

  // Bidding System
  static async submitYearlyBid(sessionId: string, utilityId: string, bidData: {
    plant_id: string;
    year: number;
    off_peak_quantity: number;
    shoulder_quantity: number;
    peak_quantity: number;
    off_peak_price: number;
    shoulder_price: number;
    peak_price: number;
  }) {
    const response = await api.post(`/game-sessions/${sessionId}/bids`, bidData, {
      params: { utility_id: utilityId }
    });
    return response.data;
  }

  static async getYearlyBids(sessionId: string, year?: number, utilityId?: string): Promise<YearlyBid[]> {
    const response = await api.get(`/game-sessions/${sessionId}/bids`, {
      params: { year, utility_id: utilityId }
    });
    return response.data;
  }

  // Market Operations
  static async getFuelPrices(sessionId: string, year: number) {
    const response = await api.get(`/game-sessions/${sessionId}/fuel-prices/${year}`);
    return response.data;
  }

  static async getMarketResults(sessionId: string, year?: number, period?: string) {
    const response = await api.get(`/game-sessions/${sessionId}/market-results`, {
      params: { year, period }
    });
    return response.data;
  }

  // Game Orchestration (Instructor)
  static async startYearPlanning(sessionId: string, year: number) {
    const response = await api.post(`/game-sessions/${sessionId}/start-year-planning/${year}`);
    return response.data;
  }

  static async openAnnualBidding(sessionId: string, year: number) {
    const response = await api.post(`/game-sessions/${sessionId}/open-annual-bidding/${year}`);
    return response.data;
  }

  static async clearAnnualMarkets(sessionId: string, year: number) {
    const response = await api.post(`/game-sessions/${sessionId}/clear-annual-markets/${year}`);
    return response.data;
  }

  static async completeYear(sessionId: string, year: number) {
    const response = await api.post(`/game-sessions/${sessionId}/complete-year/${year}`);
    return response.data;
  }

  static async getYearlySummary(sessionId: string, year: number) {
    const response = await api.get(`/game-sessions/${sessionId}/yearly-summary/${year}`);
    return response.data;
  }

  static async getMultiYearAnalysis(sessionId: string) {
    const response = await api.get(`/game-sessions/${sessionId}/multi-year-analysis`);
    return response.data;
  }

  // Investment Analysis
  static async getInvestmentAnalysis(sessionId: string, utilityId: string) {
    const response = await api.get(`/game-sessions/${sessionId}/investment-analysis`, {
      params: { utility_id: utilityId }
    });
    return response.data;
  }

  static async simulateInvestment(sessionId: string, utilityId: string, data: {
    plant_type: string;
    capacity_mw: number;
    construction_start_year: number;
  }) {
    const response = await api.post(`/game-sessions/${sessionId}/simulate-investment`, null, {
      params: { 
        utility_id: utilityId,
        plant_type: data.plant_type,
        capacity_mw: data.capacity_mw,
        construction_start_year: data.construction_start_year
      }
    });
    return response.data;
  }

  // Sample Data
  static async createSampleData() {
    const response = await api.post('/sample-data/create');
    return response.data;
  }

  static async getScenarios() {
    const response = await api.get('/scenarios');
    return response.data;
  }

  // Portfolio and Financial Management
  static async getAllUtilities(sessionId: string) {
    const response = await api.get(`/game-sessions/${sessionId}/utilities`);
    return response.data;
  }

  static async updateUtilityFinancials(userId: string, financials: {
    budget: number;
    debt: number;
    equity: number;
  }) {
    const response = await api.put(`/users/${userId}/financials`, financials);
    return response.data;
  }

  static async getPortfolioTemplates() {
    const response = await api.get('/portfolio-templates');
    return response.data;
  }

  static async assignPortfolio(sessionId: string, utilityId: string, portfolio: any) {
    const response = await api.post(`/game-sessions/${sessionId}/assign-portfolio`, portfolio, {
      params: { utility_id: utilityId }
    });
    return response.data;
  }

  static async bulkAssignPortfolios(sessionId: string, assignments: any) {
    const response = await api.post(`/game-sessions/${sessionId}/bulk-assign-portfolios`, assignments);
    return response.data;
  }
}

export default ElectricityMarketAPI;