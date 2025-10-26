import { describe, it, expect } from 'vitest';
import { Worker } from '@shared/types';

describe('Worker Matricule functionality', () => {
  it('should accept Worker with matricule field', () => {
    const worker: Worker = {
      id: 'test-id',
      nom: 'Test Worker',
      cin: 'AA123456',
      matricule: 'MAT001',
      fermeId: 'test-farm',
      telephone: '0612345678',
      sexe: 'homme',
      age: 25,
      chambre: '10',
      secteur: 'A',
      dateEntree: '2024-01-01',
      statut: 'actif'
    };

    expect(worker.matricule).toBe('MAT001');
    expect(worker.nom).toBe('Test Worker');
    expect(worker.cin).toBe('AA123456');
  });

  it('should accept Worker without matricule field (optional)', () => {
    const worker: Worker = {
      id: 'test-id',
      nom: 'Test Worker',
      cin: 'AA123456',
      fermeId: 'test-farm',
      telephone: '0612345678',
      sexe: 'homme',
      age: 25,
      chambre: '10',
      secteur: 'A',
      dateEntree: '2024-01-01',
      statut: 'actif'
    };

    expect(worker.matricule).toBeUndefined();
    expect(worker.nom).toBe('Test Worker');
    expect(worker.cin).toBe('AA123456');
  });

  it('should handle empty matricule string', () => {
    const worker: Worker = {
      id: 'test-id',
      nom: 'Test Worker',
      cin: 'AA123456',
      matricule: '',
      fermeId: 'test-farm',
      telephone: '0612345678',
      sexe: 'homme',
      age: 25,
      chambre: '10',
      secteur: 'A',
      dateEntree: '2024-01-01',
      statut: 'actif'
    };

    expect(worker.matricule).toBe('');
    expect(typeof worker.matricule).toBe('string');
  });
});
