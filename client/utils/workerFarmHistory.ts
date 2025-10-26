import { Worker, WorkerHistory, Ferme, User } from '@shared/types';

/**
 * Identifies the previous farm where a worker was active before current assignment
 * @param worker The worker object with work history
 * @param currentFermeId The current farm ID where worker is being added
 * @returns The previous farm ID or null if no previous farm found
 */
export function getPreviousFarmId(worker: Worker, currentFermeId?: string): string | null {
  if (!worker.workHistory || worker.workHistory.length === 0) {
    return null;
  }

  // Sort work history by dateEntree descending (most recent first)
  const sortedHistory = [...worker.workHistory].sort((a, b) => {
    const dateA = new Date(a.dateEntree).getTime();
    const dateB = new Date(b.dateEntree).getTime();
    return dateB - dateA;
  });

  // If worker has current farm assignment, exclude it from search
  const farmIdToExclude = currentFermeId || worker.fermeId;

  // Find the most recent farm assignment that's different from current farm
  for (const history of sortedHistory) {
    if (history.fermeId !== farmIdToExclude) {
      return history.fermeId;
    }
  }

  // If all history entries are for the same farm, check if current worker.fermeId is different
  if (worker.fermeId && worker.fermeId !== currentFermeId) {
    return worker.fermeId;
  }

  return null;
}

/**
 * Gets all admin user IDs for a specific farm
 * @param fermeId The farm ID to get admins for
 * @param fermes Array of all farms
 * @returns Array of admin user IDs
 */
export function getFarmAdminIds(fermeId: string, fermes: Ferme[]): string[] {
  const farm = fermes.find(f => f.id === fermeId);
  return farm?.admins || [];
}

/**
 * Gets farm name by ID
 * @param fermeId The farm ID
 * @param fermes Array of all farms
 * @returns Farm name or 'Ferme inconnue' if not found
 */
export function getFarmName(fermeId: string, fermes: Ferme[]): string {
  const farm = fermes.find(f => f.id === fermeId);
  return farm?.nom || 'Ferme inconnue';
}

/**
 * Checks if a worker has been active in multiple farms
 * @param worker The worker object
 * @returns Boolean indicating if worker has multi-farm history
 */
export function hasMultiFarmHistory(worker: Worker): boolean {
  if (!worker.workHistory || worker.workHistory.length === 0) {
    return false;
  }

  const uniqueFarms = new Set(worker.workHistory.map(h => h.fermeId));
  return uniqueFarms.size > 1;
}

/**
 * Gets the most recent farm assignment (excluding current assignment)
 * @param worker The worker object
 * @param currentFermeId Current farm ID to exclude
 * @returns Object with farm ID and entry date, or null if no previous assignment
 */
export function getMostRecentPreviousFarmAssignment(
  worker: Worker, 
  currentFermeId?: string
): { fermeId: string; dateEntree: string; dateSortie?: string } | null {
  if (!worker.workHistory || worker.workHistory.length === 0) {
    return null;
  }

  const farmIdToExclude = currentFermeId || worker.fermeId;

  // Sort by dateEntree descending and find most recent different farm
  const sortedHistory = [...worker.workHistory]
    .filter(h => h.fermeId !== farmIdToExclude)
    .sort((a, b) => {
      const dateA = new Date(a.dateEntree).getTime();
      const dateB = new Date(b.dateEntree).getTime();
      return dateB - dateA;
    });

  if (sortedHistory.length > 0) {
    const mostRecent = sortedHistory[0];
    return {
      fermeId: mostRecent.fermeId,
      dateEntree: mostRecent.dateEntree,
      dateSortie: mostRecent.dateSortie
    };
  }

  return null;
}

/**
 * Determines if a worker is currently active in another farm
 * @param worker The worker object
 * @param targetFermeId The farm where worker is being added
 * @returns Object with conflict info or null if no conflict
 */
export function getActiveFarmConflict(
  worker: Worker, 
  targetFermeId: string
): { fermeId: string; isActive: boolean } | null {
  // Check if worker is currently active and in a different farm
  if (worker.statut === 'actif' && worker.fermeId !== targetFermeId) {
    return {
      fermeId: worker.fermeId,
      isActive: true
    };
  }

  return null;
}
