import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Import layouts and pages
import RoleSelector from './components/RoleSelector';
import InstructorLayout from './layouts/InstructorLayout';
import UtilityLayout from './layouts/UtilityLayout';

// Instructor pages
import InstructorDashboard from './pages/instructor/Dashboard';
import GameSetup from './pages/instructor/GameSetup';
import MarketControl from './pages/instructor/MarketControl';
import Analytics from './pages/instructor/Analytics';
import EventManagement from './pages/instructor/EventManagement';

// Utility pages
import UtilityDashboard from './pages/utility/Dashboard';
import Portfolio from './pages/utility/Portfolio';
import Investment from './pages/utility/Investment';
import Bidding from './pages/utility/Bidding';
import MarketAnalysis from './pages/utility/MarketAnalysis';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1, // Reduce retries to avoid hanging
      retryDelay: 1000,
    },
  },
});

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-4">
              The application encountered an error. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-gray-400">Error Details</summary>
                <pre className="mt-2 text-xs text-red-400 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  // Add some basic logging
  React.useEffect(() => {
    console.log('🚀 Electricity Market Game App starting...');
    console.log('Environment:', {
      NODE_ENV: import.meta.env.MODE,
      BASE_URL: import.meta.env.BASE_URL,
      DEV: import.meta.env.DEV
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-900 text-white">
            <Routes>
              {/* Role Selection */}
              <Route path="/" element={<RoleSelector />} />
              
              {/* Instructor Routes */}
              <Route path="/instructor" element={<InstructorLayout />}>
                <Route index element={<Navigate to="/instructor/dashboard" replace />} />
                <Route path="dashboard" element={<InstructorDashboard />} />
                <Route path="setup" element={<GameSetup />} />
                <Route path="control" element={<MarketControl />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="events" element={<EventManagement />} />
              </Route>

              {/* Utility Routes */}
              <Route path="/utility/:utilityId" element={<UtilityLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<UtilityDashboard />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="investment" element={<Investment />} />
                <Route path="bidding" element={<Bidding />} />
                <Route path="analysis" element={<MarketAnalysis />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'bg-gray-800 text-white',
              duration: 4000,
            }}
          />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;