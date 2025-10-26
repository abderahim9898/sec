import { describe, it, expect } from 'vitest';
import { Worker, Supervisor } from '@shared/types';

describe('Company Filter functionality', () => {
  const mockSupervisors: Supervisor[] = [
    { id: 'sup1', nom: 'Ahmed', telephone: '123', company: 'AGRI SUPPORT', statut: 'actif', createdAt: '2024-01-01' },
    { id: 'sup2', nom: 'Hassan', telephone: '456', company: 'AGRI STRATÉGIE', statut: 'actif', createdAt: '2024-01-01' },
    { id: 'sup3', nom: 'Fatima', telephone: '789', company: 'AGRI SUPPORT', statut: 'actif', createdAt: '2024-01-01' },
    { id: 'sup4', nom: 'Ali', telephone: '101', statut: 'actif', createdAt: '2024-01-01' }, // No company
  ];

  const mockWorkers: Worker[] = [
    { id: '1', nom: 'Worker 1', cin: 'AA1', supervisorId: 'sup1', fermeId: 'f1', telephone: '111', sexe: 'homme', age: 25, chambre: '1', secteur: 'A', dateEntree: '2024-01-01', statut: 'actif' },
    { id: '2', nom: 'Worker 2', cin: 'AA2', supervisorId: 'sup2', fermeId: 'f1', telephone: '222', sexe: 'femme', age: 30, chambre: '2', secteur: 'B', dateEntree: '2024-01-01', statut: 'actif' },
    { id: '3', nom: 'Worker 3', cin: 'AA3', supervisorId: 'sup3', fermeId: 'f1', telephone: '333', sexe: 'homme', age: 28, chambre: '3', secteur: 'C', dateEntree: '2024-01-01', statut: 'actif' },
    { id: '4', nom: 'Worker 4', cin: 'AA4', supervisorId: 'sup4', fermeId: 'f1', telephone: '444', sexe: 'femme', age: 35, chambre: '4', secteur: 'D', dateEntree: '2024-01-01', statut: 'actif' },
    { id: '5', nom: 'Worker 5', cin: 'AA5', fermeId: 'f1', telephone: '555', sexe: 'homme', age: 32, chambre: '5', secteur: 'E', dateEntree: '2024-01-01', statut: 'actif' }, // No supervisor
  ];

  const filterWorkerByCompany = (worker: Worker, selectedCompany: string, supervisors: Supervisor[]) => {
    if (selectedCompany === 'all') return true;
    
    const workerSupervisor = supervisors.find(s => s.id === worker.supervisorId);
    if (selectedCompany === 'none' && workerSupervisor?.company) {
      return false;
    } else if (selectedCompany !== 'none' && workerSupervisor?.company !== selectedCompany) {
      return false;
    }
    return true;
  };

  it('should return all workers when selectedCompany is "all"', () => {
    const filteredWorkers = mockWorkers.filter(worker => 
      filterWorkerByCompany(worker, 'all', mockSupervisors)
    );
    expect(filteredWorkers).toHaveLength(5);
  });

  it('should filter workers by AGRI SUPPORT company', () => {
    const filteredWorkers = mockWorkers.filter(worker => 
      filterWorkerByCompany(worker, 'AGRI SUPPORT', mockSupervisors)
    );
    expect(filteredWorkers).toHaveLength(2);
    expect(filteredWorkers.map(w => w.id)).toEqual(['1', '3']);
  });

  it('should filter workers by AGRI STRATÉGIE company', () => {
    const filteredWorkers = mockWorkers.filter(worker => 
      filterWorkerByCompany(worker, 'AGRI STRATÉGIE', mockSupervisors)
    );
    expect(filteredWorkers).toHaveLength(1);
    expect(filteredWorkers[0].id).toBe('2');
  });

  it('should return workers without company when selectedCompany is "none"', () => {
    const filteredWorkers = mockWorkers.filter(worker => 
      filterWorkerByCompany(worker, 'none', mockSupervisors)
    );
    expect(filteredWorkers).toHaveLength(2); // Worker 4 (supervisor without company) and Worker 5 (no supervisor)
    expect(filteredWorkers.map(w => w.id)).toEqual(['4', '5']);
  });

  it('should extract unique companies from supervisors', () => {
    const companies = Array.from(new Set(
      mockSupervisors
        .filter(s => s.company && s.company.trim() !== '')
        .map(s => s.company)
    )).sort();
    
    expect(companies).toEqual(['AGRI STRATÉGIE', 'AGRI SUPPORT']);
  });
});
