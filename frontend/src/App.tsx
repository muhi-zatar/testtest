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
    },
  },
});

function App() {
  return (
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
  );
}

export default App;