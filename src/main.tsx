import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { warmAppCache } from './offline/warmAppCache'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {
    type: 'module',
    scope: '/'
  }).then(registration => {
    console.log('SW registered:', registration);
    // First visit: the page loaded before the service worker existed.
    window.addEventListener('load', () => void warmAppCache(), { once: true });
    if (document.readyState === 'complete') void warmAppCache();
  }).catch(error => {
    console.log('SW registration failed:', error);
  });
}

// Ask the browser not to evict the notes database under storage pressure.
void navigator.storage?.persist?.();
