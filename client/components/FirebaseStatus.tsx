import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, AlertCircle } from 'lucide-react';
import { firebaseCircuitBreaker } from '@/utils/circuitBreaker';

export const FirebaseStatus: React.FC = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'circuit-open'>('connecting');

  useEffect(() => {
    const checkStatus = () => {
      const circuitState = firebaseCircuitBreaker.getState();
      
      if (circuitState === 'OPEN') {
        setStatus('circuit-open');
      } else if (!navigator.onLine) {
        setStatus('disconnected');
      } else {
        setStatus('connected');
      }
    };

    checkStatus();
    
    // Check status every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    
    // Listen for online/offline events
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
    };
  }, []);

  // Only show when there are issues
  if (status === 'connected') {
    return null;
  }

  const getStatusInfo = () => {
    switch (status) {
      case 'circuit-open':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Firebase temporairement suspendu',
          variant: 'destructive' as const
        };
      case 'disconnected':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Hors ligne',
          variant: 'destructive' as const
        };
      case 'connecting':
        return {
          icon: <Database className="h-3 w-3" />,
          text: 'Connexion...',
          variant: 'secondary' as const
        };
      default:
        return {
          icon: <Database className="h-3 w-3" />,
          text: 'Connecté',
          variant: 'default' as const
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Badge 
        variant={statusInfo.variant}
        className="flex items-center space-x-1 px-2 py-1"
      >
        {statusInfo.icon}
        <span className="text-xs">{statusInfo.text}</span>
      </Badge>
    </div>
  );
};
