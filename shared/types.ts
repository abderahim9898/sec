export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  fermeId?: string;
  nom: string;
  telephone: string;
}

export interface Ferme {
  id: string;
  nom: string;
  totalChambres: number;
  totalOuvriers: number;
  admins: string[];
}

export interface WorkerHistory {
  id: string;
  dateEntree: string;
  dateSortie?: string;
  motif?: string;
  chambre: string;
  secteur: string;
  fermeId: string; // Allow moving between farms
  transferId?: string; // Reference to transfer record if this period was part of a transfer
}

export interface Supervisor {
  id: string;
  nom: string;
  telephone: string;
  company?: string; // Company name for the supervisor
  statut: 'actif' | 'inactif';
  createdAt: string;
  updatedAt?: string;
}

export interface AllocatedItem {
  id: string;
  itemName: string; // e.g., "EPONGE", "LIT"
  allocatedAt: string; // ISO date string
  allocatedBy: string; // User ID who allocated
  stockItemId: string; // Reference to the stock item
  fermeId: string; // Farm where allocated
  status: 'allocated' | 'returned'; // Track if item was returned
  returnedAt?: string; // ISO date string when returned
}

export interface Worker {
  id: string;
  nom: string;
  cin: string;
  matricule?: string; // Worker matricule/employee ID
  fermeId: string; // Current farm or last farm if inactive
  telephone: string;
  sexe: 'homme' | 'femme';
  age: number;
  yearOfBirth?: number; // Year of birth for age calculation (deprecated)
  dateNaissance?: string; // Full date of birth in YYYY-MM-DD format
  chambre: string; // Current room
  secteur: string; // Current sector
  dateEntree: string; // Current or last entry date
  dateSortie?: string; // Current or last exit date
  motif?: string; // Current or last exit reason
  statut: 'actif' | 'inactif';
  supervisorId?: string; // Reference to supervisor
  workHistory?: WorkerHistory[]; // Complete work history including current period
  totalWorkDays?: number; // Total accumulated work days across all periods
  returnCount?: number; // Number of times the worker returned after leaving
  allocatedItems?: AllocatedItem[]; // Items allocated to this worker
  // Transfer tracking fields (for workers created via transfer)
  originalWorkerId?: string; // Reference to original worker record at source farm
  transferId?: string; // Reference to the transfer that created this worker
  transferredFrom?: string; // Source farm ID if this worker was transferred
}

export interface Room {
  id: string;
  numero: string;
  fermeId: string;
  genre: 'hommes' | 'femmes';
  secteur: string; // Sector assignment for structured room organization
  capaciteTotale: number;
  occupantsActuels: number;
  listeOccupants: string[];
}

export interface DashboardStats {
  totalOuvriers: number;
  totalChambres: number;
  chambresOccupees: number;
  placesRestantes: number;
  ouvriersHommes: number;
  ouvriersFemmes: number;
}

export interface StockItem {
  id: string;
  secteurId: string;
  secteurName?: string;
  item: string;
  quantity: number;
  unit: string;
  lastUpdated: string;
  minThreshold?: number;
  maxThreshold?: number;
  description?: string;
  category?: string;
  supplier?: string;
  cost?: number;
  location?: string;
  barcode?: string;
}

export interface StockTransfer {
  id: string;
  fromFermeId: string;
  fromFermeName?: string;
  toFermeId: string;
  toFermeName?: string;
  stockItemId: string;
  item: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'pending_approval' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled' | 'rejected';
  createdAt: any;
  confirmedAt?: any;
  deliveredAt?: any;
  rejectedAt?: any;
  transferredBy: string;
  transferredByName?: string;
  receivedBy?: string;
  receivedByName?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: any;
  requiresSuperadminApproval?: boolean;
  notes?: string;
  rejectionReason?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  trackingNumber?: string;
  estimatedDelivery?: any;
}

export interface StockAddition {
  id: string;
  secteurId: string;
  secteurName?: string;
  item: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'confirmed';
  addedBy: string;
  addedByName?: string;
  createdAt: any;
  confirmedAt: any;
  cost?: number;
  supplier?: string;
  batchNumber?: string;
  expiryDate?: any;
  notes?: string;
  invoiceNumber?: string;
}

export interface StockHistory {
  id: string;
  itemName: string;
  secteurId: string;
  secteurName: string;
  action: 'addition' | 'transfer_out' | 'transfer_in' | 'consumption' | 'adjustment' | 'receipt';
  quantity: number;
  unit: string;
  previousQuantity: number;
  newQuantity: number;
  performedBy: string;
  performedByName: string;
  timestamp: any;
  notes?: string;
  relatedId?: string;
}

export interface StockAlert {
  id: string;
  itemName: string;
  secteurId: string;
  secteurName: string;
  type: 'low_stock' | 'overstocked' | 'pending_receipt' | 'expiry_warning' | 'new_receipt';
  message: string;
  severity: 'info' | 'warning' | 'error';
  createdAt: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: any;
}

export interface AnnouncementNotification {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'users' | 'admins' | 'superadmins';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: string;
  isActive: boolean;
}

export interface TransferNotification {
  id: string;
  transferId: string;
  type: 'incoming_transfer' | 'transfer_confirmed' | 'transfer_rejected' | 'transfer_delivered' | 'central_shipment_approval' | 'central_shipment_approved' | 'central_shipment_rejected';
  fromFermeId: string;
  fromFermeName: string;
  toFermeId: string;
  toFermeName: string;
  item: string;
  quantity: number;
  unit: string;
  message: string;
  status: 'unread' | 'read' | 'acknowledged';
  createdAt: any;
  readAt?: any;
  acknowledgedAt?: any;
  userId: string;
  targetAudience?: 'superadmins' | 'admins' | 'users';
  requiresAction?: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface WorkerTransfer {
  id: string;
  fromFermeId: string;
  fromFermeName?: string;
  toFermeId: string;
  toFermeName?: string;
  workers: {
    workerId: string;
    workerName: string;
    matricule?: string;
    sexe: 'homme' | 'femme';
    currentChambre: string;
    currentSecteur: string;
    assignedChambre?: string; // Room assigned by receiving farm admin
    assignedSecteur?: string; // Sector assigned by receiving farm admin
  }[];
  status: 'pending' | 'pending_approval' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled' | 'rejected';
  createdAt: any;
  confirmedAt?: any;
  deliveredAt?: any;
  rejectedAt?: any;
  cancelledAt?: any;
  transferredBy: string;
  transferredByName?: string;
  receivedBy?: string;
  receivedByName?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  notes?: string;
  rejectionReason?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  trackingNumber?: string;
  estimatedDelivery?: any;
  roomAssignments?: {
    [workerId: string]: {
      chambre: string;
      secteur: string;
    };
  };
}

export interface WorkerTransferNotification {
  id: string;
  transferId: string;
  type: 'incoming_worker_transfer' | 'worker_transfer_confirmed' | 'worker_transfer_rejected' | 'worker_transfer_delivered';
  fromFermeId: string;
  fromFermeName: string;
  toFermeId: string;
  toFermeName: string;
  workers: {
    workerId: string;
    workerName: string;
    matricule?: string;
    sexe: 'homme' | 'femme';
  }[];
  workerCount: number;
  message: string;
  status: 'unread' | 'read' | 'acknowledged';
  createdAt: any;
  readAt?: any;
  acknowledgedAt?: any;
  userId: string;
  targetAudience?: 'superadmins' | 'admins' | 'users';
  requiresAction?: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AdminNotificationRequest {
  type: 'cross-farm-duplicate-attempt';
  existingWorker: {
    name: string;
    cin: string;
    currentFarm: string;
    profileLink: string;
  };
  attemptDetails: {
    attemptingFarm: string;
    attemptDate: string;
    attemptedEntry: string;
    attemptedRoom?: string;
  };
  adminEmail: string;
}

export interface AdminNotificationRecord {
  id: string;
  type: 'cross-farm-duplicate-attempt';
  workerCin: string;
  workerName: string;
  currentFarm: string;
  attemptingFarm: string;
  sentTo: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  emailContent?: string;
}

export interface ArticleName {
  id: string;
  name: string;
  category?: string;
  description?: string;
  defaultUnit: string;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
