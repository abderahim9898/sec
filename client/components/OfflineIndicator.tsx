import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { attemptConnectionRecovery } from '@/lib/firebase';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      console.log('🌐 Device is now online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
      console.log('📴 Device is now offline');
    };

    // Listen for Firebase critical errors
    const handleFirebaseError = (event: CustomEvent) => {
      console.log('🔥 Firebase critical error detected:', event.detail);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('firebase-critical-error', handleFirebaseError as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('firebase-critical-error', handleFirebaseError as EventListener);
    };
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      const result = await attemptConnectionRecovery();
      if (result.success) {
        setShowOfflineAlert(false);
        console.log('✅ Connection recovery successful');
      } else {
        console.log('❌ Connection recovery failed:', result.error);
      }
    } catch (error) {
      console.error('Connection retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    setShowOfflineAlert(false);
  };

  if (!showOfflineAlert) {
    return null;
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 mb-4">
      <WifiOff className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-amber-800">
          {isOnline 
            ? "🔄 Problème de connexion Firebase détecté. L'application fonctionne en mode hors ligne."
            : "📴 Vous êtes hors ligne. L'application utilisera les données mises en cache."
          }
        </div>
        <div className="flex space-x-2 ml-4">
          <Button
            onClick={handleRetryConnection}
            disabled={isRetrying}
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Test...' : 'Réessayer'}
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-amber-700 hover:bg-amber-100"
          >
            Masquer
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default OfflineIndicator;
