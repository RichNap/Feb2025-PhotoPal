
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Global logger for the System Terminal
window.dispatchSystemLog = (msg: string) => {
    window.dispatchEvent(new CustomEvent('photopal-system-log', { detail: msg }));
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
}

// v6.2.2: Register Virtual Media Bridge (Service Worker)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('[Bridge] Registered successfully:', reg.scope);
                window.dispatchSystemLog(`IO_TRACE: Virtual Media Bridge active on scope: ${reg.scope}`);
            })
            .catch(err => {
                console.error('[Bridge] Registration failed:', err);
                window.dispatchSystemLog(`IO_ERR: Media Bridge failed to initialize: ${err.message}`);
            });
    });
}
