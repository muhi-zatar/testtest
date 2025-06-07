import React from 'react';

const DebugInfo: React.FC = () => {
  const [apiStatus, setApiStatus] = React.useState<'checking' | 'success' | 'error'>('checking');
  const [apiError, setApiError] = React.useState<string>('');

  React.useEffect(() => {
    // Test API connection
    fetch('http://localhost:8000/health')
      .then(response => response.json())
      .then(data => {
        console.log('✅ API Health Check:', data);
        setApiStatus('success');
      })
      .catch(error => {
        console.error('❌ API Health Check Failed:', error);
        setApiError(error.message);
        setApiStatus('error');
      });
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 text-sm max-w-sm">
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
            Error: {apiError}
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
    </div>
  );
};

export default DebugInfo;