import { Supervisor } from '@shared/types';

const CACHE_KEY = 'supervisors_cache';
const CACHE_TIMESTAMP_KEY = 'supervisors_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const saveSupervisorsToCache = (supervisors: Supervisor[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(supervisors));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to save supervisors to cache:', error);
  }
};

export const loadSupervisorsFromCache = (): Supervisor[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) {
      return null;
    }
    
    const cacheAge = Date.now() - parseInt(timestamp);
    if (cacheAge > CACHE_DURATION) {
      // Cache is too old, remove it
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.warn('Failed to load supervisors from cache:', error);
    return null;
  }
};

export const clearSupervisorsCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.warn('Failed to clear supervisors cache:', error);
  }
};
