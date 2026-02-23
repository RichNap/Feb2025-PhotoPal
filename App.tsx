
import React from 'react';
import { MediaProvider } from './contexts/MediaContext';
import { UIProvider } from './contexts/UIContext';
import { PlaybackProvider } from './contexts/PlaybackContext';
import AppContent from './components/AppContent';

const App: React.FC = () => {
    return (
        <MediaProvider>
            <UIProvider>
                <PlaybackProvider>
                    {/* Removed select-none to restore native browser text selection for logs, IDs, and captions */}
                    <div className="w-screen h-screen bg-[#0b0f19] text-gray-100 overflow-hidden font-sans">
                        <AppContent />
                    </div>
                </PlaybackProvider>
            </UIProvider>
        </MediaProvider>
    );
};

export default App;
