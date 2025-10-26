import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Migration utility to remove fermeId from existing supervisors
 * This makes all supervisors global across farms
 */
export const migrateSupervisorsToGlobal = async () => {
  try {
    console.log('Starting supervisor migration to global scope...');
    
    const supervisorsRef = collection(db, 'supervisors');
    const snapshot = await getDocs(supervisorsRef);
    
    let migratedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // If the supervisor has a fermeId, remove it
      if (data.fermeId) {
        const supervisorRef = doc(db, 'supervisors', docSnapshot.id);
        
        // Create update object without fermeId and cin
        const updateData = {
          nom: data.nom,
          telephone: data.telephone,
          statut: data.statut,
          createdAt: data.createdAt,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(supervisorRef, updateData);
        migratedCount++;
        
        console.log(`Migrated supervisor: ${data.nom} (removed farm constraint)`);
      }
    }
    
    console.log(`✅ Migration completed! ${migratedCount} supervisors migrated to global scope.`);
    return { success: true, migratedCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
};
