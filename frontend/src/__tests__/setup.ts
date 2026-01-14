/**
 * Test Setup Configuration
 * Global test setup for Vitest
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    port: '3000',
    reload: vi.fn()
  },
  writable: true
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    MODE: 'test',
    DEV: true,
    PROD: false,
    BASE_URL: '/',
    VITE_API_URL: 'http://localhost:8000'
  }
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  },
  Toaster: () => null
}));

// Global test utilities
global.testUtils = {
  createMockGameSession: () => ({
    id: 'test_session_123',
    name: 'Test Game Session',
    operator_id: 'operator_1',
    current_year: 2025,
    start_year: 2025,
    end_year: 2035,
    state: 'setup',
    carbon_price_per_ton: 50
  }),
  
  createMockUtility: () => ({
    id: 'utility_test_123',
    username: 'test_utility',
    user_type: 'utility',
    budget: 2000000000,
    debt: 0,
    equity: 2000000000
  }),
  
  createMockPlant: () => ({
    id: 'plant_test_123',
    utility_id: 'utility_test_123',
    name: 'Test Solar Farm',
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
  }),
  
  createMockBid: () => ({
    id: 'bid_test_123',
    utility_id: 'utility_test_123',
    plant_id: 'plant_test_123',
    year: 2025,
    off_peak_quantity: 240,
    shoulder_quantity: 270,
    peak_quantity: 300,
    off_peak_price: 25,
    shoulder_price: 30,
    peak_price: 35
  })
};

// Extend global types
declare global {
  var testUtils: {
    createMockGameSession: () => any;
    createMockUtility: () => any;
    createMockPlant: () => any;
    createMockBid: () => any;
  };
}