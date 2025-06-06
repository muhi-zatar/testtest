import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  CogIcon, 
  PlayIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useGameStore } from '../store/gameStore';

const InstructorLayout: React.FC = () => {
  const location = useLocation();
  const { currentSession } = useGameStore();

  const navigation = [
    { name: 'Dashboard', href: '/instructor/dashboard', icon: HomeIcon },
    { name: 'Game Setup', href: '/instructor/setup', icon: CogIcon },
    { name: 'Market Control', href: '/instructor/control', icon: PlayIcon },
    { name: 'Analytics', href: '/instructor/analytics', icon: ChartBarIcon },
    { name: 'Events', href: '/instructor/events', icon: ExclamationTriangleIcon },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Instructor Mode</h1>
              <p className="text-sm text-gray-400">Market Orchestrator</p>
            </div>
          </div>
        </div>

        {/* Current Session Info */}
        {currentSession && (
          <div className="p-4 mx-4 mt-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
            <h3 className="text-sm font-medium text-blue-300 mb-2">Active Session</h3>
            <p className="text-white font-medium text-sm">{currentSession.name}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Year:</span>
                <span className="text-white">{currentSession.current_year}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Period:</span>
                <span className="text-white">{currentSession.start_year}-{currentSession.end_year}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">State:</span>
                <span className="text-green-400 capitalize">{currentSession.state.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-6 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700">
          <Link
            to="/"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
            Exit to Role Selection
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {navigation.find(item => isActive(item.href))?.name || 'Instructor Dashboard'}
              </h2>
              <p className="text-sm text-gray-400">
                Electricity Market Game • Multi-Year Simulation
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Year Progress */}
              {currentSession && (
                <div className="bg-gray-700 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-300">Progress:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${((currentSession.current_year - currentSession.start_year) / 
                                    (currentSession.end_year - currentSession.start_year)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-white font-medium">
                        {currentSession.current_year} / {currentSession.end_year}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">System Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default InstructorLayout;