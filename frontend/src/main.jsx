import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Globally inject credentials for all API requests to ensure secure cookies (JWT) are sent
const originalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;
  if (!config) config = {};
  config.credentials = 'include';
  
  const response = await originalFetch(resource, config);
  
  // Handle unauthorized/expired token globally
  if (response.status === 401 || response.status === 403) {
    // If not already on login page, redirect
    if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  }
  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
