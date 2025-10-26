import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Room } from '@shared/types';

/**
 * Clears listeOccupants from all rooms when all workers are deleted
 * This ensures data consistency when bulk deleting all workers
 */
export const clearAllRoomOccupants = async (): Promise<void> => {
  try {
    console.log('🧹 Clearing all room occupants...');
    
    // Get all rooms
    const roomsSnapshot = await getDocs(collection(db, 'rooms'));
    const rooms = roomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Room[];

    if (rooms.length === 0) {
      console.log('No rooms found to update');
      return;
    }

    const batch = writeBatch(db);
    let updatedRoomsCount = 0;

    // Clear occupants from all rooms
    for (const room of rooms) {
      if (room.listeOccupants && room.listeOccupants.length > 0) {
        const roomRef = doc(db, 'rooms', room.id);
        batch.update(roomRef, {
          listeOccupants: [],
          occupantsActuels: 0,
          updatedAt: new Date()
        });
        updatedRoomsCount++;
        console.log(`  Clearing room ${room.numero} (${room.listeOccupants.length} occupants)`);
      }
    }

    if (updatedRoomsCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully cleared occupants from ${updatedRoomsCount} rooms`);
    } else {
      console.log('No rooms had occupants to clear');
    }

  } catch (error) {
    console.error('❌ Error clearing room occupants:', error);
    throw error;
  }
};

/**
 * Checks if we're deleting all active workers in the system
 */
export const isDeleteAllWorkers = (selectedWorkerIds: Set<string>, allWorkers: any[]): boolean => {
  const activeWorkers = allWorkers.filter(worker => worker.statut === 'actif');

  // If there are no active workers, return false
  if (activeWorkers.length === 0) {
    return false;
  }

  return selectedWorkerIds.size === activeWorkers.length &&
         activeWorkers.every(worker => selectedWorkerIds.has(worker.id));
};
