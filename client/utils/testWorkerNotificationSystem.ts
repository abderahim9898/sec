import { Worker, Ferme, User } from '@shared/types';
import { 
  getPreviousFarmId, 
  getFarmAdminIds, 
  getFarmName, 
  hasMultiFarmHistory,
  getMostRecentPreviousFarmAssignment,
  getActiveFarmConflict
} from './workerFarmHistory';

// Test data setup
const testFermes: Ferme[] = [
  {
    id: 'farm1',
    nom: 'Ferme Alpha',
    totalChambres: 10,
    totalOuvriers: 50,
    admins: ['admin1', 'admin2']
  },
  {
    id: 'farm2', 
    nom: 'Ferme Beta',
    totalChambres: 8,
    totalOuvriers: 30,
    admins: ['admin3', 'admin4']
  },
  {
    id: 'farm3',
    nom: 'Ferme Gamma', 
    totalChambres: 12,
    totalOuvriers: 60,
    admins: ['admin5', 'superadmin1'] // Includes a superadmin
  }
];

const testUsers: User[] = [
  {
    uid: 'admin1',
    email: 'admin1@example.com',
    role: 'admin',
    fermeId: 'farm1',
    nom: 'Admin One',
    telephone: '123456789'
  },
  {
    uid: 'admin2', 
    email: 'admin2@example.com',
    role: 'admin',
    fermeId: 'farm1',
    nom: 'Admin Two',
    telephone: '123456788'
  },
  {
    uid: 'admin3',
    email: 'admin3@example.com', 
    role: 'admin',
    fermeId: 'farm2',
    nom: 'Admin Three',
    telephone: '123456787'
  },
  {
    uid: 'superadmin1',
    email: 'superadmin@example.com',
    role: 'superadmin',
    fermeId: 'farm3',
    nom: 'Super Admin',
    telephone: '123456786'
  }
];

const testWorkerWithHistory: Worker = {
  id: 'worker1',
  nom: 'Ahmed Ben Ali',
  cin: 'AB123456',
  fermeId: 'farm1', // Currently in farm1
  telephone: '987654321',
  sexe: 'homme',
  age: 30,
  dateNaissance: '1994-01-15',
  chambre: 'C1',
  secteur: 'S1',
  dateEntree: '2024-01-15',
  statut: 'actif',
  workHistory: [
    {
      id: 'hist1',
      dateEntree: '2023-05-01',
      dateSortie: '2023-10-30',
      motif: 'contract_end',
      chambre: 'C5',
      secteur: 'S2',
      fermeId: 'farm2' // Was previously in farm2
    },
    {
      id: 'hist2', 
      dateEntree: '2022-03-15',
      dateSortie: '2022-08-20',
      motif: 'personal',
      chambre: 'C3',
      secteur: 'S1',
      fermeId: 'farm3' // Even earlier was in farm3
    },
    {
      id: 'hist3',
      dateEntree: '2024-01-15', // Current period
      chambre: 'C1',
      secteur: 'S1', 
      fermeId: 'farm1'
    }
  ],
  returnCount: 2,
  totalWorkDays: 450
};

const testWorkerNewToSystem: Worker = {
  id: 'worker2',
  nom: 'Fatima Khaled',
  cin: 'FK789012', 
  fermeId: 'farm2',
  telephone: '987654322',
  sexe: 'femme',
  age: 25,
  dateNaissance: '1999-03-20',
  chambre: 'C2',
  secteur: 'S1',
  dateEntree: '2024-12-01',
  statut: 'actif',
  workHistory: [{
    id: 'hist_new',
    dateEntree: '2024-12-01',
    chambre: 'C2',
    secteur: 'S1',
    fermeId: 'farm2'
  }],
  returnCount: 0,
  totalWorkDays: 0
};

/**
 * Test the notification system with various scenarios
 */
export function testWorkerNotificationSystem(): void {
  console.log('🧪 Testing Worker Notification System');
  console.log('=====================================');

  // Test 1: Worker with multi-farm history moving to a new farm
  console.log('\n📋 Test 1: Worker with multi-farm history');
  const previousFarmId = getPreviousFarmId(testWorkerWithHistory, 'farm3');
  console.log(`Worker: ${testWorkerWithHistory.nom}`);
  console.log(`Current farm: ${testWorkerWithHistory.fermeId} (${getFarmName(testWorkerWithHistory.fermeId, testFermes)})`);
  console.log(`Moving to: farm3 (${getFarmName('farm3', testFermes)})`);
  console.log(`Previous farm detected: ${previousFarmId} (${previousFarmId ? getFarmName(previousFarmId, testFermes) : 'None'})`);
  console.log(`Should notify admins of: ${previousFarmId ? getFarmName(previousFarmId, testFermes) : 'None'}`);
  
  if (previousFarmId) {
    const adminIds = getFarmAdminIds(previousFarmId, testFermes);
    console.log(`Admins to notify: ${adminIds.join(', ')}`);
    
    // Filter out superadmins
    const validAdmins = adminIds.filter(adminId => {
      const admin = testUsers.find(u => u.uid === adminId);
      return admin?.role !== 'superadmin';
    });
    console.log(`Valid admins (excluding superadmins): ${validAdmins.join(', ')}`);
  }

  // Test 2: New worker (no previous farm)
  console.log('\n📋 Test 2: New worker to system');
  const newWorkerPreviousFarm = getPreviousFarmId(testWorkerNewToSystem);
  console.log(`Worker: ${testWorkerNewToSystem.nom}`);
  console.log(`Previous farm detected: ${newWorkerPreviousFarm || 'None'}`);
  console.log(`Should send notification: ${newWorkerPreviousFarm ? 'Yes' : 'No'}`);

  // Test 3: Most recent previous farm assignment
  console.log('\n📋 Test 3: Most recent previous farm assignment');
  const recentAssignment = getMostRecentPreviousFarmAssignment(testWorkerWithHistory, 'farm3');
  console.log(`Most recent previous assignment:`, recentAssignment);

  // Test 4: Active farm conflict detection
  console.log('\n📋 Test 4: Active farm conflict detection');
  const conflict = getActiveFarmConflict(testWorkerWithHistory, 'farm2');
  console.log(`Active conflict when moving to farm2:`, conflict);

  // Test 5: Multi-farm history check
  console.log('\n📋 Test 5: Multi-farm history check');
  console.log(`Worker has multi-farm history: ${hasMultiFarmHistory(testWorkerWithHistory)}`);
  console.log(`New worker has multi-farm history: ${hasMultiFarmHistory(testWorkerNewToSystem)}`);

  console.log('\n✅ All tests completed!');
}

/**
 * Simulate the complete notification flow
 */
export function simulateNotificationFlow(
  worker: Worker, 
  newFermeId: string, 
  newFermeName: string
): {
  shouldNotify: boolean;
  previousFarmId?: string;
  previousFarmName?: string;
  adminIds?: string[];
  validAdminIds?: string[];
} {
  console.log(`\n🔄 Simulating notification flow for: ${worker.nom}`);
  
  const previousFarmId = getPreviousFarmId(worker, newFermeId);
  
  if (!previousFarmId) {
    console.log('ℹ️ No previous farm found - no notification needed');
    return { shouldNotify: false };
  }

  const previousFarmName = getFarmName(previousFarmId, testFermes);
  const adminIds = getFarmAdminIds(previousFarmId, testFermes);
  
  // Filter out superadmins
  const validAdminIds = adminIds.filter(adminId => {
    const admin = testUsers.find(u => u.uid === adminId);
    return admin?.role !== 'superadmin';
  });

  console.log(`📤 Would send notification to ${validAdminIds.length} admin(s) of ${previousFarmName}`);
  console.log(`📋 Notification details:`);
  console.log(`   Worker: ${worker.nom} (${worker.cin})`);
  console.log(`   From: ${previousFarmName}`);
  console.log(`   To: ${newFermeName}`);
  console.log(`   Valid admin IDs: ${validAdminIds.join(', ')}`);

  return {
    shouldNotify: true,
    previousFarmId,
    previousFarmName,
    adminIds,
    validAdminIds
  };
}

// Export test data for use in other tests
export {
  testFermes,
  testUsers,
  testWorkerWithHistory,
  testWorkerNewToSystem
};
