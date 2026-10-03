import React, { useState, useEffect } from 'react';
import CulturalLoader from './CulturalLoader';

interface AuthLoadingSplashProps {
  message?: string;
}

const AuthLoadingSplash: React.FC<AuthLoadingSplashProps> = ({ message = 'Restoring verified session...' }) => {
  const [showBypass, setShowBypass] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowBypass(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleBypass = () => {
    try {
      localStorage.removeItem('ssk_last_authenticated_route');
    } catch (e) {
      // ignore
    }
    window.location.hash = '#/';
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen">
      <CulturalLoader message={message} overlay={true} />

      {showBypass && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in duration-300">
          <button
            onClick={handleBypass}
            className="px-4 py-1.5 rounded-full bg-white/90 border border-amber-300 text-xs text-amber-800 hover:text-amber-950 shadow-sm font-semibold transition-colors backdrop-blur-xs"
          >
            Taking longer than expected? Click here to continue
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthLoadingSplash;
