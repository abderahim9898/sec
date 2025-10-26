import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator,
  doc,
  getDoc,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCKZpHRAm1W6lQddnArZo6Onxiwfngty6Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "secteur-1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "secteur-1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "secteur-1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "568304445766",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:568304445766:web:274405f81b2f432b80dd47"
};

// Debug: Log Firebase config
console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey.substring(0, 10) + '...'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase uses its own networking - don't intercept fetch

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore with persistent cache and better network compatibility
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentMultipleTabManager()
  }),
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
});

// Test Firebase connectivity with retry logic
export const testFirebaseConnection = async (retryCount = 0): Promise<{ success: boolean; error?: string }> => {
  const maxRetries = 3; // Increased retries for unavailable errors
  try {
    if (retryCount === 0) {
      console.log(`Testing Firebase connection...`);
    }

    // First check if we're online
    if (!navigator.onLine) {
      return { success: false, error: 'Device is offline' };
    }

    // Skip the aggressive network test to avoid unnecessary fetch requests
    // that might be causing the errors

    // Test Firestore connection using a valid collection name
    const testDoc = doc(db, 'app_config', 'connection_test');

    // Longer timeout to reduce false negatives
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 10000); // 10 seconds
    });

    const connectionPromise = getDoc(testDoc);
    await Promise.race([connectionPromise, timeoutPromise]);

    console.log('Firebase connection: SUCCESS');
    return { success: true };
  } catch (error: any) {
    // Only log errors on first attempt to reduce noise
    if (retryCount === 0) {
      console.error('Firebase connection test failed:', error);
    }
    // Only show detailed error info on first attempt
    if (retryCount === 0) {
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
    }

    // Handle specific error cases
    if (error.code === 'permission-denied') {
      return {
        success: false,
        error: 'Firestore rules not deployed. Deploy rules via Firebase Console.'
      };
    }

    if (error.code === 'failed-precondition') {
      return {
        success: false,
        error: 'Firestore database not created - please initialize database in Firebase Console'
      };
    }

    if (error.code === 'unavailable') {
      return {
        success: false,
        error: 'Firebase backend temporarily unavailable. Client will operate in offline mode.'
      };
    }

    let errorMessage = 'Connection failed';
    if (error.code) {
      errorMessage = `Firebase error: ${error.code}`;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Connection timeout - check your network';
    } else if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      // Don't log verbose messages for common network issues
      if (retryCount === 0) {
        console.warn('Network connectivity issue detected');
      }
      errorMessage = 'Network connectivity issue - check your internet connection';
    } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      errorMessage = 'Network error - try refreshing the page';
    }

    // Retry on fetch failures (transient network issues) but with longer delay
    if ((error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) && retryCount < maxRetries) {
      if (retryCount === 0) {
        console.log(`Retrying connection test...`);
      }
      await new Promise(resolve => setTimeout(resolve, 3000)); // Longer delay
      return testFirebaseConnection(retryCount + 1);
    }

    return { success: false, error: errorMessage };
  }
};

// Connection recovery utility
export const attemptConnectionRecovery = async () => {
  console.log('🔄 Attempting connection recovery...');

  try {
    // Try to re-enable network if it was disabled
    await enableNetwork(db);
    console.log('📡 Network re-enabled for Firestore');
  } catch (error) {
    console.log('Network was already enabled or error enabling:', error);
  }

  // Test actual Firestore connection
  return await testFirebaseConnection();
};

// Force offline mode utility
export const forceOfflineMode = async () => {
  try {
    await disableNetwork(db);
    console.log('📴 Firestore forced into offline mode');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to disable network:', error);
    return { success: false, error: error.message };
  }
};

// Force online mode utility
export const forceOnlineMode = async () => {
  try {
    await enableNetwork(db);
    console.log('📡 Firestore forced into online mode');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to enable network:', error);
    return { success: false, error: error.message };
  }
};

// Auto attempt recovery when the browser regains connectivity
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    attemptConnectionRecovery().then((res) => {
      if (res.success) {
        console.log('✅ Firestore reconnected after coming online');
      } else {
        console.log('⚠️ Firestore recovery attempt failed after coming online:', res.error);
      }
    });
  });
}

// Emergency recovery - clear cache and reload
export const emergencyFirebaseRecovery = () => {
  console.log('🚨 Emergency Firebase recovery - clearing cache and reloading...');

  // Clear localStorage
  try {
    localStorage.clear();
  } catch (e) {
    console.log('Could not clear localStorage:', e);
  }

  // Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch (e) {
    console.log('Could not clear sessionStorage:', e);
  }

  // Force reload the page
  window.location.reload();
};

// Nuclear option - aggressive recovery
export const aggressiveFirebaseRecovery = () => {
  console.log('☢️ Aggressive Firebase recovery - nuclear option...');

  return new Promise<void>((resolve) => {
    // Clear all possible storage
    const clearStorage = async () => {
      try {
        // Clear all storage types
        localStorage.clear();
        sessionStorage.clear();

        // Clear IndexedDB
        if ('indexedDB' in window) {
          const dbs = await indexedDB.databases();
          await Promise.all(
            dbs.map(db => {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            })
          );
        }

        // Clear service worker cache
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }

        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        console.log('✅ All storage cleared');
        resolve();
      } catch (error) {
        console.error('Storage clearing failed:', error);
        resolve(); // Continue anyway
      }
    };

    clearStorage().then(() => {
      // Force reload with cache busting
      const url = new URL(window.location.href);
      url.searchParams.set('cache_bust', Date.now().toString());
      url.searchParams.set('force_reload', 'true');
      window.location.href = url.toString();
    });
  });
};

export default app;
