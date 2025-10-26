import { describe, it, expect } from 'vitest';
import { Worker, Supervisor } from '@shared/types';

describe('Company Statistics functionality', () => {
  const mockSupervisors: Supervisor[] = [
    { id: 'sup1', nom: 'Ahmed', telephone: '123', company: 'AGRI SUPPORT', statut: 'actif', createdAt: '2024-01-01' },
    { id: 'sup2', nom: 'Hassan', telephone: '456', company: 'AGRI STRATÉGIE', statut: 'actif', createdAt: '2024-01-01' },
    { id: 'sup3', nom: 'Fatima', telephone: '789', company: 'AGRI SUPPORT', statut: 'actif', createdAt: '2024-01-01' },
    { id: 'sup4', nom: 'Ali', telephone: '101', company: 'AGRI TECH', statut: 'inactif', createdAt: '2024-01-01' },
  ];

  const mockWorkers: Worker[] = [
    { id: '1', nom: 'Worker 1', cin: 'AA1', supervisorId: 'sup1', fermeId: 'farm1', telephone: '111', sexe: 'homme', age: 25, chambre: '1', secteur: 'A', dateEntree: '2024-01-01', statut: 'actif' },
    { id: '2', nom: 'Worker 2', cin: 'AA2', supervisorId: 'sup2', fermeId: 'farm1', telephone: '222', sexe: 'femme', age: 30, chambre: '2', secteur: 'B', dateEntree: '2024-01-01', statut: 'actif' },
    { id: '3', nom: 'Worker 3', cin: 'AA3', supervisorId: 'sup3', fermeId: 'farm2', telephone: '333', sexe: 'homme', age: 28, chambre: '3', secteur: 'C', dateEntree: '2024-01-01', statut: 'actif' },
    { id: '4', nom: 'Worker 4', cin: 'AA4', supervisorId: 'sup1', fermeId: 'farm2', telephone: '444', sexe: 'femme', age: 35, chambre: '4', secteur: 'D', dateEntree: '2024-01-01', statut: 'actif' },
  ];

  const generateCompanyStats = (workers: Worker[], supervisors: Supervisor[]) => {
    const stats: { [company: string]: { workers: number; activeSupervisors: number; farms: Set<string> } } = {};
    
    // Group workers by supervisor company
    workers.forEach(worker => {
      if (worker.supervisorId) {
        const supervisor = supervisors.find(s => s.id === worker.supervisorId);
        if (supervisor?.company) {
          const company = supervisor.company;
          if (!stats[company]) {
            stats[company] = { workers: 0, activeSupervisors: 0, farms: new Set() };
          }
          stats[company].workers++;
          stats[company].farms.add(worker.fermeId);
        }
      }
    });

    // Count active supervisors per company
    supervisors.filter(s => s.statut === 'actif' && s.company).forEach(supervisor => {
      const company = supervisor.company!;
      if (stats[company]) {
        stats[company].activeSupervisors++;
      } else {
        stats[company] = { workers: 0, activeSupervisors: 1, farms: new Set() };
      }
    });

    return stats;
  };

  it('should calculate correct company statistics', () => {
    const stats = generateCompanyStats(mockWorkers, mockSupervisors);
    
    expect(Object.keys(stats)).toHaveLength(2); // AGRI SUPPORT and AGRI STRATÉGIE
    
    // AGRI SUPPORT should have 3 workers (Worker 1, Worker 3, Worker 4), 2 supervisors, 2 farms
    expect(stats['AGRI SUPPORT']).toEqual({
      workers: 3,
      activeSupervisors: 2,
      farms: new Set(['farm1', 'farm2'])
    });
    
    // AGRI STRATÉGIE should have 1 worker, 1 supervisor, 1 farm
    expect(stats['AGRI STRATÉGIE']).toEqual({
      workers: 1,
      activeSupervisors: 1,
      farms: new Set(['farm1'])
    });
  });

  it('should handle inactive supervisors correctly', () => {
    const stats = generateCompanyStats(mockWorkers, mockSupervisors);
    
    // AGRI TECH should not appear since sup4 is inactive and has no workers
    expect(stats['AGRI TECH']).toBeUndefined();
  });

  it('should handle empty data correctly', () => {
    const stats = generateCompanyStats([], []);
    expect(Object.keys(stats)).toHaveLength(0);
  });

  it('should generate correct table data for PDF', () => {
    const stats = generateCompanyStats(mockWorkers, mockSupervisors);
    
    const tableData = [
      ['interime', 'Ouvriers', 'Superviseurs', 'Fermes']
    ];

    Object.entries(stats)
      .sort(([,a], [,b]) => b.workers - a.workers)
      .forEach(([company, companyStats]) => {
        tableData.push([
          company,
          companyStats.workers.toString(),
          companyStats.activeSupervisors.toString(),
          companyStats.farms.size.toString()
        ]);
      });

    expect(tableData).toEqual([
      ['interime', 'Ouvriers', 'Superviseurs', 'Fermes'],
      ['AGRI SUPPORT', '3', '2', '2'],
      ['AGRI STRATÉGIE', '1', '1', '1']
    ]);
  });
});
