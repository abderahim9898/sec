import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Supervisor } from '@shared/types';

export const createSampleSupervisors = async () => {
  const sampleSupervisors: Omit<Supervisor, 'id'>[] = [
    {
      nom: 'Ahmed Ben Ali',
      telephone: '0612345678',
      statut: 'actif',
      createdAt: new Date().toISOString()
    },
    {
      nom: 'Fatima Zahra',
      telephone: '0698765432',
      statut: 'actif',
      createdAt: new Date().toISOString()
    },
    {
      nom: 'Mohammed Idrissi',
      telephone: '0655443322',
      statut: 'actif',
      createdAt: new Date().toISOString()
    }
  ];

  try {
    const supervisorsRef = collection(db, 'supervisors');
    
    for (const supervisor of sampleSupervisors) {
      await addDoc(supervisorsRef, supervisor);
      console.log(`Created supervisor: ${supervisor.nom}`);
    }
    
    console.log('✅ Sample supervisors created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating sample supervisors:', error);
    return false;
  }
};
