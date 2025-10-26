import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArticleName } from '@shared/types';

const sampleArticles: Omit<ArticleName, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'EPONGE',
    category: 'Hygiène',
    description: 'Éponge de nettoyage standard',
    defaultUnit: 'pièces',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'LIT',
    category: 'Mobilier',
    description: 'Lit de couchage pour ouvriers',
    defaultUnit: 'pièces',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'EPONGE',
    category: 'Sécurité',
    description: 'Casque de protection individuelle',
    defaultUnit: 'pièces',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'Gants de travail',
    category: 'Sécurité',
    description: 'Gants de protection pour le travail',
    defaultUnit: 'paires',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'Chaussures de sécurité',
    category: 'Sécurité',
    description: 'Chaussures de sécurité avec embout renforcé',
    defaultUnit: 'paires',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'Savon',
    category: 'Hygiène',
    description: 'Savon pour l\'hygiène personnelle',
    defaultUnit: 'pièces',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'Serviette',
    category: 'Hygiène',
    description: 'Serviette de toilette',
    defaultUnit: 'pièces',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'Drap de lit',
    category: 'Literie',
    description: 'Drap pour lit d\'ouvrier',
    defaultUnit: 'pièces',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'Oreiller',
    category: 'Literie',
    description: 'Oreiller pour le repos',
    defaultUnit: 'pièces',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  },
  {
    name: 'Couverture',
    category: 'Literie',
    description: 'Couverture pour le couchage',
    defaultUnit: 'pièces',
    isActive: true,
    createdBy: 'system',
    createdByName: 'Système'
  }
];

export async function createSampleArticles() {
  try {
    const articleNamesRef = collection(db, 'article_names');
    
    const promises = sampleArticles.map(async (article) => {
      return addDoc(articleNamesRef, {
        ...article,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    const results = await Promise.all(promises);
    
    console.log(`✅ Created ${results.length} sample articles successfully`);
    return {
      success: true,
      count: results.length,
      message: `${results.length} articles d'exemple créés avec succès`
    };
  } catch (error) {
    console.error('❌ Error creating sample articles:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Erreur lors de la création des articles d\'exemple'
    };
  }
}
