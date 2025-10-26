import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Room, Worker } from '@shared/types';

/**
 * Synchronizes room occupancy data with actual worker assignments
 * This function corrects any inconsistencies between room.occupantsActuels and actual worker assignments
 */
export async function syncRoomOccupancy(): Promise<void> {
  try {
    console.log('🔄 Starting room occupancy synchronization...');
    
    // Fetch all rooms and workers
    const [roomsSnapshot, workersSnapshot] = await Promise.all([
      getDocs(collection(db, 'rooms')),
      getDocs(collection(db, 'workers'))
    ]);

    const rooms: (Room & { id: string })[] = roomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Room
    }));

    const workers: (Worker & { id: string })[] = workersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Worker
    }));

    // Filter active workers (no exit date or exit date in future)
    const activeWorkers = workers.filter(worker => 
      !worker.dateSortie || new Date(worker.dateSortie) > new Date()
    );

    // Group workers by room
    const workersByRoom = new Map<string, (Worker & { id: string })[]>();
    
    activeWorkers.forEach(worker => {
      if (worker.chambre) {
        const roomKey = `${worker.fermeId}-${worker.chambre}`;
        if (!workersByRoom.has(roomKey)) {
          workersByRoom.set(roomKey, []);
        }
        workersByRoom.get(roomKey)!.push(worker);
      }
    });

    // Create batch for updates
    const batch = writeBatch(db);
    let updatesCount = 0;

    // Check each room and update if necessary
    for (const room of rooms) {
      const roomKey = `${room.fermeId}-${room.numero}`;
      const roomWorkers = workersByRoom.get(roomKey) || [];
      const actualOccupants = roomWorkers.length;
      
      // Validate worker genders match room genre
      const validWorkers = roomWorkers.filter(worker => {
        const workerGender = worker.sexe === 'M' ? 'hommes' : 'femmes';
        const isGenderMatch = workerGender === room.genre;
        
        if (!isGenderMatch) {
          console.warn(`⚠️ Gender mismatch found: Worker ${worker.nom} (${worker.sexe}) in ${room.genre} room ${room.numero}`);
        }
        
        return isGenderMatch;
      });

      const validOccupantIds = validWorkers.map(w => w.id);
      const actualValidOccupants = validWorkers.length;

      // Check if update is needed
      const needsUpdate = 
        room.occupantsActuels !== actualValidOccupants ||
        JSON.stringify(room.listeOccupants?.sort()) !== JSON.stringify(validOccupantIds.sort());

      if (needsUpdate) {
        console.log(`📊 Updating room ${room.numero} (${room.fermeId}): ${room.occupantsActuels} → ${actualValidOccupants} occupants`);
        
        const roomRef = doc(db, 'rooms', room.id);
        batch.update(roomRef, {
          occupantsActuels: actualValidOccupants,
          listeOccupants: validOccupantIds,
          updatedAt: new Date()
        });
        
        updatesCount++;
      }
    }

    // Commit all updates
    if (updatesCount > 0) {
      await batch.commit();
      console.log(`✅ Room occupancy sync completed: ${updatesCount} rooms updated`);
    } else {
      console.log('✅ Room occupancy sync completed: No updates needed');
    }

  } catch (error) {
    console.error('❌ Room occupancy sync failed:', error);
    throw error;
  }
}

/**
 * Quick sync for a specific room
 */
export async function syncSingleRoomOccupancy(roomId: string): Promise<void> {
  try {
    const [roomDoc, workersSnapshot] = await Promise.all([
      getDocs(collection(db, 'rooms').where('__name__', '==', roomId)),
      getDocs(collection(db, 'workers'))
    ]);

    if (roomDoc.docs.length === 0) {
      throw new Error(`Room with ID ${roomId} not found`);
    }

    const room = { id: roomDoc.docs[0].id, ...roomDoc.docs[0].data() as Room };
    const workers = workersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Worker
    }));

    const activeWorkers = workers.filter(worker => 
      !worker.dateSortie || new Date(worker.dateSortie) > new Date()
    );

    const roomWorkers = activeWorkers.filter(worker => 
      worker.chambre === room.numero && worker.fermeId === room.fermeId
    );

    const validWorkers = roomWorkers.filter(worker => {
      const workerGender = worker.sexe === 'M' ? 'hommes' : 'femmes';
      return workerGender === room.genre;
    });

    const actualOccupants = validWorkers.length;
    const validOccupantIds = validWorkers.map(w => w.id);

    if (room.occupantsActuels !== actualOccupants || 
        JSON.stringify(room.listeOccupants?.sort()) !== JSON.stringify(validOccupantIds.sort())) {
      
      const roomRef = doc(db, 'rooms', room.id);
      await updateDoc(roomRef, {
        occupantsActuels: actualOccupants,
        listeOccupants: validOccupantIds,
        updatedAt: new Date()
      });

      console.log(`✅ Room ${room.numero} synced: ${room.occupantsActuels} → ${actualOccupants} occupants`);
    }

  } catch (error) {
    console.error(`❌ Single room sync failed for ${roomId}:`, error);
    throw error;
  }
}
