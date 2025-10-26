import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Supervisor } from '@shared/types';
import { firebaseCircuitBreaker } from '@/utils/circuitBreaker';
import { saveSupervisorsToCache, loadSupervisorsFromCache } from '@/utils/offlineSuperviorCache';

export const useSupervisors = () => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load cached data immediately if available
    const cachedSupervisors = loadSupervisorsFromCache();
    if (cachedSupervisors) {
      setSupervisors(cachedSupervisors);
      setLoading(false);
      setError(null);
    }

    const fetchSupervisors = async (retryCount = 0) => {
      const maxRetries = 3;

      try {
        if (retryCount === 0 && !cachedSupervisors) {
          setLoading(true);
        }

        // Check if we're online before attempting fetch
        if (!navigator.onLine) {
          setError('You are offline. Please check your internet connection.');
          setLoading(false);
          return;
        }

        // Check if circuit breaker allows requests
        if (!firebaseCircuitBreaker.isAvailable()) {
          setError('Firebase temporarily unavailable due to connection issues. Retrying automatically...');
          setLoading(false);
          return;
        }

        // Use circuit breaker for Firebase operations
        const snapshot = await firebaseCircuitBreaker.execute(async () => {
          const supervisorsRef = collection(db, 'supervisors');
          return await getDocs(supervisorsRef);
        });

        const supervisorsList: Supervisor[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Supervisor;
          supervisorsList.push({ id: doc.id, ...data });
        });

        // Sort all supervisors client-side (both active and inactive)
        const allSupervisors = supervisorsList
          .sort((a, b) => a.nom.localeCompare(b.nom));

        setSupervisors(allSupervisors);
        setError(null);

        // Save to cache for offline use
        saveSupervisorsToCache(allSupervisors);
      } catch (err: any) {
        console.error('Error fetching supervisors:', err);

        // Handle network errors with retry logic
        if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
          if (retryCount < maxRetries) {
            console.log(`Retrying supervisor fetch (${retryCount + 1}/${maxRetries})...`);
            // Exponential backoff: wait 1s, 2s, 4s
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => fetchSupervisors(retryCount + 1), delay);
            return;
          } else {
            setError('Network connection issue. Please check your internet and try again.');
          }
        } else {
          // If we have cached data, show a less severe error
          if (cachedSupervisors && cachedSupervisors.length > 0) {
            setError('Using cached supervisors. Connection will be restored automatically.');
          } else {
            setError('Failed to load supervisors. Please try again.');
          }
        }
      } finally {
        if (retryCount === 0) {
          setLoading(false);
        }
      }
    };

    fetchSupervisors();

    // Refresh every 60 seconds (reduced frequency to minimize network load)
    const interval = setInterval(() => fetchSupervisors(), 60000);

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('Back online, refreshing supervisors...');
      fetchSupervisors();
    };

    const handleOffline = () => {
      setError('You are offline. Supervisors will be refreshed when connection is restored.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { supervisors, loading, error };
};
