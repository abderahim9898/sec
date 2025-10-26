import { describe, it, expect } from 'vitest';
import { isDeleteAllWorkers } from './clearAllRoomOccupants';

describe('clearAllRoomOccupants utilities', () => {
  describe('isDeleteAllWorkers', () => {
    it('should return true when all active workers are selected', () => {
      const allWorkers = [
        { id: '1', statut: 'actif', nom: 'Worker 1' },
        { id: '2', statut: 'actif', nom: 'Worker 2' },
        { id: '3', statut: 'inactif', nom: 'Worker 3' }, // inactive worker should be ignored
      ];
      
      const selectedWorkerIds = new Set(['1', '2']);
      
      const result = isDeleteAllWorkers(selectedWorkerIds, allWorkers);
      expect(result).toBe(true);
    });

    it('should return false when not all active workers are selected', () => {
      const allWorkers = [
        { id: '1', statut: 'actif', nom: 'Worker 1' },
        { id: '2', statut: 'actif', nom: 'Worker 2' },
        { id: '3', statut: 'actif', nom: 'Worker 3' },
      ];
      
      const selectedWorkerIds = new Set(['1', '2']); // missing worker 3
      
      const result = isDeleteAllWorkers(selectedWorkerIds, allWorkers);
      expect(result).toBe(false);
    });

    it('should return false when no workers are selected', () => {
      const allWorkers = [
        { id: '1', statut: 'actif', nom: 'Worker 1' },
        { id: '2', statut: 'actif', nom: 'Worker 2' },
      ];
      
      const selectedWorkerIds = new Set<string>();
      
      const result = isDeleteAllWorkers(selectedWorkerIds, allWorkers);
      expect(result).toBe(false);
    });

    it('should return false when selected workers contain extra IDs not in active workers', () => {
      const allWorkers = [
        { id: '1', statut: 'actif', nom: 'Worker 1' },
        { id: '2', statut: 'actif', nom: 'Worker 2' },
      ];
      
      const selectedWorkerIds = new Set(['1', '2', '3']); // extra worker 3 that doesn't exist
      
      const result = isDeleteAllWorkers(selectedWorkerIds, allWorkers);
      expect(result).toBe(false);
    });

    it('should handle empty workers array', () => {
      const allWorkers: any[] = [];
      const selectedWorkerIds = new Set<string>();
      
      const result = isDeleteAllWorkers(selectedWorkerIds, allWorkers);
      expect(result).toBe(false);
    });

    it('should only consider active workers for comparison', () => {
      const allWorkers = [
        { id: '1', statut: 'actif', nom: 'Worker 1' },
        { id: '2', statut: 'inactif', nom: 'Worker 2' },
        { id: '3', statut: 'inactif', nom: 'Worker 3' },
      ];
      
      const selectedWorkerIds = new Set(['1']); // only selecting the one active worker
      
      const result = isDeleteAllWorkers(selectedWorkerIds, allWorkers);
      expect(result).toBe(true);
    });
  });
});
