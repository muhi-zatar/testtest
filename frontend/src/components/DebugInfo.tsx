import React from 'react';

const DebugInfo: React.FC = () => {
  const [apiStatus, setApiStatus] = React.useState<'checking' | 'success' | 'error'>('checking');
  const [apiError, setApiError] = React.useState<string>('');

  React.useEffect(() => {
    // Test API connection
    const testAPI = async () => {
      try {
        const response = await fetch('http://localhost:8000/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ API Health Check:', data);
        setApiStatus('success');
      } catch (error) {
        console.error('❌ API Health Check Failed:', error);
        setApiError(error instanceof Error ? error.message : 'Unknown error');
        setApiStatus('error');
      }
    };
    
    testAPI();
  }, []);

  const handleTestConnection = () => {
    setApiStatus('checking');
    setApiError('');
    fetch('http://localhost:8000/health')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('✅ API Health Check:', data);
        setApiStatus('success');
      })
      .catch(error => {
        console.error('❌ API Health Check Failed:', error);
        setApiError(error instanceof Error ? error.message : 'Unknown error');
        setApiStatus('error');
      });
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 text-sm max-w-sm z-50">
      <h3 className="font-semibold text-white mb-2">Debug Info</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">React:</span>
          <span className="text-green-400">✓ Loaded</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Router:</span>
          <span className="text-green-400">✓ Active</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">API Status:</span>
          <span className={`${
            apiStatus === 'success' ? 'text-green-400' :
            apiStatus === 'error' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {apiStatus === 'success' ? '✓ Connected' :
             apiStatus === 'error' ? '✗ Failed' :
             '⏳ Checking...'}
          </span>
        </div>
        
        {apiStatus === 'error' && (
          <div className="text-red-400 text-xs mt-2">
            <div>Error: {apiError}</div>
            <button 
              onClick={handleTestConnection}
              className="mt-1 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-400">Environment:</span>
          <span className="text-blue-400">{import.meta.env.MODE}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Port:</span>
          <span className="text-blue-400">{window.location.port || '80'}</span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="text-xs text-gray-400">
          Backend: {apiStatus === 'success' ? 'localhost:8000' : 'Not connected'}
        </div>
      </div>
    </div>
  );
};

export default DebugInfo;