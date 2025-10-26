import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  Edit,
  Download,
  Users,
  UserCheck,
  UserX
} from 'lucide-react';
import { Worker, Ferme, Room, StockItem, AllocatedItem } from '@shared/types';
import { useSupervisors } from '@/hooks/useSupervisors';
import * as XLSX from 'xlsx';

// Function to calculate age from date of birth
const calculateAgeFromDate = (dateNaissance: string): number => {
  if (!dateNaissance) return 0;
  const birthDate = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

interface ImportedWorker extends Partial<Worker> {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isEditing?: boolean;
  eponge?: string;
  lit?: string;
  placard?: string;
}

interface WorkerImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (workers: Omit<Worker, 'id'>[]) => Promise<void>;
  fermes: Ferme[];
  rooms: Room[];
  userFermeId?: string;
  isSuperAdmin: boolean;
  stockItems: StockItem[];
  existingWorkers: Worker[];
}

export const WorkerImport: React.FC<WorkerImportProps> = ({
  isOpen,
  onClose,
  onImport,
  fermes,
  rooms,
  userFermeId,
  isSuperAdmin,
  stockItems,
  existingWorkers
}) => {
  const { supervisors } = useSupervisors();
  const [importedWorkers, setImportedWorkers] = useState<ImportedWorker[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const [importSummary, setImportSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
  }>({ total: 0, valid: 0, invalid: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columnMappings = {
    // French names
    'nom': ['nom', 'name', 'prénom', 'prenom', 'nom complet', 'full name'],
    'cin': ['cin', 'cni', 'carte identité', 'carte_identite', 'id', 'identity'],
    'matricule': ['matricule', 'employee id', 'employee_id', 'employeeid', 'worker id', 'worker_id', 'mat', 'matricul'],
    'telephone': ['telephone', 'téléphone', 'phone', 'tel', 'mobile', 'gsm'],
    'sexe': ['sexe', 'gender', 'genre', 'sex'],
    'age': ['age', 'âge', 'years', 'ans'], // Keep for backward compatibility
    'dateNaissance': ['date de naissance', 'date_de_naissance', 'datedenaissance', 'date naissance', 'birth date', 'birthday', 'date_naissance'],
    'chambre': ['chambre', 'room', 'numero chambre', 'room number', 'chamber'],
    'ferme': ['ferme', 'farm', 'exploitation', 'site'],
    'superviseur': ['superviseur', 'supervisor', 'chef', 'responsable', 'supervisor name'],
    'dateAcces': ['date accès', 'date_acces', 'dateacces', 'access date', 'date access', 'date d\'accès', 'date dacces'],
    'eponge': ['eponge', 'éponge', 'sponge', 'eponge oui non', 'eponge (oui/non)', 'éponge (oui/non)', 'allocation eponge', 'allocation éponge'],
    'lit': ['lit', 'bed', 'couchage', 'lit oui non', 'lit (oui/non)'],
    'placard': ['placard', 'armoire', 'wardrobe', 'placard (oui/non)']
  };

  const normalizeColumnName = (columnName: string): string => {
    const normalized = columnName.toLowerCase().trim().replace(/[^\w]/g, '');

    console.log(`🔍 Normalizing column "${columnName}" → "${normalized}"`);

    // Find matching column
    for (const [standardName, variations] of Object.entries(columnMappings)) {
      const isMatch = variations.some(variation => {
        const cleanVariation = variation.replace(/[^\w]/g, '');
        const match1 = normalized.includes(cleanVariation);
        const match2 = cleanVariation.includes(normalized);
        const exactMatch = normalized === cleanVariation;

        if (standardName === 'eponge' && (match1 || match2 || exactMatch)) {
          console.log(`🧽 EPONGE match found: "${columnName}" matches variation "${variation}" (${exactMatch ? 'exact' : match1 ? 'contains' : 'partial'})`);
        }

        return exactMatch || match1 || match2;
      });

      if (isMatch) {
        console.log(`✅ Column "${columnName}" mapped to "${standardName}"`);
        return standardName;
      }
    }

    console.log(`❓ Column "${columnName}" not mapped, using normalized "${normalized}"`);
    return normalized;
  };

  const validateWorkerData = (data: any, rowIndex: number): ImportedWorker => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const worker: Partial<Worker> & { eponge?: string; lit?: string; placard?: string } = {};

    console.log(`🔍 Validating row ${rowIndex}:`, data);
    console.log(`📋 Row ${rowIndex} keys:`, Object.keys(data));
    console.log(`🧽 Row ${rowIndex} eponge value:`, data.eponge);
    console.log(` Row ${rowIndex} lit value:`, data.lit);

    // Validate required fields - handle different data types
    const nom = data.nom ? String(data.nom).trim() : '';
    if (!nom || nom === '') {
      errors.push('Nom requis');
    } else {
      worker.nom = nom;
    }

    const cin = data.cin ? String(data.cin).trim() : '';
    if (!cin || cin === '') {
      errors.push('CIN requis');
    } else {
      worker.cin = cin;
    }

    // Matricule (optional)
    const matricule = data.matricule ? String(data.matricule).trim() : '';
    if (matricule) {
      worker.matricule = matricule;
    }

    // Validate gender
    const sexeRaw = data.sexe ? String(data.sexe).toLowerCase().trim() : '';
    const maleVariations = ['homme', 'h', 'm', 'male', 'masculin', '1', 'man'];
    const femaleVariations = ['femme', 'f', 'female', 'féminin', 'feminin', '2', 'woman'];

    if (!sexeRaw || (!maleVariations.includes(sexeRaw) && !femaleVariations.includes(sexeRaw))) {
      errors.push('Sexe invalide (homme/femme)');
      console.log(`❌ Invalid gender: "${sexeRaw}" for row ${rowIndex}`);
    } else {
      worker.sexe = maleVariations.includes(sexeRaw) ? 'homme' : 'femme';
    }

    // Validate age - prioritize date of birth if available
    let age: number;

    if (data.dateNaissance) {
      // Use date of birth if available
      const dateNaissance = String(data.dateNaissance).trim();
      const birthDate = new Date(dateNaissance);

      if (isNaN(birthDate.getTime())) {
        errors.push('Date de naissance invalide (format: YYYY-MM-DD)');
        console.log(`❌ Invalid birth date: "${dateNaissance}" for row ${rowIndex}`);
        age = NaN;
      } else {
        age = calculateAgeFromDate(dateNaissance);
        worker.dateNaissance = dateNaissance;
        worker.yearOfBirth = birthDate.getFullYear();
      }
    } else if (data.age) {
      // Fallback to age field
      if (typeof data.age === 'number') {
        age = data.age;
      } else {
        age = parseInt(String(data.age).replace(/[^\d]/g, ''));
      }

      if (!isNaN(age)) {
        worker.yearOfBirth = new Date().getFullYear() - age;
      }
    } else {
      age = NaN;
    }

    if (isNaN(age) || age < 16 || age > 70) {
      errors.push('Âge invalide (16-70) - vérifiez la date de naissance ou l\'âge');
      console.log(`❌ Invalid age: "${data.age || data.dateNaissance}" -> ${age} for row ${rowIndex}`);
    } else {
      worker.age = age;
    }

    // Validate phone (optional)
    const telephone = data.telephone ? String(data.telephone).trim() : '';
    if (telephone) {
      // Clean the phone number and validate
      const cleanPhone = telephone.replace(/[^\d+]/g, '');
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        errors.push('Format téléphone invalide');
      } else {
        worker.telephone = telephone;
      }
    } else {
      worker.telephone = '';
    }

    // Validate ferme
    const fermeName = data.ferme ? String(data.ferme).trim() : '';
    if (!fermeName) {
      if (!userFermeId) {
        errors.push('Ferme requise');
      } else {
        worker.fermeId = userFermeId;
      }
    } else {
      const ferme = fermes.find(f =>
        f.nom.toLowerCase() === fermeName.toLowerCase() ||
        f.id === fermeName
      );
      if (!ferme) {
        errors.push(`Ferme "${fermeName}" non trouvée`);
      } else {
        // For non-superadmin users, validate they can only import to their own farm
        if (!isSuperAdmin && userFermeId && ferme.id !== userFermeId) {
          const userFarmName = fermes.find(f => f.id === userFermeId)?.nom || 'votre ferme';
          errors.push(`⚠️ Accès refusé: Vous ne pouvez importer que vers ${userFarmName}. Ligne contient: ${ferme.nom}`);
        } else {
          worker.fermeId = ferme.id;
        }
      }
    }

    // Validate access date (optional)
    if (data.dateAcces) {
      const dateAccessStr = String(data.dateAcces).trim();

      // Try to parse different date formats
      let parsedDate: Date | null = null;

      // Check if it's already a valid Date object (from Excel)
      if (data.dateAcces instanceof Date) {
        parsedDate = data.dateAcces;
      } else {
        // Try different date formats
        const dateFormats = [
          dateAccessStr, // As is
          dateAccessStr.replace(/[\/\\]/g, '-'), // Replace / or \ with -
          dateAccessStr.replace(/(\d{1,2})[\/\\-](\d{1,2})[\/\\-](\d{4})/, '$3-$2-$1'), // DD/MM/YYYY to YYYY-MM-DD
          dateAccessStr.replace(/(\d{1,2})[\/\\-](\d{1,2})[\/\\-](\d{2})/, '20$3-$2-$1') // DD/MM/YY to YYYY-MM-DD
        ];

        for (const format of dateFormats) {
          const testDate = new Date(format);
          if (!isNaN(testDate.getTime())) {
            parsedDate = testDate;
            break;
          }
        }
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        // Format as YYYY-MM-DD
        worker.dateEntree = parsedDate.toISOString().split('T')[0];
        console.log(`✅ Access date parsed for row ${rowIndex}: ${dateAccessStr} → ${worker.dateEntree}`);
      } else {
        warnings.push(`Format de date d'accès invalide: "${dateAccessStr}" - ignoré`);
        console.log(`⚠️ Invalid access date format for row ${rowIndex}: "${dateAccessStr}"`);
      }
    }

    // Validate chamber (optional)
    if (data.chambre && worker.fermeId && worker.sexe) {
      const chambreNum = String(data.chambre).trim();
      const workerGenderType = worker.sexe === 'homme' ? 'hommes' : 'femmes';

      // First, try to find a room that matches number, ferme, AND gender
      const compatibleRoom = rooms.find(r =>
        r.numero === chambreNum &&
        r.fermeId === worker.fermeId &&
        r.genre === workerGenderType
      );

      if (compatibleRoom) {
        // Perfect match - assign the room
        worker.chambre = chambreNum;
        worker.secteur = worker.sexe === 'homme' ? 'Secteur Hommes' : 'Secteur Femmes';
        console.log(`✅ Perfect room match for row ${rowIndex}: ${worker.sexe} → room ${chambreNum} (${workerGenderType})`);
      } else {
        // Check if room exists but with wrong gender
        const existingRoom = rooms.find(r =>
          r.numero === chambreNum &&
          r.fermeId === worker.fermeId
        );

        if (existingRoom) {
          // Room exists but wrong gender - add warning and clear assignment
          console.log(`⚠️ Gender mismatch for row ${rowIndex}: ${worker.sexe} cannot be assigned to ${existingRoom.genre} room ${chambreNum}. Room assignment cleared.`);
          worker.chambre = '';
          worker.secteur = '';
          warnings.push(`Chambre "${chambreNum}" existe mais est pour ${existingRoom.genre}, pas pour ${workerGenderType} - assignation supprimée`);
        } else {
          // Room doesn't exist at all
          worker.chambre = '';
          worker.secteur = '';
          warnings.push(`Chambre "${chambreNum}" non trouvée dans cette ferme - assignation supprimée`);
        }
      }
    } else {
      worker.chambre = '';
      worker.secteur = '';
    }

    // Validate supervisor (optional)
    if (data.superviseur) {
      const superviseurName = String(data.superviseur).trim();
      const foundSupervisor = supervisors?.find(s =>
        s.nom.toLowerCase().includes(superviseurName.toLowerCase()) ||
        superviseurName.toLowerCase().includes(s.nom.toLowerCase())
      );

      if (foundSupervisor) {
        worker.supervisorId = foundSupervisor.id;
        console.log(`✅ Supervisor matched for row ${rowIndex}: "${superviseurName}" → ${foundSupervisor.nom}`);
      } else {
        worker.supervisorId = '';
        warnings.push(`Superviseur "${superviseurName}" non trouvé - ignoré`);
        console.log(`⚠️ Supervisor not found for row ${rowIndex}: "${superviseurName}"`);
      }
    } else {
      worker.supervisorId = '';
    }

    // Validate EPONGE, LIT and PLACARD allocation
    const allocatedItems: Omit<AllocatedItem, 'id'>[] = [];

    // Process EPONGE - using same logic as LIT
    if (data.eponge !== undefined && data.eponge !== null) {
      const rawValue = String(data.eponge);
      const epongeValue = rawValue.toLowerCase().trim();
      console.log(` Processing EPONGE for row ${rowIndex}: raw="${rawValue}", processed="${epongeValue}"`);

      const ouiVariations = ['oui', 'yes', 'y', 'o', '1', 'true', 'vrai'];
      const nonVariations = ['non', 'no', 'n', '0', 'false', 'faux'];

      // Store the processed value for display
      if (ouiVariations.includes(epongeValue)) {
        worker.eponge = 'oui';
        console.log(` EPONGE set to "oui" for ${worker.nom || 'worker'}`);

        // Check stock availability for EPONGE on this farm
        const epongeStock = stockItems.find(s =>
          s.item.toLowerCase() === 'eponge' &&
          s.secteurId === worker.fermeId
        );

        if (!epongeStock || epongeStock.quantity <= 0) {
          errors.push('Stock EPONGE insuffisant sur cette ferme');
        } else {
          allocatedItems.push({
            itemName: 'EPONGE',
            allocatedAt: new Date().toISOString(),
            allocatedBy: 'import-system',
            stockItemId: epongeStock.id,
            fermeId: worker.fermeId!,
            status: 'allocated'
          });
        }
      } else if (nonVariations.includes(epongeValue)) {
        worker.eponge = 'non';
        console.log(`✅ EPONGE set to "non" for ${worker.nom || 'worker'}`);
      } else if (epongeValue !== '') {
        worker.eponge = rawValue; // Keep original value for debugging
        console.log(`⚠️ EPONGE invalid value: "${rawValue}" for ${worker.nom || 'worker'}`);
        warnings.push(`Valeur EPONGE invalide: "${rawValue}" - doit être "oui" ou "non"`);
      } else {
        console.log(`➖ EPONGE empty for ${worker.nom || 'worker'}`);
        worker.eponge = '-'; // Set placeholder for empty values
      }
    } else {
      console.log(`❓ EPONGE not found in data for row ${rowIndex}`);
      worker.eponge = '-'; // Set placeholder when column not found

      // Fallback: check if any other column might contain EPONGE data
      const possibleEpongeColumns = Object.keys(data).filter(key =>
        key.toLowerCase().includes('eponge') ||
        key.toLowerCase().includes('éponge') ||
        key.toLowerCase().includes('sponge')
      );

      if (possibleEpongeColumns.length > 0) {
        console.log(`🔍 Found possible EPONGE columns: ${possibleEpongeColumns.join(', ')}`);
        for (const col of possibleEpongeColumns) {
          console.log(`🧽 Checking column "${col}": "${data[col]}"`);
        }
      }
    }


    // Process LIT and preserve raw value
    if (data.lit !== undefined && data.lit !== null) {
      const rawValue = String(data.lit);
      const litValue = rawValue.toLowerCase().trim();
      console.log(`🛏️ Processing LIT for row ${rowIndex}: raw="${rawValue}", processed="${litValue}"`);

      const ouiVariations = ['oui', 'yes', 'y', 'o', '1', 'true', 'vrai'];
      const nonVariations = ['non', 'no', 'n', '0', 'false', 'faux'];

      // Store the processed value for display
      if (ouiVariations.includes(litValue)) {
        worker.lit = 'oui';
        console.log(`✅ LIT set to "oui" for ${worker.nom || 'worker'}`);

        // Check stock availability for LIT on this farm
        const litStock = stockItems.find(s =>
          s.item.toLowerCase() === 'lit' &&
          s.secteurId === worker.fermeId
        );

        if (!litStock || litStock.quantity <= 0) {
          errors.push('Stock LIT insuffisant sur cette ferme');
        } else {
          allocatedItems.push({
            itemName: 'LIT',
            allocatedAt: new Date().toISOString(),
            allocatedBy: 'import-system',
            stockItemId: litStock.id,
            fermeId: worker.fermeId!,
            status: 'allocated'
          });
        }
      } else if (nonVariations.includes(litValue)) {
        worker.lit = 'non';
        console.log(`✅ LIT set to "non" for ${worker.nom || 'worker'}`);
      } else if (litValue !== '') {
        worker.lit = rawValue; // Keep original value for debugging
        console.log(`⚠️ LIT invalid value: "${rawValue}" for ${worker.nom || 'worker'}`);
        warnings.push(`Valeur LIT invalide: "${rawValue}" - doit être "oui" ou "non"`);
      } else {
        console.log(`➖ LIT empty for ${worker.nom || 'worker'}`);
        worker.lit = '-'; // Set placeholder for empty values
      }
    } else {
      console.log(`❓ LIT not found in data for row ${rowIndex}`);
      worker.lit = '-'; // Set placeholder when column not found
    }

    // Process PLACARD and preserve raw value
    if (data.placard !== undefined && data.placard !== null) {
      const rawValue = String(data.placard);
      const placardValue = rawValue.toLowerCase().trim();
      console.log(`🧳 Processing PLACARD for row ${rowIndex}: raw="${rawValue}", processed="${placardValue}"`);

      const ouiVariations = ['oui', 'yes', 'y', 'o', '1', 'true', 'vrai'];
      const nonVariations = ['non', 'no', 'n', '0', 'false', 'faux'];

      if (ouiVariations.includes(placardValue)) {
        worker.placard = 'oui';
        const placardStock = stockItems.find(s =>
          s.item.toLowerCase() === 'placard' &&
          s.secteurId === worker.fermeId
        );
        if (!placardStock || placardStock.quantity <= 0) {
          errors.push('Stock PLACARD insuffisant sur cette ferme');
        } else {
          allocatedItems.push({
            itemName: 'PLACARD',
            allocatedAt: new Date().toISOString(),
            allocatedBy: 'import-system',
            stockItemId: placardStock.id,
            fermeId: worker.fermeId!,
            status: 'allocated'
          });
        }
      } else if (nonVariations.includes(placardValue)) {
        worker.placard = 'non';
      } else if (placardValue !== '') {
        worker.placard = rawValue;
        warnings.push(`Valeur PLACARD invalide: "${rawValue}" - doit être "oui" ou "non"`);
      } else {
        worker.placard = '-';
      }
    } else {
      worker.placard = '-';
    }

    // Add allocated items to worker - always initialize as array
    worker.allocatedItems = allocatedItems as any;

    // Check for duplicate workers (by CIN)
    if (worker.cin) {
      const duplicateWorker = existingWorkers.find(existingWorker =>
        existingWorker.cin.toLowerCase() === worker.cin.toLowerCase()
      );

      if (duplicateWorker) {
        errors.push(`Travailleur avec CIN ${worker.cin} existe déjà: ${duplicateWorker.nom} (${duplicateWorker.statut === 'actif' ? 'actif' : 'inactif'})`);
        console.log(`❌ Duplicate worker found: ${worker.cin} (${duplicateWorker.nom})`);
      }
    }

    // Set default values
    worker.statut = 'actif';

    // Only set today's date if no date was parsed from Excel
    if (!worker.dateEntree) {
      worker.dateEntree = new Date().toISOString().split('T')[0];
    }

    // Debug final worker state
    console.log(`🏁 Final worker state for row ${rowIndex}:`, {
      nom: worker.nom,
      eponge: worker.eponge,
      lit: worker.lit,
      placard: worker.placard,
      hasEpongeProperty: 'eponge' in worker,
      hasLitProperty: 'lit' in worker,
      hasPlacardProperty: 'placard' in worker
    });

    const result = {
      ...worker,
      rowIndex,
      isValid: errors.length === 0,
      errors,
      warnings
    };

    // Final verification
    console.log(`🔍 Final result for ${worker.nom}:`, {
      eponge: result.eponge,
      originalEponge: data.eponge,
      hasEponge: 'eponge' in result,
      epongeType: typeof result.eponge,
      epongeStringified: JSON.stringify(result.eponge),
      lit: result.lit,
      originalLit: data.lit,
      hasLit: 'lit' in result,
      placard: (result as any).placard,
      originalPlacard: (data as any).placard,
      hasPlacard: 'placard' in (result as any)
    });

    return result;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert('Le fichier Excel est vide ou ne contient pas de données valides.');
        return;
      }

      console.log('📊 Raw Excel data (first row):', jsonData[0]);
      console.log('📊 Available columns:', Object.keys(jsonData[0] || {}));

      // Check specifically for EPONGE columns
      const columns = Object.keys(jsonData[0] || {});
      const epongeColumns = columns.filter(col =>
        col.toLowerCase().includes('eponge') ||
        col.toLowerCase().includes('éponge') ||
        col.toLowerCase().includes('sponge')
      );
      console.log('🧽 EPONGE-related columns found:', epongeColumns);

      // Show normalized column mappings
      columns.forEach(col => {
        const normalized = normalizeColumnName(col);
        if (normalized === 'eponge' || col.toLowerCase().includes('eponge')) {
          console.log(`🧽 Column "${col}" normalizes to "${normalized}"`);
        }
      });

      // Normalize the data with column mapping
      const normalizedData = jsonData.map((row: any, index: number) => {
        const normalizedRow: any = {};

        // First, process all columns normally
        for (const [originalColumn, value] of Object.entries(row)) {
          const normalizedColumn = normalizeColumnName(originalColumn as string);
          normalizedRow[normalizedColumn] = value;

          // Debug EPONGE and LIT columns specifically
          if (originalColumn.toLowerCase().includes('eponge') || normalizedColumn === 'eponge') {
            console.log(`🧽 EPONGE Column mapping row ${index + 1}: "${originalColumn}" → "${normalizedColumn}" = "${value}"`);
            console.log(`🧽 EPONGE Raw column check: original="${originalColumn}", normalized="${normalizedColumn}", value="${value}"`);
          }
          if (originalColumn.toLowerCase().includes('lit') || normalizedColumn === 'lit') {
            console.log(`🛏️ LIT Column mapping row ${index + 1}: "${originalColumn}" → "${normalizedColumn}" = "${value}"`);
          }
          // Debug PHONE column to see if empty phones affect processing
          if (originalColumn.toLowerCase().includes('tel') || originalColumn.toLowerCase().includes('phone') || normalizedColumn === 'telephone') {
            console.log(`📞 PHONE Column mapping row ${index + 1}: "${originalColumn}" → "${normalizedColumn}" = "${value || 'EMPTY'}"`);
          }
        }

        // Debug the entire row to see structure
        console.log(`📊 Row ${index + 1} structure:`, {
          originalKeys: Object.keys(row),
          normalizedKeys: Object.keys(normalizedRow),
          hasPhone: !!normalizedRow.telephone,
          phoneValue: normalizedRow.telephone || 'EMPTY',
          hasEponge: !!normalizedRow.eponge,
          epongeValue: normalizedRow.eponge || 'EMPTY'
        });

        // Enhanced EPONGE processing - ensure it's always detected
        console.log(`🔍 EPONGE Detection for row ${index + 1}:`, {
          foundByNormalMapping: normalizedRow.eponge !== undefined && normalizedRow.eponge !== null,
          normalizedValue: normalizedRow.eponge,
          allColumns: Object.keys(row),
          allValues: Object.values(row)
        });

        // If eponge wasn't found through normal mapping, try multiple fallback methods
        if (normalizedRow.eponge === undefined || normalizedRow.eponge === null || normalizedRow.eponge === '') {
          console.log(`🔄 EPONGE not found by name for row ${index + 1}, trying fallbacks...`);

          // Method 1: Try column position (assuming eponge is in column 10)
          const rowValues = Object.values(row);
          const column10Value = rowValues[10]; // Column 10 is index 9 (0-based)

          console.log(`🧽 FALLBACK Method 1 - Column 10 (index 9):`, {
            value: column10Value,
            type: typeof column10Value,
            isEmpty: !column10Value,
            stringified: JSON.stringify(column10Value)
          });

          if (column10Value !== undefined && column10Value !== null && String(column10Value).trim() !== '') {
            normalizedRow.eponge = column10Value;
            console.log(`✅ FALLBACK SUCCESS: Set eponge from column 10 for row ${index + 1}:`, column10Value);
          } else {
            // Method 2: Search for any column that might contain eponge data
            console.log(`🔍 FALLBACK Method 2 - Searching all columns for eponge-like values...`);

            for (const [colName, colValue] of Object.entries(row)) {
              if (colValue && String(colValue).toLowerCase().trim() === 'oui' || String(colValue).toLowerCase().trim() === 'non') {
                console.log(`🎯 Found potential eponge value in column "${colName}": "${colValue}"`);
                // Only use if this looks like it could be eponge
                if (colName.toLowerCase().includes('eponge') ||
                    colName.toLowerCase().includes('sponge') ||
                    Object.keys(row).indexOf(colName) >= 8) { // Likely in eponge position
                  normalizedRow.eponge = colValue;
                  console.log(`✅ FALLBACK SUCCESS: Set eponge from column "${colName}" for row ${index + 1}:`, colValue);
                  break;
                }
              }
            }
          }
        } else {
          console.log(`✅ EPONGE found through normal column mapping for row ${index + 1}:`, normalizedRow.eponge);
        }

        return normalizedRow;
      });

      console.log('📊 Normalized data (first row):', normalizedData[0]);
      console.log('📊 Normalized columns:', Object.keys(normalizedData[0] || {}));

      // Validate and process each row
      const processedWorkers = normalizedData.map((row, index) =>
        validateWorkerData(row, index + 1)
      );

      setImportedWorkers(processedWorkers);

      // Calculate summary
      const summary = {
        total: processedWorkers.length,
        valid: processedWorkers.filter(w => w.isValid).length,
        invalid: processedWorkers.filter(w => !w.isValid).length
      };
      setImportSummary(summary);

      setStep('preview');
      console.log('✅ Import preview ready:', summary);

    } catch (error) {
      console.error('❌ Error reading Excel file:', error);
      alert('Erreur lors de la lecture du fichier Excel. Vérifiez que le format est correct.');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateWorker = (index: number, field: keyof Worker, value: any) => {
    setImportedWorkers(prev => {
      const updated = [...prev];
      const worker = { ...updated[index] };
      
      // Update the field
      (worker as any)[field] = value;
      
      // Recalculate dependent fields
      if (field === 'sexe' && worker.chambre && worker.fermeId) {
        // Revalidate chamber
        const room = rooms.find(r => 
          r.numero === worker.chambre && 
          r.fermeId === worker.fermeId &&
          ((value === 'homme' && r.genre === 'hommes') ||
           (value === 'femme' && r.genre === 'femmes'))
        );
        
        if (!room) {
          worker.chambre = '';
          worker.secteur = '';
        } else {
          worker.secteur = value === 'homme' ? 'Secteur Hommes' : 'Secteur Femmes';
        }
      }
      
      if (field === 'age') {
        worker.yearOfBirth = new Date().getFullYear() - value;
      }

      // Revalidate the worker
      const validated = validateWorkerData(worker, worker.rowIndex);
      updated[index] = { ...validated, isEditing: worker.isEditing };
      
      return updated;
    });
  };

  const toggleEdit = (index: number) => {
    setImportedWorkers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isEditing: !updated[index].isEditing };
      return updated;
    });
  };

  const handleConfirmImport = async () => {
    const validWorkers = importedWorkers.filter(w => w.isValid);
    
    if (validWorkers.length === 0) {
      alert('Aucun ouvrier valide à importer.');
      return;
    }

    setIsProcessing(true);
    try {
      // Convert to proper Worker format (without id and metadata)
      const workersToImport = validWorkers.map(w => {
        const { rowIndex, isValid, errors, warnings, isEditing, ...worker } = w;
        return worker as Omit<Worker, 'id'>;
      });

      await onImport(workersToImport);
      setStep('confirm');
      
      // Reset after a delay
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('❌ Import failed:', error);
      alert('Erreur lors de l\'importation. Veuillez réessayer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setImportedWorkers([]);
    setStep('upload');
    setImportSummary({ total: 0, valid: 0, invalid: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const downloadTemplate = () => {
    const template = [
      {
        matricule: '32164',
        nom: 'Ahmed Fatmi',
        cin: 'AA123456',
        telephone: '0612345678',
        sexe: 'homme',
        'date de naissance': '1999-03-15',
        'date accès': '2024-01-15',
        chambre: '2',
        ferme: 'FINCA 20',
        superviseur: 'LAHCEN ACHLOU (AGRI STRATÉGIE)',
        eponge: 'oui',
        lit: 'oui',
        placard: 'oui'
      },
      {
        matricule: '64058',
        nom: 'Fatima AZIZ',
        cin: 'FB789012',
        telephone: '0687654321',
        sexe: 'femme',
        'date de naissance': '1994-07-22',
        'date accès': '2024-01-20',
        chambre: '5',
        ferme: 'FINCA 13',
        superviseur: 'ABDELLILAH  (AGRI SUPPORT)',
        eponge: 'non',
        lit: 'oui',
        placard: 'non'
      },
      {
        matricule: '701',
        nom: 'ABDELAZIZ REBANI',
        cin: 'TC999999',
        telephone: '0699999999',
        sexe: 'homme',
        'date de naissance': '1995-12-01',
        'date accès': '2024-02-01',
        chambre: '10',
        ferme: 'FINCA 20',
        superviseur: 'LAHCEN ACHLOU (AGRI STRATÉGIE)',
        eponge: 'oui',
        lit: 'oui',
        placard: 'non'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modèle Ouvriers');
    XLSX.writeFile(workbook, 'modele_import_ouvriers.xlsx');
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium">Importer des ouvriers</h3>
        <p className="text-gray-600">
          Téléchargez un fichier Excel avec les données des ouvriers
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Fichier Excel</Label>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formats acceptés: .xlsx, .xls
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Colonnes requises:</strong> nom, cin, sexe, (age OU date de naissance)<br />
            <strong>Colonnes optionnelles:</strong> telephone, date accès, chambre, ferme, superviseur<br />
            <strong>Note:</strong> Utilisez "date de naissance" (format YYYY-MM-DD) pour plus de précision que "age"<br />
            <strong>Formats acceptés pour sexe:</strong> homme/femme, h/f, m/f, male/female<br />
            <strong>Format âge:</strong> nombre entre 16 et 70<br />
            <strong>Format date d'accès:</strong> YYYY-MM-DD, DD/MM/YYYY, ou DD-MM-YYYY<br />
            <strong>Format superviseur:</strong> nom du superviseur (optionnel)<br />
            <strong>EPONGE/LIT:</strong> "oui" ou "non" - allocation automatique selon le stock disponible<br />
            <strong>⚠️ Important:</strong> Les chambres doivent correspondre au genre (hommes → chambres hommes, femmes → chambres femmes)<br />
            <strong>⚠️ Stock:</strong> Si le stock EPONGE ou LIT est insuffisant, une erreur sera affichée<br />
            <strong>🚫 Doublons:</strong> Les ouvriers avec un CIN déjà existant dans la base de données seront rejetés automatiquement
            <br />
            <Button
              variant="link"
              onClick={downloadTemplate}
              className="p-0 h-auto text-blue-600"
            >
              <Download className="h-4 w-4 mr-1" />
              Télécharger le modèle Excel
            </Button>
          </AlertDescription>
        </Alert>
      </div>

      {isProcessing && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Traitement du fichier...</p>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{importSummary.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valides</p>
                <p className="text-2xl font-bold text-green-600">{importSummary.valid}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Erreurs</p>
                <p className="text-2xl font-bold text-red-600">{importSummary.invalid}</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg max-h-96 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Ligne</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>CIN</TableHead>
              <TableHead>Sexe</TableHead>
              <TableHead>Âge / Date naissance</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Superviseur</TableHead>
              <TableHead>Date d'accès</TableHead>
              <TableHead>Ferme</TableHead>
              <TableHead>Chambre</TableHead>
              <TableHead>EPONGE</TableHead>
              <TableHead>LIT</TableHead>
              <TableHead>PLACARD</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {importedWorkers.map((worker, index) => (
              <TableRow key={index} className={
                !worker.isValid ? 'bg-red-50' :
                (worker.warnings && worker.warnings.length > 0) ? 'bg-yellow-50' :
                ''
              }>
                <TableCell>{worker.rowIndex}</TableCell>
                <TableCell>
                  {worker.isValid ? (
                    worker.warnings && worker.warnings.length > 0 ? (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Avertissement
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Valide
                      </Badge>
                    )
                  ) : (
                    <Badge className="bg-red-100 text-red-800">
                      <X className="h-3 w-3 mr-1" />
                      Erreur
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {worker.isEditing ? (
                    <Input
                      value={worker.matricule || ''}
                      onChange={(e) => updateWorker(index, 'matricule', e.target.value)}
                      className="w-24"
                      placeholder="MAT001"
                    />
                  ) : (
                    worker.matricule || '-'
                  )}
                </TableCell>
                <TableCell>
                  {worker.isEditing ? (
                    <Input
                      value={worker.nom || ''}
                      onChange={(e) => updateWorker(index, 'nom', e.target.value)}
                      className="w-32"
                    />
                  ) : (
                    worker.nom || '-'
                  )}
                </TableCell>
                <TableCell>
                  {worker.isEditing ? (
                    <Input
                      value={worker.cin || ''}
                      onChange={(e) => updateWorker(index, 'cin', e.target.value)}
                      className="w-24"
                    />
                  ) : (
                    worker.cin || '-'
                  )}
                </TableCell>
                <TableCell>
                  {worker.isEditing ? (
                    <Select
                      value={worker.sexe || ''}
                      onValueChange={(value: 'homme' | 'femme') => updateWorker(index, 'sexe', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homme">Homme</SelectItem>
                        <SelectItem value="femme">Femme</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    worker.sexe || '-'
                  )}
                </TableCell>
                <TableCell>
                  {worker.isEditing ? (
                    <Input
                      type="number"
                      value={worker.age || ''}
                      onChange={(e) => updateWorker(index, 'age', parseInt(e.target.value))}
                      className="w-16"
                      min="16"
                      max="70"
                    />
                  ) : (
                    <div>
                      <div>{worker.age || '-'} ans</div>
                      {worker.dateNaissance && (
                        <div className="text-xs text-gray-500">
                          {new Date(worker.dateNaissance).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>{worker.telephone || '-'}</TableCell>
                <TableCell>
                  {worker.supervisorId ? (() => {
                    const supervisor = supervisors?.find(s => s.id === worker.supervisorId);
                    if (supervisor) {
                      return supervisor.company
                        ? `${supervisor.nom} (${supervisor.company})`
                        : supervisor.nom;
                    }
                    return worker.supervisorId;
                  })() : '-'}
                </TableCell>
                <TableCell>
                  {worker.isEditing ? (
                    <Input
                      type="date"
                      value={worker.dateEntree || ''}
                      onChange={(e) => updateWorker(index, 'dateEntree', e.target.value)}
                      className="w-32"
                    />
                  ) : (
                    worker.dateEntree || '-'
                  )}
                </TableCell>
                <TableCell>
                  {worker.fermeId ?
                    fermes.find(f => f.id === worker.fermeId)?.nom || worker.fermeId :
                    '-'
                  }
                </TableCell>
                <TableCell>{worker.chambre || '-'}</TableCell>
                <TableCell>
  {worker.eponge === 'oui' ? (
    <Badge className="bg-green-100 text-green-800">Oui</Badge>
  ) : worker.eponge === 'non' ? (
    <Badge variant="outline">Non</Badge>
  ) : worker.eponge === '-' ? (
    <Badge variant="outline">-</Badge>
  ) : worker.eponge ? (
    <Badge variant="destructive">{worker.eponge}</Badge>
  ) : (
    <Badge variant="outline">-</Badge>
  )}
</TableCell>

                <TableCell>
                  {worker.lit === 'oui' ? (
                    <Badge className="bg-green-100 text-green-800">Oui</Badge>
                  ) : worker.lit === 'non' ? (
                    <Badge variant="outline">Non</Badge>
                  ) : worker.lit ? (
                    <Badge variant="destructive">{worker.lit}</Badge>
                  ) : (
                    <Badge variant="outline">-</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {worker.placard === 'oui' ? (
                    <Badge className="bg-green-100 text-green-800">Oui</Badge>
                  ) : worker.placard === 'non' ? (
                    <Badge variant="outline">Non</Badge>
                  ) : worker.placard === '-' ? (
                    <Badge variant="outline">-</Badge>
                  ) : worker.placard ? (
                    <Badge variant="destructive">{worker.placard}</Badge>
                  ) : (
                    <Badge variant="outline">-</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleEdit(index)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Column Information */}
      {importedWorkers.length > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong className="text-blue-800">Colonnes détectées dans votre fichier:</strong>
            <div className="mt-2 text-sm text-blue-700">
              {Object.keys(importedWorkers[0]).filter(key => !['rowIndex', 'isValid', 'errors', 'warnings', 'isEditing'].includes(key)).join(', ')}
            </div>
            <div className="mt-2 text-xs text-blue-600">
              Si certaines colonnes ne sont pas reconnues, vérifiez l'orthographe ou utilisez le modèle Excel.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {importSummary.invalid > 0 && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong className="text-red-800">
              {importSummary.invalid} ligne(s) avec erreurs:
            </strong>
            <div className="mt-2 max-h-32 overflow-auto">
              {importedWorkers
                .filter(w => !w.isValid)
                .map(w => (
                  <div key={w.rowIndex} className="text-sm text-red-700">
                    Ligne {w.rowIndex}: {w.errors.join(', ')}
                  </div>
                ))
              }
            </div>
            <div className="mt-2 text-xs text-red-600">
              💡 Conseil: Vérifiez les doublons (CIN déjà existants) et les formats de données. Utilisez le modèle Excel pour éviter les erreurs.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning Display */}
      {importedWorkers.some(w => w.warnings && w.warnings.length > 0) && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong className="text-yellow-800">
              Avertissements (n'empêchent pas l'importation):
            </strong>
            <div className="mt-2 max-h-32 overflow-auto">
              {importedWorkers
                .filter(w => w.warnings && w.warnings.length > 0)
                .map(w => (
                  <div key={w.rowIndex} className="text-sm text-yellow-700">
                    Ligne {w.rowIndex}: {w.warnings?.join(', ')}
                  </div>
                ))
              }
            </div>
            <div className="mt-2 text-xs text-yellow-600">
              ℹ️ Ces problèmes ont été automatiquement corrigés. Les ouvriers seront importés sans assignation de chambre.
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Retour
        </Button>
        <Button
          onClick={handleConfirmImport}
          disabled={importSummary.valid === 0 || isProcessing}
          className="bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Importer {importSummary.valid} ouvrier(s)
        </Button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="text-center space-y-4">
      <div className="text-green-600">
        <Check className="mx-auto h-16 w-16" />
      </div>
      <h3 className="text-lg font-medium">Import réussi!</h3>
      <p className="text-gray-600">
        {importSummary.valid} ouvrier(s) ont été importés avec succès.
      </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[98vw] max-w-6xl mx-1 sm:mx-auto max-h-[90vh] overflow-hidden flex flex-col mobile-dialog-container">
        <DialogHeader className="mobile-dialog-header">
          <DialogTitle>
            <FileText className="inline h-5 w-5 mr-2" />
            Importer des ouvriers depuis Excel
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Téléchargez un fichier Excel contenant les données des ouvriers'}
            {step === 'preview' && 'Vérifiez et modifiez les données avant l\'importation'}
            {step === 'confirm' && 'Importation terminée avec succès'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'confirm' && renderConfirmStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerImport;
