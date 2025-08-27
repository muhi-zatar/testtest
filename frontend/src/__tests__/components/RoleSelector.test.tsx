/**
 * RoleSelector Component Tests
 * Tests the main role selection interface
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RoleSelector from '../../components/RoleSelector';
import { useGameStore } from '../../store/gameStore';

// Mock the game store
vi.mock('../../store/gameStore');
const mockUseGameStore = vi.mocked(useGameStore);

// Mock the API client
vi.mock('../../api/client', () => ({
  default: {
    getAllUsers: vi.fn().mockResolvedValue([
      { id: 'utility_1', username: 'utility_1', user_type: 'utility', budget: 2000000000 },
      { id: 'utility_2', username: 'utility_2', user_type: 'utility', budget: 1500000000 },
      { id: 'operator_1', username: 'instructor', user_type: 'operator', budget: 10000000000 }
    ])
  }
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  };
});

describe('RoleSelector', () => {
  let queryClient: QueryClient;
  let mockSetRole: ReturnType<typeof vi.fn>;
  let mockSetUtilityId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    mockSetRole = vi.fn();
    mockSetUtilityId = vi.fn();

    mockUseGameStore.mockReturnValue({
      setRole: mockSetRole,
      setUtilityId: mockSetUtilityId,
      role: null,
      utilityId: null,
      currentSession: null,
      marketResults: [],
      fuelPrices: {},
      demandForecast: {},
      plants: [],
      bids: [],
      financials: null,
      setCurrentSession: vi.fn(),
      setMarketResults: vi.fn(),
      setFuelPrices: vi.fn(),
      setDemandForecast: vi.fn(),
      setPlants: vi.fn(),
      setBids: vi.fn(),
      setFinancials: vi.fn(),
      getCurrentYearBids: vi.fn().mockReturnValue([]),
      getPlantsByStatus: vi.fn().mockReturnValue([]),
      getTotalCapacity: vi.fn().mockReturnValue(0),
      getPortfolioMix: vi.fn().mockReturnValue({})
    });

    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RoleSelector />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders the main title and description', () => {
    renderComponent();
    
    expect(screen.getByText('Electricity Market Game')).toBeInTheDocument();
    expect(screen.getByText('Multi-Year Capacity Planning & Investment Simulation')).toBeInTheDocument();
    expect(screen.getByText('2025-2035 • Strategic Decision Making • Real Market Dynamics')).toBeInTheDocument();
  });

  it('renders instructor and utility mode cards', () => {
    renderComponent();
    
    expect(screen.getByText('Instructor Mode')).toBeInTheDocument();
    expect(screen.getByText('Utility Mode')).toBeInTheDocument();
    
    expect(screen.getByText('Control the simulation, manage market events, and monitor all utility performance across the 10-year period.')).toBeInTheDocument();
    expect(screen.getByText('Manage your utility company, make strategic investments, and compete in electricity markets over 10 years.')).toBeInTheDocument();
  });

  it('handles instructor login', async () => {
    renderComponent();
    
    const instructorButton = screen.getByText('Enter as Instructor');
    fireEvent.click(instructorButton);
    
    expect(mockSetRole).toHaveBeenCalledWith('instructor');
    expect(mockNavigate).toHaveBeenCalledWith('/instructor');
  });

  it('loads and displays available utilities', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('utility_1 ($2.0B budget)')).toBeInTheDocument();
      expect(screen.getByText('utility_2 ($1.5B budget)')).toBeInTheDocument();
    });
    
    expect(screen.getByText('2 utilities available for login')).toBeInTheDocument();
  });

  it('handles utility selection and login', async () => {
    renderComponent();
    
    await waitFor(() => {
      const utilitySelect = screen.getByDisplayValue('Select a utility...');
      fireEvent.change(utilitySelect, { target: { value: 'utility_1' } });
    });
    
    const utilityButton = screen.getByText('Enter as Utility');
    fireEvent.click(utilityButton);
    
    expect(mockSetRole).toHaveBeenCalledWith('utility');
    expect(mockSetUtilityId).toHaveBeenCalledWith('utility_1');
    expect(mockNavigate).toHaveBeenCalledWith('/utility/utility_1');
  });

  it('disables utility login when no utility is selected', () => {
    renderComponent();
    
    const utilityButton = screen.getByText('Select Utility First');
    expect(utilityButton).toBeDisabled();
  });

  it('shows loading state when utilities are being fetched', () => {
    // Mock loading state
    vi.mocked(useGameStore).mockReturnValue({
      ...mockUseGameStore(),
      // Simulate loading by not having utilities loaded yet
    });
    
    renderComponent();
    
    expect(screen.getByText('Loading utilities...')).toBeInTheDocument();
  });

  it('shows message when no utilities are available', async () => {
    // Mock empty utilities response
    const emptyQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    vi.doMock('../../api/client', () => ({
      default: {
        getAllUsers: vi.fn().mockResolvedValue([])
      }
    }));
    
    render(
      <QueryClientProvider client={emptyQueryClient}>
        <BrowserRouter>
          <RoleSelector />
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('No utilities available. Create utilities from instructor mode first.')).toBeInTheDocument();
    });
  });

  it('renders game features section', () => {
    renderComponent();
    
    expect(screen.getByText('Game Features')).toBeInTheDocument();
    expect(screen.getByText('Yearly Framework')).toBeInTheDocument();
    expect(screen.getByText('Realistic Economics')).toBeInTheDocument();
    expect(screen.getByText('Financial Modeling')).toBeInTheDocument();
    expect(screen.getByText('Market Dynamics')).toBeInTheDocument();
  });
});