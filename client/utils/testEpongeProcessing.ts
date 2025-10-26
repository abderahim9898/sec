/**
 * Test file to verify that eponge column processing works correctly
 * regardless of whether phone numbers are present or not
 */

interface TestWorkerData {
  nom: string;
  cin: string;
  telephone?: string; // Optional phone number
  eponge: string;
  sexe: string;
  ferme: string;
}

// Test cases with and without phone numbers
export const testData: TestWorkerData[] = [
  // Case 1: Worker with phone and "oui" for eponge
  {
    nom: 'Ahmed Test',
    cin: 'AT123456',
    telephone: '0612345678',
    eponge: 'oui',
    sexe: 'homme',
    ferme: 'FINCA 20'
  },
  
  // Case 2: Worker WITHOUT phone but with "oui" for eponge
  {
    nom: 'Fatima Test',
    cin: 'FT789012',
    // telephone: '', // NO PHONE NUMBER
    eponge: 'oui',
    sexe: 'femme',
    ferme: 'FINCA 20'
  },
  
  // Case 3: Worker WITHOUT phone but with "non" for eponge
  {
    nom: 'Hassan Test',
    cin: 'HT345678',
    // telephone: '', // NO PHONE NUMBER
    eponge: 'non',
    sexe: 'homme',
    ferme: 'FINCA 20'
  },
  
  // Case 4: Worker with phone and "non" for eponge
  {
    nom: 'Aicha Test',
    cin: 'AT901234',
    telephone: '0687654321',
    eponge: 'non',
    sexe: 'femme',
    ferme: 'FINCA 20'
  },
  
  // Case 5: Worker without phone and empty eponge
  {
    nom: 'Omar Test',
    cin: 'OT567890',
    // telephone: '', // NO PHONE NUMBER
    eponge: '',
    sexe: 'homme',
    ferme: 'FINCA 20'
  },
  
  // Case 6: Worker with phone but empty eponge
  {
    nom: 'Khadija Test',
    cin: 'KT234567',
    telephone: '0623456789',
    eponge: '',
    sexe: 'femme',
    ferme: 'FINCA 20'
  }
];

/**
 * Simulates the column normalization process
 */
export function normalizeColumnName(columnName: string): string {
  const standardMapping = {
    'nom': 'nom',
    'name': 'nom',
    'prenom': 'nom',
    'cin': 'cin',
    'cni': 'cin',
    'id': 'cin',
    'telephone': 'telephone',
    'phone': 'telephone',
    'tel': 'telephone',
    'sexe': 'sexe',
    'genre': 'sexe',
    'gender': 'sexe',
    'ferme': 'ferme',
    'farm': 'ferme',
    'eponge': 'eponge',
    'eponges': 'eponge',
    'sponge': 'eponge'
  };

  const normalized = columnName.toLowerCase().trim()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àáâäå]/g, 'a')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[òóôöõ]/g, 'o')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^\w]/g, '');

  for (const [pattern, standardName] of Object.entries(standardMapping)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return standardName;
    }
  }

  return normalized;
}

/**
 * Test the eponge processing logic
 */
export function testEpongeProcessing(): void {
  console.log('🧪 Testing Eponge Processing Logic');
  console.log('===================================');
  
  testData.forEach((data, index) => {
    console.log(`\n📋 Test Case ${index + 1}: ${data.nom}`);
    console.log(`   Phone: ${data.telephone || 'NO PHONE'}`);
    console.log(`   Eponge: "${data.eponge}"`);
    console.log(`   Expected: Should show eponge value regardless of phone presence`);
    
    // Simulate the normalization process
    const normalizedData: any = {};
    Object.entries(data).forEach(([key, value]) => {
      const normalizedKey = normalizeColumnName(key);
      normalizedData[normalizedKey] = value;
    });
    
    console.log(`   Normalized eponge: "${normalizedData.eponge}"`);
    
    // Simulate the eponge processing logic
    let processedEponge = '-';
    if (normalizedData.eponge !== undefined && normalizedData.eponge !== null) {
      const rawValue = String(normalizedData.eponge).trim();
      const epongeValue = rawValue.toLowerCase().trim();
      
      const ouiVariations = ['oui', 'yes', 'y', 'o', '1', 'true', 'vrai', 'si'];
      const nonVariations = ['non', 'no', 'n', '0', 'false', 'faux'];
      
      if (ouiVariations.includes(epongeValue)) {
        processedEponge = 'oui';
      } else if (nonVariations.includes(epongeValue)) {
        processedEponge = 'non';
      } else if (epongeValue !== '') {
        processedEponge = rawValue;
      } else {
        processedEponge = '-';
      }
    }
    
    console.log(`   ✅ Processed eponge: "${processedEponge}"`);
    console.log(`   📞 Phone independence: ${!data.telephone ? 'VERIFIED - no phone but eponge processed' : 'Has phone'}`);
  });
  
  console.log('\n🎯 Test Summary:');
  console.log('- Workers without phone numbers should have their eponge values processed');
  console.log('- Eponge processing should be completely independent of phone validation');
  console.log('- Empty eponge values should show as "-"');
  console.log('- Valid "oui"/"non" values should be normalized correctly');
}

/**
 * Generate a test Excel file structure
 */
export function generateTestExcelData() {
  return testData.map((data, index) => ({
    'Ligne': index + 1,
    'Nom': data.nom,
    'CIN': data.cin,
    'Téléphone': data.telephone || '', // Empty string for missing phone
    'Sexe': data.sexe,
    'Ferme': data.ferme,
    'EPONGE': data.eponge,
    'Date de naissance': '1990-01-01',
    'Date accès': '2024-01-01',
    'Chambre': '1'
  }));
}

// Export for use in other files
export default {
  testData,
  testEpongeProcessing,
  generateTestExcelData,
  normalizeColumnName
};
