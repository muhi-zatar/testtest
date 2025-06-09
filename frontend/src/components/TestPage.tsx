import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ElectricityMarketAPI from '../api/client';

const TestPage: React.FC = () => {
  const [testResults, setTestResults] = React.useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // Test API health
  const { data: healthData, error: healthError, isLoading: healthLoading } = useQuery({
    queryKey: ['health-test'],
    queryFn: ElectricityMarketAPI.healthCheck,
    retry: 1,
    onSuccess: () => addResult('✅ API Health Check successful'),
    onError: (error) => addResult(`❌ API Health Check failed: ${error}`),
  });

  const testBasicFunctionality = () => {
    addResult('🧪 Testing basic functionality...');
    
    // Test React state
    addResult('✅ React state working');
    
    // Test localStorage
    try {
      localStorage.setItem('test', 'value');
      const value = localStorage.getItem('test');
      if (value === 'value') {
        addResult('✅ localStorage working');
      } else {
        addResult('❌ localStorage not working');
      }
      localStorage.removeItem('test');
    } catch (error) {
      addResult(`❌ localStorage error: ${error}`);
    }
    
    // Test fetch
    fetch('http://localhost:8000/health')
      .then(response => response.json())
      .then(data => addResult(`✅ Direct fetch successful: ${data.status}`))
      .catch(error => addResult(`❌ Direct fetch failed: ${error.message}`));
  };

  const testSampleData = async () => {
    try {
      addResult('🔄 Creating sample data...');
      const result = await ElectricityMarketAPI.createSampleData();
      addResult(`✅ Sample data created: ${result.message}`);
    } catch (error) {
      addResult(`❌ Sample data creation failed: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">System Test Page</h1>
        
        {/* API Health Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Health Status</h2>
          {healthLoading && <p className="text-yellow-400">Checking API health...</p>}
          {healthError && <p className="text-red-400">API Error: {(healthError as Error).message}</p>}
          {healthData && (
            <div className="text-green-400">
              <p>✅ API Status: {healthData.status}</p>
              <p>Version: {healthData.version}</p>
              <p>Framework: {healthData.framework}</p>
            </div>
          )}
        </div>

        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="space-x-4">
            <button
              onClick={testBasicFunctionality}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Test Basic Functionality
            </button>
            <button
              onClick={testSampleData}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Create Sample Data
            </button>
            <button
              onClick={() => setTestResults([])}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-900 rounded p-4 font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-400">No test results yet. Click a test button above.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Environment Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Mode:</strong> {import.meta.env.MODE}
            </div>
            <div>
              <strong>Dev:</strong> {import.meta.env.DEV ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Base URL:</strong> {import.meta.env.BASE_URL}
            </div>
            <div>
              <strong>Current URL:</strong> {window.location.href}
            </div>
            <div>
              <strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...
            </div>
            <div>
              <strong>Local Storage:</strong> {typeof Storage !== 'undefined' ? 'Available' : 'Not Available'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg inline-block"
          >
            Back to Role Selection
          </a>
        </div>
      </div>
    </div>
  );
};

export default TestPage;