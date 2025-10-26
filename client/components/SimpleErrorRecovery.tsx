import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const SimpleErrorRecovery: React.FC = () => {
  const [showRecovery, setShowRecovery] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Listen for unhandled promise rejections (common with Firebase errors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;

      // Only show for Firebase-related errors, but be more specific
      if ((error?.message?.includes('Failed to fetch') &&
           (error?.stack?.includes('firebase') || error?.stack?.includes('firestore'))) ||
          error?.code?.includes('firestore') ||
          error?.code?.includes('auth')) {

        setErrorCount(prev => {
          const newCount = prev + 1;
          // Show recovery after 5 Firebase errors to reduce false positives
          if (newCount >= 5) {
            setShowRecovery(true);
          }
          return newCount;
        });
      }
    };

    // Listen for window errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      
      if (error?.message?.includes('Failed to fetch') && 
          (error?.stack?.includes('firebase') || error?.stack?.includes('firestore'))) {
        
        setErrorCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            setShowRecovery(true);
          }
          return newCount;
        });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowRecovery(false);
    setErrorCount(0);
  };

  if (!showRecovery) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">Problème de connectivité détecté</span>
              <p className="text-sm mt-1">
                Plusieurs erreurs de réseau ont été détectées ({errorCount}). 
                Essayez de recharger la page si l'application ne fonctionne pas correctement.
              </p>
            </div>
            <div className="flex space-x-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
              >
                Ignorer
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReload}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Recharger
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
