/**
 * Debug script to test eponge processing with and without phone numbers
 */

// Simulate the normalizeColumnName function
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
    'sponge': 'eponge',
    'lit': 'lit',
    'bed': 'lit'
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

// Test data simulating Excel rows
const testRows = [
  // Row with phone and eponge
  {
    'Nom': 'Ahmed Test',
    'CIN': 'AT123456',
    'Téléphone': '0612345678',
    'Sexe': 'homme',
    'Ferme': 'FINCA 20',
    'EPONGE': 'oui',
    'LIT': 'oui'
  },
  // Row WITHOUT phone but WITH eponge
  {
    'Nom': 'Fatima Test',
    'CIN': 'FT789012',
    'Téléphone': '', // EMPTY PHONE
    'Sexe': 'femme', 
    'Ferme': 'FINCA 20',
    'EPONGE': 'oui', // Should still appear
    'LIT': 'non'
  },
  // Row WITHOUT phone AND with "non" eponge
  {
    'Nom': 'Hassan Test',
    'CIN': 'HT345678',
    'Téléphone': undefined, // NO PHONE COLUMN
    'Sexe': 'homme',
    'Ferme': 'FINCA 20', 
    'EPONGE': 'non', // Should still appear
    'LIT': 'oui'
  }
];

/**
 * Simulate the normalization process from WorkerImport
 */
export function simulateNormalization(): void {
  console.log('🧪 Debugging Eponge Processing with Empty Phone Numbers');
  console.log('=====================================================');

  testRows.forEach((row, index) => {
    console.log(`\n📋 Processing Row ${index + 1}: ${row.Nom}`);
    console.log(`   Phone: "${row.Téléphone || 'EMPTY/UNDEFINED'}"`);
    console.log(`   Eponge: "${row.EPONGE}"`);

    // Simulate the normalization process
    const normalizedRow: any = {};
    
    // First, process all columns normally (like in WorkerImport)
    for (const [originalColumn, value] of Object.entries(row)) {
      const normalizedColumn = normalizeColumnName(originalColumn as string);
      normalizedRow[normalizedColumn] = value;

      // Debug EPONGE columns specifically
      if (originalColumn.toLowerCase().includes('eponge') || normalizedColumn === 'eponge') {
        console.log(`   🧽 EPONGE Column mapping: "${originalColumn}" → "${normalizedColumn}" = "${value}"`);
      }
    }

    console.log(`   📊 Normalized eponge: "${normalizedRow.eponge}"`);
    console.log(`    Normalized phone: "${normalizedRow.telephone || 'EMPTY'}"`);

    // Simulate the eponge processing (like in validateWorkerData)
    let processedEponge = '-';
    if (normalizedRow.eponge !== undefined && normalizedRow.eponge !== null) {
      const rawValue = String(normalizedRow.eponge);
      const epongeValue = rawValue.toLowerCase().trim();
      
      const ouiVariations = ['oui', 'yes', 'y', 'o', '1', 'true', 'vrai'];
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
    } else {
      processedEponge = '-';
    }

    console.log(`   ✅ Final eponge: "${processedEponge}"`);
    console.log(`   🔍 Phone independence test: ${!row.Téléphone ? 'PASSED - no phone but eponge processed' : 'Has phone'}`);
    
    // Test if eponge would appear in final result
    const wouldAppearInTable = processedEponge !== '-' && processedEponge !== '';
    console.log(`   🎯 Would appear in table: ${wouldAppearInTable ? 'YES' : 'NO'}`);
  });

  console.log('\n📈 Summary:');
  console.log('- All rows should process eponge regardless of phone number');
  console.log('- Empty phone should not affect eponge processing');
  console.log('- Check if Excel file structure matches expected format');
}

/**
 * Test the fallback logic from WorkerImport
 */
export function testFallbackLogic(): void {
  console.log('\n🔄 Testing Fallback Logic');
  console.log('=========================');

  // Test case where eponge is not found by name but exists in position
  const testRowByPosition = {
    'Col1': 'Ahmed',
    'Col2': 'AT123',
    'Col3': '', // empty phone
    'Col4': 'homme',
    'Col5': 'farm',
    'Col6': 'chamber',
    'Col7': 'sector',
    'Col8': 'date',
    'Col9': 'supervisor',
    'Col10': 'oui', // eponge in position 10 (index 9)
    'Col11': 'non'  // lit in position 11
  };

  console.log('📊 Test row with eponge in position 10:', testRowByPosition);
  
  // Simulate the fallback logic
  const normalizedRow: any = {};
  let epongeFoundByName = false;

  // First pass - normalize columns by name
  for (const [originalColumn, value] of Object.entries(testRowByPosition)) {
    const normalizedColumn = normalizeColumnName(originalColumn as string);
    normalizedRow[normalizedColumn] = value;
    
    if (normalizedColumn === 'eponge') {
      epongeFoundByName = true;
    }
  }

  console.log(`🔍 Eponge found by name: ${epongeFoundByName}`);
  console.log(`📋 Normalized eponge: "${normalizedRow.eponge || 'NOT FOUND'}"`);

  // Test fallback logic (from WorkerImport lines 578-600)
  if (!normalizedRow.eponge && (normalizedRow.eponge !== 'oui' && normalizedRow.eponge !== 'non')) {
    const rowValues = Object.values(testRowByPosition);
    const column10Value = rowValues[9]; // Column 10 is index 9
    
    console.log(`🎯 Fallback - Column 10 value: "${column10Value}"`);
    
    if (column10Value !== undefined && column10Value !== null && String(column10Value).trim() !== '') {
      normalizedRow.eponge = column10Value;
      console.log(`✅ Fallback successful - set eponge to: "${column10Value}"`);
    }
  }

  console.log(`🏁 Final eponge value: "${normalizedRow.eponge}"`);
}

// Export for console testing
export default {
  simulateNormalization,
  testFallbackLogic,
  normalizeColumnName
};
