import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add error boundary and better error handling
const rootElement = document.getElementById('root');

console.log('🚀 Starting React application...');
console.log('Environment:', {
  NODE_ENV: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL
});

if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

try {
  console.log('✅ Root element found, rendering React app...');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('✅ React app rendered successfully');
} catch (error) {
  console.error('Failed to render React app:', error);
  // Fallback content
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif; background: #1f2937; color: white; min-height: 100vh;">
      <h1>Application Error</h1>
      <p>Failed to load the application. Please check the console for details.</p>
      <p style="color: #ef4444;">Error: ${error}</p>
      <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
        Reload Page
      </button>
    </div>
  `;
}