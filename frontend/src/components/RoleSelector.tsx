import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicCapIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useGameStore } from '../store/gameStore';
import DebugInfo from './DebugInfo';

const RoleSelector: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, setUtilityId } = useGameStore();
  const [selectedUtility, setSelectedUtility] = useState('utility_1');

  const handleInstructorLogin = () => {
    setRole('instructor');
    navigate('/instructor');
  };

  const handleUtilityLogin = () => {
    setRole('utility');
    setUtilityId(selectedUtility);
    navigate(`/utility/${selectedUtility}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-green-900 flex items-center justify-center p-4">
      {/* Debug Info - only show in development */}
      {import.meta.env.DEV && <DebugInfo />}
      
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Electricity Market Game
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Multi-Year Capacity Planning & Investment Simulation
          </p>
          <p className="text-lg text-gray-400">
            2025-2035 • Strategic Decision Making • Real Market Dynamics
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Instructor Card */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:transform hover:scale-105">
            <div className="text-center">
              <div className="bg-blue-600 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <AcademicCapIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Instructor Mode</h2>
              <p className="text-gray-300 mb-6">
                Control the simulation, manage market events, and monitor all utility performance across the 10-year period.
              </p>
              <ul className="text-left text-gray-400 mb-8 space-y-2">
                <li>• Create and configure game sessions</li>
                <li>• Control year progression and market clearing</li>
                <li>• Monitor all utilities' financial performance</li>
                <li>• Trigger market events and fuel shocks</li>
                <li>• View comprehensive analytics and rankings</li>
              </ul>
              <button
                onClick={handleInstructorLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Enter as Instructor
              </button>
            </div>
          </div>

          {/* Utility Card */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-green-500 transition-all duration-300 hover:transform hover:scale-105">
            <div className="text-center">
              <div className="bg-green-600 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <BuildingOfficeIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Utility Mode</h2>
              <p className="text-gray-300 mb-6">
                Manage your utility company, make strategic investments, and compete in electricity markets over 10 years.
              </p>
              <ul className="text-left text-gray-400 mb-6 space-y-2">
                <li>• Manage multi-billion dollar budgets</li>
                <li>• Build power plants across 10 technologies</li>
                <li>• Submit annual bids for 3 load periods</li>
                <li>• Analyze market trends and fuel prices</li>
                <li>• Optimize portfolio for maximum ROI</li>
              </ul>
              
              {/* Utility Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Your Utility
                </label>
                <select
                  value={selectedUtility}
                  onChange={(e) => setSelectedUtility(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="utility_1">Utility 1 - Traditional Portfolio</option>
                  <option value="utility_2">Utility 2 - Mixed Generation</option>
                  <option value="utility_3">Utility 3 - Renewable Focus</option>
                </select>
              </div>
              
              <button
                onClick={handleUtilityLogin}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Enter as Utility
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-white mb-8">Game Features</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-gray-800/30 rounded-lg p-6">
              <div className="text-3xl mb-3">📊</div>
              <h4 className="font-semibold text-white mb-2">Yearly Framework</h4>
              <p className="text-gray-400 text-sm">10-year simulation with 3 load periods instead of 8760 hours</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-6">
              <div className="text-3xl mb-3">🏭</div>
              <h4 className="font-semibold text-white mb-2">Realistic Economics</h4>
              <p className="text-gray-400 text-sm">Authentic plant costs, construction times, and financing</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-6">
              <div className="text-3xl mb-3">💰</div>
              <h4 className="font-semibold text-white mb-2">Financial Modeling</h4>
              <p className="text-gray-400 text-sm">Multi-billion budgets, debt/equity analysis, ROI calculations</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h4 className="font-semibold text-white mb-2">Market Dynamics</h4>
              <p className="text-gray-400 text-sm">Fuel volatility, carbon pricing, weather events</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;