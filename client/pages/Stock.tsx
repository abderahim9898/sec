import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Plus,
  Download,
  RefreshCw,
  Search,
  Edit,
  Trash2,
  Send,
  Check,
  X,
  Clock,
  Clock as ClockIcon,
  ArrowRight,
  Bell,
  Truck,
  Package2,
  AlertCircle,
  Eye,
  Building2,
  ChevronLeft,
  Users,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ferme, StockItem, StockTransfer, TransferNotification, Worker } from '@shared/types';
import * as XLSX from 'xlsx';
import { FirebaseConnectionMonitor } from '@/components/FirebaseConnectionMonitor';
import ArticleCombobox from '@/components/ArticleCombobox';

export default function Stock() {
  const { user, isSuperAdmin, isUser, hasAllFarmsAccess } = useAuth();
  const { toast } = useToast();

  // State management
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [fermes, setFermes] = useState<Ferme[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [notifications, setNotifications] = useState<TransferNotification[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFerme, setSelectedFerme] = useState('all');
  const [activeTab, setActiveTab] = useState('inventory');

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'reject' | 'cancel'>('confirm');
  const [selectedStockDetail, setSelectedStockDetail] = useState<{
    item: string;
    totalQuantity: number;
    unit: string;
    farms: Array<{ farmName: string; quantity: number; farmId: string }>;
  } | null>(null);
  const [isStockDetailOpen, setIsStockDetailOpen] = useState(false);

  // Pagination for aggregated stock
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Pagination for inventory table
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
  const inventoryItemsPerPage = 10;

  // Pagination for transfers table
  const [transfersCurrentPage, setTransfersCurrentPage] = useState(1);
  const transfersItemsPerPage = 10;

  // Pagination for workers with LIT/EPONGE allocations
  const [workersCurrentPage, setWorkersCurrentPage] = useState(1);
  const workersItemsPerPage = 10;

  // Advanced filtering states
  const [quantityFilter, setQuantityFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Reset pagination when filters change
  useEffect(() => {
    setInventoryCurrentPage(1);
    setTransfersCurrentPage(1);
    setWorkersCurrentPage(1);
  }, [selectedFerme, searchTerm, quantityFilter, unitFilter, availabilityFilter]);

  // Calculate allocation counts for stock items
  const getAllocationCounts = (itemName: string, fermeId?: string) => {
    const relevantWorkers = workers.filter(worker =>
      worker.statut === 'actif' &&
      (!fermeId || worker.fermeId === fermeId)
    );

    console.log(`📊 Stock calculation for ${itemName} on farm ${fermeId}:`, {
      totalWorkers: workers.length,
      relevantWorkers: relevantWorkers.length,
      farmFilter: fermeId
    });

    const allocatedCount = relevantWorkers.reduce((count, worker) => {
      const allocatedItems = Array.isArray(worker.allocatedItems)
        ? worker.allocatedItems.filter(item =>
            item.itemName === itemName && item.status === 'allocated'
          )
        : [];

      if (allocatedItems.length > 0) {
        console.log(`👤 Worker ${worker.nom} has ${allocatedItems.length} ${itemName} allocated`);
      }

      return count + allocatedItems.length;
    }, 0);

    console.log(`🔢 Final allocation count for ${itemName}: ${allocatedCount}`);
    return { allocated: allocatedCount };
  };

  // Form states
  const [addForm, setAddForm] = useState({
    item: '',
    quantity: '',
    unit: 'pièces',
    notes: '',
    fermeId: ''
  });

  const [transferForm, setTransferForm] = useState({
    stockItemId: '',
    toFermeId: '',
    quantity: '',
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  // Load data
  useEffect(() => {
    setLoading(true);

    // Load fermes
    const unsubscribeFermes = onSnapshot(
      collection(db, 'fermes'),
      (snapshot) => {
        const fermesData: Ferme[] = snapshot.docs.map(doc => ({
          id: doc.id,
          nom: doc.data().nom,
          totalChambres: doc.data().totalChambres || 0,
          totalOuvriers: doc.data().totalOuvriers || 0,
          admins: doc.data().admins || []
        }));
        setFermes(fermesData);
      },
      (error) => {
        console.error('Error loading fermes:', error);
        toast({
          title: "Erreur de connexion",
          description: "Impossible de charger les fermes. Vérifiez votre connexion.",
          variant: "destructive"
        });
      }
    );

    // Load stocks
    const stockQuery = isSuperAdmin || hasAllFarmsAccess
      ? collection(db, 'stocks')
      : query(collection(db, 'stocks'), where('secteurId', '==', user?.fermeId || ''));

    const unsubscribeStocks = onSnapshot(
      stockQuery,
      (snapshot) => {
        const stocksData: StockItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as StockItem));
        console.log('Stocks loaded for user:', {
          userFermeId: user?.fermeId,
          isSuperAdmin,
          hasAllFarmsAccess,
          stocksCount: stocksData.length,
          stocks: stocksData
        });
        setStocks(stocksData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading stocks:', error);
        toast({
          title: "Erreur de connexion",
          description: "Impossible de charger le stock. Vérifiez votre connexion.",
          variant: "destructive"
        });
        setLoading(false);
      }
    );

    // Load workers for allocation tracking
    const workersQuery = isSuperAdmin || hasAllFarmsAccess
      ? collection(db, 'workers')
      : query(collection(db, 'workers'), where('fermeId', '==', user?.fermeId || ''));

    const unsubscribeWorkers = onSnapshot(
      workersQuery,
      (snapshot) => {
        const workersData: Worker[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Worker));
        setWorkers(workersData);
      },
      (error) => {
        console.error('Error loading workers:', error);
        toast({
          title: "Erreur de connexion",
          description: "Impossible de charger les travailleurs. Vérifiez votre connexion.",
          variant: "destructive"
        });
      }
    );

    // Load transfers - show both incoming and outgoing for non-superadmin
    const transferQuery = isSuperAdmin || hasAllFarmsAccess
      ? collection(db, 'stock_transfers')
      : collection(db, 'stock_transfers'); // Load all transfers, filter in memory

    const unsubscribeTransfers = onSnapshot(
      transferQuery,
      (snapshot) => {
        let transfersData: StockTransfer[] = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as StockTransfer));

        // Filter in memory for non-superadmin users to show both incoming and outgoing
        if (!isSuperAdmin && !hasAllFarmsAccess && user?.fermeId) {
          transfersData = transfersData.filter(transfer =>
            transfer.toFermeId === user.fermeId || transfer.fromFermeId === user.fermeId
          );
        }

        // Sort by createdAt in memory (newest first)
        transfersData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        });

        setTransfers(transfersData);
      },
      (error) => {
        console.error('Error loading transfers:', error);
        toast({
          title: "Erreur de connexion",
          description: "Impossible de charger les transferts. Vérifiez votre connexion.",
          variant: "destructive"
        });
      }
    );

    // Load notifications for current user
    if (user?.fermeId) {
      const notificationQuery = query(
        collection(db, 'transfer_notifications'),
        where('toFermeId', '==', user.fermeId)
      );

      const unsubscribeNotifications = onSnapshot(
        notificationQuery,
        (snapshot) => {
          const notificationsData: TransferNotification[] = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            } as TransferNotification))
            .filter(notification => notification.status !== 'acknowledged') // Filter in memory
            .sort((a, b) => {
              // Sort by createdAt in memory (newest first)
              const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
              const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
              return bTime.getTime() - aTime.getTime();
            });
          setNotifications(notificationsData);
        },
        (error) => {
          console.error('Error loading notifications:', error);
          toast({
            title: "Erreur de connexion",
            description: "Impossible de charger les notifications. Vérifiez votre connexion.",
            variant: "destructive"
          });
        }
      );

      return () => {
        unsubscribeFermes();
        unsubscribeStocks();
        unsubscribeWorkers();
        unsubscribeTransfers();
        unsubscribeNotifications();
      };
    } else {
      setLoading(false);

      return () => {
        unsubscribeFermes();
        unsubscribeStocks();
        unsubscribeWorkers();
        unsubscribeTransfers();
      };
    }
  }, [user, isSuperAdmin, hasAllFarmsAccess]);

  // Get ferme name
  const getFermeName = (fermeId: string) => {
    if (fermeId === 'centralE') return 'centrale';
    const ferme = fermes.find(f => f.id === fermeId);
    // For superadmin or users with all farms access, if farm is unknown, default to 'centrale'
    return ferme?.nom || (isSuperAdmin || hasAllFarmsAccess ? 'centrale' : 'centrale');
  };

  // Filtered and sorted data
  const filteredStocks = useMemo(() => {
    let filtered = stocks.filter(stock => {
      const matchesSearch = stock.item.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFerme = selectedFerme === 'all' || stock.secteurId === selectedFerme;

      // Quantity filter
      const matchesQuantity = quantityFilter === '' ||
        stock.quantity >= parseInt(quantityFilter) ||
        stock.quantity.toString().includes(quantityFilter);

      // Unit filter
      const matchesUnit = unitFilter === 'all' || stock.unit === unitFilter;

      // Availability filter
      const allocationCounts = getAllocationCounts(stock.item, stock.secteurId);
      const available = Math.max(0, stock.quantity - allocationCounts.allocated);
      const matchesAvailability = availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && available > 0) ||
        (availabilityFilter === 'unavailable' && available === 0) ||
        (availabilityFilter === 'low' && available > 0 && available <= 5);

      return matchesSearch && matchesFerme && matchesQuantity && matchesUnit && matchesAvailability;
    });

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case 'item':
            aValue = a.item.toLowerCase();
            bValue = b.item.toLowerCase();
            break;
          case 'quantity':
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case 'available':
            const aAllocation = getAllocationCounts(a.item, a.secteurId);
            const bAllocation = getAllocationCounts(b.item, b.secteurId);
            aValue = Math.max(0, a.quantity - aAllocation.allocated);
            bValue = Math.max(0, b.quantity - bAllocation.allocated);
            break;
          case 'ferme':
            aValue = getFermeName(a.secteurId).toLowerCase();
            bValue = getFermeName(b.secteurId).toLowerCase();
            break;
          case 'lastUpdated':
            aValue = new Date(a.lastUpdated).getTime();
            bValue = new Date(b.lastUpdated).getTime();
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string') {
          return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
      });
    }

    return filtered;
  }, [stocks, searchTerm, selectedFerme, quantityFilter, unitFilter, availabilityFilter, sortColumn, sortDirection]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(transfer => {
      const matchesSearch = transfer.item.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [transfers, searchTerm]);

  // Get unique units for filter dropdown
  const uniqueUnits = useMemo(() => {
    const units = [...new Set(stocks.map(stock => stock.unit))];
    return units.sort();
  }, [stocks]);

  // Pagination calculations for inventory
  const inventoryTotalPages = Math.ceil(filteredStocks.length / inventoryItemsPerPage);
  const inventoryStartIndex = (inventoryCurrentPage - 1) * inventoryItemsPerPage;
  const inventoryEndIndex = inventoryStartIndex + inventoryItemsPerPage;
  const paginatedInventoryStocks = filteredStocks.slice(inventoryStartIndex, inventoryEndIndex);

  // Pagination calculations for transfers
  const transfersTotalPages = Math.ceil(filteredTransfers.length / transfersItemsPerPage);
  const transfersStartIndex = (transfersCurrentPage - 1) * transfersItemsPerPage;
  const transfersEndIndex = transfersStartIndex + transfersItemsPerPage;
  const paginatedTransfers = filteredTransfers.slice(transfersStartIndex, transfersEndIndex);

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Calculate unique articles count
  const uniqueArticlesCount = useMemo(() => {
    const uniqueItems = new Set(filteredStocks.map(stock => stock.item));
    return uniqueItems.size;
  }, [filteredStocks]);

  // Calculate aggregated stock data (total quantity per article across all farms)
  const aggregatedStocks = useMemo(() => {
    const aggregationMap = new Map<string, {
      item: string;
      totalQuantity: number;
      unit: string;
      farms: Array<{ farmName: string; quantity: number; farmId: string }>;
      lastUpdated: string;
    }>();

    // Only show aggregated view for users who can see all farms
    const stocksToAggregate = isSuperAdmin || hasAllFarmsAccess ? stocks : filteredStocks;

    stocksToAggregate.forEach(stock => {
      const key = stock.item.toLowerCase();
      const farmName = getFermeName(stock.secteurId);

      if (aggregationMap.has(key)) {
        const existing = aggregationMap.get(key)!;
        existing.totalQuantity += stock.quantity;
        existing.farms.push({
          farmName,
          quantity: stock.quantity,
          farmId: stock.secteurId
        });
        // Update to most recent lastUpdated
        if (new Date(stock.lastUpdated) > new Date(existing.lastUpdated)) {
          existing.lastUpdated = stock.lastUpdated;
        }
      } else {
        aggregationMap.set(key, {
          item: stock.item,
          totalQuantity: stock.quantity,
          unit: stock.unit,
          farms: [{
            farmName,
            quantity: stock.quantity,
            farmId: stock.secteurId
          }],
          lastUpdated: stock.lastUpdated
        });
      }
    });

    // Convert map to array and sort by item name
    return Array.from(aggregationMap.values())
      .filter(aggregated => {
        // Apply search filter to aggregated items
        return !searchTerm || aggregated.item.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => a.item.localeCompare(b.item));
  }, [stocks, filteredStocks, isSuperAdmin, hasAllFarmsAccess, searchTerm]);

  // Pagination for aggregated stocks
  const totalPages = Math.ceil(aggregatedStocks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAggregatedStocks = aggregatedStocks.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Debug function to force fetch all articles
  const debugFetchAllArticles = async () => {
    try {
      console.log('🔍 Debug: Fetching ALL articles from database...');
      const allStocksSnapshot = await getDocs(collection(db, 'stocks'));
      const allStocks = allStocksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('📊 Total articles in database:', allStocks.length);
      console.log('📊 All articles:', allStocks);
      console.log('🎯 Currently displayed:', stocks.length);
      console.log('🔍 After filters:', filteredStocks.length);

      toast({
        title: "Debug Info",
        description: `Base: ${allStocks.length} articles, Affiché: ${filteredStocks.length} articles. Voir console pour détails.`
      });
    } catch (error) {
      console.error('Debug error:', error);
      toast({
        title: "Erreur Debug",
        description: "Impossible de charger les données de debug",
        variant: "destructive"
      });
    }
  };

  // Add new stock item
  const handleAddStock = async () => {
    try {
      if (!addForm.item || !addForm.quantity) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir l'article et la quantité",
          variant: "destructive"
        });
        return;
      }

      // For superadmin or users with all farms access, use selected farm or default to 'centralE'
      const targetFermeId = isSuperAdmin || hasAllFarmsAccess
        ? (addForm.fermeId || 'centralE')
        : (user?.fermeId || '');

      const targetFermeName = targetFermeId === 'centralE'
        ? 'centralE'
        : getFermeName(targetFermeId);

      const newStock: Partial<StockItem> = {
        item: addForm.item,
        quantity: parseInt(addForm.quantity),
        unit: addForm.unit,
        secteurId: targetFermeId,
        secteurName: targetFermeName,
        category: 'Général',
        notes: addForm.notes || `Article créé le ${new Date().toLocaleDateString('fr-FR')} avec ${parseInt(addForm.quantity)} ${addForm.unit}`,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString() // Add creation timestamp
      };

      await addDoc(collection(db, 'stocks'), newStock);

      setAddForm({
        item: '',
        quantity: '',
        unit: 'pièces',
        notes: '',
        fermeId: ''
      });
      setIsAddDialogOpen(false);

      toast({
        title: "Succès",
        description: "Article ajouté au stock avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'article au stock",
        variant: "destructive"
      });
    }
  };

  // Edit stock item
  const handleEditStock = async () => {
    if (!editingItem) return;

    try {
      if (!addForm.item || !addForm.quantity) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir l'article et la quantité",
          variant: "destructive"
        });
        return;
      }

      const stockRef = doc(db, 'stocks', editingItem.id);
      const oldQuantity = editingItem.quantity;
      const newQuantity = parseInt(addForm.quantity);
      const quantityChange = newQuantity - oldQuantity;

      let updateNotes = addForm.notes;
      if (quantityChange !== 0 && !addForm.notes) {
        updateNotes = quantityChange > 0
          ? `Quantité augmentée de ${quantityChange} le ${new Date().toLocaleDateString('fr-FR')} (${oldQuantity} → ${newQuantity})`
          : `Quantité réduite de ${Math.abs(quantityChange)} le ${new Date().toLocaleDateString('fr-FR')} (${oldQuantity} → ${newQuantity})`;
      }

      await updateDoc(stockRef, {
        item: addForm.item,
        quantity: newQuantity,
        notes: updateNotes,
        lastUpdated: new Date().toISOString()
      });

      setAddForm({
        item: '',
        quantity: '',
        unit: 'pièces',
        notes: '',
        fermeId: ''
      });
      setEditingItem(null);
      setIsAddDialogOpen(false);

      toast({
        title: "Succès",
        description: "Article modifié avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'article",
        variant: "destructive"
      });
    }
  };

  // Delete stock item
  const handleDeleteStock = async (stockId: string) => {
    try {
      await deleteDoc(doc(db, 'stocks', stockId));
      toast({
        title: "Succès",
        description: "Article supprimé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'article",
        variant: "destructive"
      });
    }
  };

  // Enhanced Excel download with multiple sheets by farm
  const handleDownloadInventory = () => {
    const wb = XLSX.utils.book_new();

    if ((isSuperAdmin || hasAllFarmsAccess) && selectedFerme === 'all') {
      // Create a sheet for each farm
      fermes.forEach(ferme => {
        const fermeStocks = stocks.filter(stock => stock.secteurId === ferme.id);
        const fermeData = fermeStocks.map(stock => ({
          'Article': stock.item,
          'Quantité': stock.quantity,
          'Unité': stock.unit,
          'Notes': stock.notes || '',
          'Dernière mise à jour': formatDate(stock.lastUpdated)
        }));

        if (fermeData.length > 0) {
          const ws = XLSX.utils.json_to_sheet(fermeData);

          // Set column widths
          const cols = [
            { width: 30 }, // Article
            { width: 15 }, // Quantité
            { width: 10 }, // Unité
            { width: 40 }, // Notes
            { width: 20 }  // Dernière mise à jour
          ];
          ws['!cols'] = cols;

          // Clean sheet name (remove special characters)
          const sheetName = ferme.nom.replace(/[^\w\s]/gi, '').substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      });

      // Add summary sheet
      const allStocksData = stocks.map(stock => ({
        'Ferme': getFermeName(stock.secteurId),
        'Article': stock.item,
        'Quantité': stock.quantity,
        'Unité': stock.unit,
        'Notes': stock.notes || '',
        'Dernière mise à jour': formatDate(stock.lastUpdated)
      }));

      if (allStocksData.length > 0) {
        const summaryWs = XLSX.utils.json_to_sheet(allStocksData);
        const cols = [
          { width: 20 }, // Ferme
          { width: 30 }, // Article
          { width: 15 }, // Quantité
          { width: 10 }, // Unité
          { width: 40 }, // Notes
          { width: 20 }  // Dernière mise à jour
        ];
        summaryWs['!cols'] = cols;
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé Global');
      }
    } else {
      // Single farm or filtered view
      const exportData = filteredStocks.map(stock => ({
        'Article': stock.item,
        'Quantité': stock.quantity,
        'Unité': stock.unit,
        'Notes': stock.notes || '',
        'Dernière mise à jour': formatDate(stock.lastUpdated)
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const cols = [
        { width: 30 }, // Article
        { width: 15 }, // Quantité
        { width: 10 }, // Unité
        { width: 40 }, // Notes
        { width: 20 }  // Dernière mise à jour
      ];
      ws['!cols'] = cols;

      const farmName = selectedFerme === 'all' ? 'Inventaire' : getFermeName(selectedFerme);
      XLSX.utils.book_append_sheet(wb, ws, farmName);
    }

    // Add transfers sheet if there are any
    if (transfers.length > 0) {
      const transfersData = transfers.map(transfer => ({
        'N° Suivi': transfer.trackingNumber || transfer.id.substring(0, 8),
        'Article': transfer.item,
        'Quantité': transfer.quantity,
        'De': transfer.fromFermeName || getFermeName(transfer.fromFermeId),
        'Vers': transfer.toFermeName || getFermeName(transfer.toFermeId),
        'Statut': getTransferStatusLabel(transfer.status),
        'Priorité': getPriorityLabel(transfer.priority || 'medium'),
        'Date création': formatDate(transfer.createdAt),
        'Notes': transfer.notes || ''
      }));

      const transfersWs = XLSX.utils.json_to_sheet(transfersData);
      const cols = [
        { width: 15 }, // N° Suivi
        { width: 30 }, // Article
        { width: 15 }, // Quantité
        { width: 20 }, // De
        { width: 20 }, // Vers
        { width: 15 }, // Statut
        { width: 15 }, // Priorité
        { width: 20 }, // Date création
        { width: 40 }  // Notes
      ];
      transfersWs['!cols'] = cols;
      XLSX.utils.book_append_sheet(wb, transfersWs, 'Transferts');
    }

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const farmSuffix = selectedFerme === 'all' ? 'complet' : getFermeName(selectedFerme).replace(/[^\w]/g, '_');
    const filename = `inventaire_${farmSuffix}_${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);

    toast({
      title: "Succès",
      description: `Inventaire téléchargé avec succès (${wb.SheetNames.length} feuille${wb.SheetNames.length > 1 ? 's' : ''})`
    });
  };

  // Transfer functions
  const handleCreateTransfer = async () => {
    try {
      if (!transferForm.stockItemId || !transferForm.toFermeId || !transferForm.quantity) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive"
        });
        return;
      }

      const sourceStock = stocks.find(s => s.id === transferForm.stockItemId);
      if (!sourceStock) {
        toast({
          title: "Erreur",
          description: "Article source introuvable",
          variant: "destructive"
        });
        return;
      }

      if (sourceStock.quantity < parseInt(transferForm.quantity)) {
        toast({
          title: "Erreur",
          description: "Quantité insuffisante en stock",
          variant: "destructive"
        });
        return;
      }

      const trackingNumber = `TRF-${Date.now()}`;

      // For super admin or users with all farms access, the source farm is the farm where the item currently is
      // For regular users, the source farm is their own farm
      const sourceFermeId = isSuperAdmin || hasAllFarmsAccess ? sourceStock.secteurId : (user?.fermeId || '');

      const newTransfer: Partial<StockTransfer> = {
        fromFermeId: sourceFermeId,
        fromFermeName: getFermeName(sourceFermeId),
        toFermeId: transferForm.toFermeId,
        toFermeName: getFermeName(transferForm.toFermeId),
        stockItemId: transferForm.stockItemId,
        item: sourceStock.item,
        quantity: parseInt(transferForm.quantity),
        unit: sourceStock.unit,
        status: 'pending',
        priority: transferForm.priority,
        transferredBy: user?.uid || '',
        transferredByName: user?.nom || user?.email || '',
        notes: transferForm.notes,
        trackingNumber,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'stock_transfers'), newTransfer);

      // Create notification for recipient
      const notification: Partial<TransferNotification> = {
        transferId: '', // Will be set by the transfer creation
        type: 'incoming_transfer',
        fromFermeId: sourceFermeId,
        fromFermeName: getFermeName(sourceFermeId),
        toFermeId: transferForm.toFermeId,
        toFermeName: getFermeName(transferForm.toFermeId),
        item: sourceStock.item,
        quantity: parseInt(transferForm.quantity),
        unit: sourceStock.unit,
        message: `Nouveau transfert entrant: ${sourceStock.item} (${transferForm.quantity} ${sourceStock.unit}) de ${getFermeName(sourceFermeId)}`,
        status: 'unread',
        createdAt: serverTimestamp(),
        userId: '', // Should be set to the admin of the receiving farm
        priority: transferForm.priority
      };

      await addDoc(collection(db, 'transfer_notifications'), notification);

      setTransferForm({
        stockItemId: '',
        toFermeId: '',
        quantity: '',
        notes: '',
        priority: 'medium'
      });
      setIsTransferDialogOpen(false);

      toast({
        title: "Succès",
        description: `Transfert créé avec succès (N° ${trackingNumber})`
      });
    } catch (error) {
      console.error('Erreur lors du transfert:', error);

      const isNetworkError = error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('unavailable') ||
        error.message.includes('network') ||
        error.message.includes('offline')
      );

      toast({
        title: "Erreur",
        description: isNetworkError
          ? "Problème de connexion. Veuillez vérifier votre connexion internet et réessayer."
          : "Impossible de créer le transfert",
        variant: "destructive"
      });
    }
  };

  const handleConfirmTransfer = async (transfer: StockTransfer) => {
    try {
      console.log('Confirming transfer:', {
        transfer,
        userFermeId: user?.fermeId,
        transferToFermeId: transfer.toFermeId,
        transferFromFermeId: transfer.fromFermeId
      });
      // Update transfer status to delivered (complete)
      const transferRef = doc(db, 'stock_transfers', transfer.id);
      await updateDoc(transferRef, {
        status: 'delivered',
        confirmedAt: serverTimestamp(),
        deliveredAt: serverTimestamp(),
        receivedBy: user?.uid,
        receivedByName: user?.nom || user?.email
      });

      // Update destination stock - query by secteurId only, then filter by item
      const destinationStockQuery = query(
        collection(db, 'stocks'),
        where('secteurId', '==', transfer.toFermeId)
      );
      const destinationSnapshot = await getDocs(destinationStockQuery);

      // Find existing stock for this item
      const existingDestStock = destinationSnapshot.docs.find(doc =>
        doc.data().item === transfer.item
      );

      console.log('Destination stock check:', {
        destinationDocsCount: destinationSnapshot.docs.length,
        existingDestStock: existingDestStock?.data(),
        searchingForItem: transfer.item
      });

      if (existingDestStock) {
        // Update existing stock
        const destStock = existingDestStock.data() as StockItem;
        await updateDoc(doc(db, 'stocks', existingDestStock.id), {
          quantity: destStock.quantity + transfer.quantity,
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Create new stock entry
        const newStock: Partial<StockItem> = {
          item: transfer.item,
          quantity: transfer.quantity,
          unit: transfer.unit,
          secteurId: transfer.toFermeId,
          secteurName: transfer.toFermeName,
          category: 'Général',
          lastUpdated: new Date().toISOString()
        };
        console.log('Creating new stock entry:', newStock);
        await addDoc(collection(db, 'stocks'), newStock);
      }

      // Reduce source stock - query by secteurId only, then filter by item
      const sourceStockQuery = query(
        collection(db, 'stocks'),
        where('secteurId', '==', transfer.fromFermeId)
      );
      const sourceSnapshot = await getDocs(sourceStockQuery);

      // Find existing stock for this item
      const existingSourceStock = sourceSnapshot.docs.find(doc =>
        doc.data().item === transfer.item
      );

      if (existingSourceStock) {
        const sourceStock = existingSourceStock.data() as StockItem;
        const newQuantity = sourceStock.quantity - transfer.quantity;

        if (newQuantity <= 0) {
          await deleteDoc(doc(db, 'stocks', existingSourceStock.id));
        } else {
          await updateDoc(doc(db, 'stocks', existingSourceStock.id), {
            quantity: newQuantity,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      // Update notification status
      const notificationQuery = query(
        collection(db, 'transfer_notifications'),
        where('toFermeId', '==', user?.fermeId)
      );

      const notificationSnapshot = await getDocs(notificationQuery);
      notificationSnapshot.forEach(async (notifDoc) => {
        const notifData = notifDoc.data();
        // Filter in memory: update only notifications for this item that aren't acknowledged
        if (notifData.item === transfer.item && notifData.status !== 'acknowledged') {
          await updateDoc(doc(db, 'transfer_notifications', notifDoc.id), {
            status: 'acknowledged',
            acknowledgedAt: serverTimestamp()
          });
        }
      });

      toast({
        title: "Succès",
        description: "Transfert confirmé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la confirmation:', error);

      // Check if it's a network connectivity issue
      const isNetworkError = error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('unavailable') ||
        error.message.includes('network') ||
        error.message.includes('offline')
      );

      toast({
        title: "Erreur",
        description: isNetworkError
          ? "Problème de connexion. Veuillez vérifier votre connexion internet et réessayer."
          : "Impossible de confirmer le transfert",
        variant: "destructive"
      });
    }
  };

  const handleRejectTransfer = async (transfer: StockTransfer, reason: string) => {
    try {
      const transferRef = doc(db, 'stock_transfers', transfer.id);
      await updateDoc(transferRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: user?.uid,
        rejectedByName: user?.nom || user?.email,
        rejectionReason: reason
      });

      // Update notification
      const notificationQuery = query(
        collection(db, 'transfer_notifications'),
        where('toFermeId', '==', user?.fermeId)
      );

      const notificationSnapshot = await getDocs(notificationQuery);
      notificationSnapshot.forEach(async (notifDoc) => {
        const notifData = notifDoc.data();
        // Filter in memory: update only notifications for this item that aren't acknowledged
        if (notifData.item === transfer.item && notifData.status !== 'acknowledged') {
          await updateDoc(doc(db, 'transfer_notifications', notifDoc.id), {
            status: 'acknowledged',
            acknowledgedAt: serverTimestamp()
          });
        }
      });

      toast({
        title: "Transfert rejeté",
        description: "Le transfert a été rejeté avec succès"
      });
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter le transfert",
        variant: "destructive"
      });
    }
  };

  const handleCancelTransfer = async (transfer: StockTransfer) => {
    try {
      const transferRef = doc(db, 'stock_transfers', transfer.id);
      await updateDoc(transferRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: user?.uid,
        cancelledByName: user?.nom || user?.email
      });

      toast({
        title: "Transfert annulé",
        description: "Le transfert a été annulé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler le transfert",
        variant: "destructive"
      });
    }
  };

  // Helper functions
  const getTransferStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmé',
      in_transit: 'En transit',
      delivered: 'Livré',
      rejected: 'Rejeté',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Faible',
      medium: 'Moyen',
      high: 'Élevé',
      urgent: 'Urgent'
    };
    return labels[priority] || priority;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'confirmed': return 'default';
      case 'delivered': return 'default';
      case 'rejected': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Open edit dialog
  const openEditDialog = (stock: StockItem) => {
    setEditingItem(stock);
    setAddForm({
      item: stock.item,
      quantity: stock.quantity.toString(),
      unit: stock.unit,
      notes: stock.notes || '',
      fermeId: stock.secteurId
    });
    setIsAddDialogOpen(true);
  };

  // Close dialog and reset form
  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingItem(null);
    setAddForm({
      item: '',
      quantity: '',
      unit: 'pièces',
      notes: '',
      fermeId: ''
    });
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Chargement du stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <FirebaseConnectionMonitor /> */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Stock</h1>
          
        </div>

        <div className="flex flex-wrap gap-2">
          {!isUser && (
            <>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter Article
              </Button>
              <Button
                onClick={() => setIsTransferDialogOpen(true)}
                variant="outline"
              >
                <Send className="h-4 w-4 mr-2" />
                Nouveau Transfert
              </Button>
            </>
          )}

          <Button
            onClick={handleDownloadInventory}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger Inventaire
          </Button>
        </div>
      </div>



      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900">{uniqueArticlesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transferts Actifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {transfers.filter(t => t.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Primary Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Nom de l'article..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {(isSuperAdmin || hasAllFarmsAccess) && (
                <div>
                  <Label htmlFor="ferme">Ferme</Label>
                  <Select value={selectedFerme} onValueChange={setSelectedFerme}>
  <SelectTrigger>
    <SelectValue placeholder="Toutes les fermes" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Toutes les fermes</SelectItem>
    {[...fermes] // ننسخ المصفوفة عشان ما نغير الأصلية
      .sort((a, b) => a.nom.localeCompare(b.nom)) // ترتيب أبجدي A → Z
      .map((ferme) => (
        <SelectItem key={ferme.id} value={ferme.id}>
          {ferme.nom}
        </SelectItem>
      ))}
  </SelectContent>
</Select>

                </div>
              )}

              <div>
                <Label htmlFor="tab">Vue</Label>
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une vue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory">Inventaire</SelectItem>
                    <SelectItem value="transfers">Transferts</SelectItem>
                    <SelectItem value="history">Historique</SelectItem>
                    
                  </SelectContent>
                </Select>
              </div>
            </div>

           
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Transferts
            {notifications.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Aggregated Stock Table - Only show for users with all farms access */}
          {(isSuperAdmin || hasAllFarmsAccess) && aggregatedStocks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5" />
                  Stock Agrégé par Article
                </CardTitle>
                
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Quantité Totale</TableHead>
                        <TableHead>Unité</TableHead>
                        <TableHead>Dernière MAJ</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAggregatedStocks.map((aggregated) => (
                        <TableRow key={aggregated.item}>
                          <TableCell className="font-medium">{aggregated.item}</TableCell>
                          <TableCell className="font-bold text-lg text-blue-600">
                            {aggregated.totalQuantity}
                          </TableCell>
                          <TableCell>{aggregated.unit}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(aggregated.lastUpdated)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedStockDetail(aggregated);
                                setIsStockDetailOpen(true);
                              }}
                              title="Voir les détails par ferme"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>
                        Affichage {startIndex + 1}-{Math.min(endIndex, aggregatedStocks.length)} sur {aggregatedStocks.length} articles
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1"
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventaire
                <span className="text-sm font-normal text-gray-600">
                  ({filteredStocks.length} article{filteredStocks.length > 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('item')}
                      >
                        Article <SortIndicator column="item" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('quantity')}
                      >
                        Quantité <SortIndicator column="quantity" />
                      </TableHead>
                      <TableHead>Alloué</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('available')}
                      >
                        Disponible <SortIndicator column="available" />
                      </TableHead>
                      {(isSuperAdmin || hasAllFarmsAccess) && (
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('ferme')}
                        >
                          Ferme <SortIndicator column="ferme" />
                        </TableHead>
                      )}
                      <TableHead>Notes</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('lastUpdated')}
                      >
                        Dernière MAJ <SortIndicator column="lastUpdated" />
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInventoryStocks.map((stock) => {
                      const allocationCounts = getAllocationCounts(stock.item, stock.secteurId);
                      const available = Math.max(0, stock.quantity - allocationCounts.allocated);

                      return (
                        <TableRow key={stock.id}>
                          <TableCell className="font-medium">{stock.item}</TableCell>
                          <TableCell className="font-semibold">{stock.quantity}</TableCell>
                          <TableCell className="text-orange-600 font-medium">{allocationCounts.allocated}</TableCell>
                          <TableCell className={`font-medium ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {available}
                          </TableCell>
                          {(isSuperAdmin || hasAllFarmsAccess) && <TableCell>{getFermeName(stock.secteurId)}</TableCell>}
                          <TableCell className="text-sm text-gray-600">
                            {stock.notes || '-'}
                          </TableCell>
                          <TableCell>{formatDate(stock.lastUpdated)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(stock)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteStock(stock.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {paginatedInventoryStocks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={(isSuperAdmin || hasAllFarmsAccess) ? 8 : 7} className="text-center py-8 text-gray-500">
                          Aucun article trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls for Inventory */}
              {inventoryTotalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      Affichage {inventoryStartIndex + 1}-{Math.min(inventoryEndIndex, filteredStocks.length)} sur {filteredStocks.length} articles
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInventoryCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={inventoryCurrentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(inventoryTotalPages, 10) }, (_, i) => {
                        let page;
                        if (inventoryTotalPages <= 10) {
                          page = i + 1;
                        } else {
                          // Show first few, current page area, and last few
                          if (inventoryCurrentPage <= 5) {
                            page = i + 1;
                          } else if (inventoryCurrentPage >= inventoryTotalPages - 4) {
                            page = inventoryTotalPages - 9 + i;
                          } else {
                            page = inventoryCurrentPage - 5 + i;
                          }
                        }

                        return (
                          <Button
                            key={page}
                            variant={inventoryCurrentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setInventoryCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInventoryCurrentPage(prev => Math.min(inventoryTotalPages, prev + 1))}
                      disabled={inventoryCurrentPage === inventoryTotalPages}
                      className="flex items-center gap-1"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Transferts entre Fermes
                <span className="text-sm font-normal text-gray-600">
                  ({filteredTransfers.length} transfert{filteredTransfers.length > 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Suivi</TableHead>
                      <TableHead>Article</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Vers</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransfers.map((transfer) => {
                      const isIncoming = transfer.toFermeId === user?.fermeId;
                      const isOutgoing = transfer.fromFermeId === user?.fermeId;

                      return (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-mono text-sm">
                            {transfer.trackingNumber || transfer.id.substring(0, 8)}
                          </TableCell>
                          <TableCell className="font-medium">{transfer.item}</TableCell>
                          <TableCell>{transfer.quantity} {transfer.unit}</TableCell>
                          <TableCell>{transfer.fromFermeName}</TableCell>
                          <TableCell>{transfer.toFermeName}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(transfer.status)}>
                              {getTransferStatusLabel(transfer.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {/* Actions for incoming transfers (recipient can confirm/reject) */}
                              {transfer.status === 'pending' && transfer.toFermeId === user?.fermeId && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTransfer(transfer);
                                      setConfirmAction('confirm');
                                      setShowConfirmDialog(true);
                                    }}
                                    className="bg-green-600 hover:bg-green-700"
                                    title="Confirmer la réception"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedTransfer(transfer);
                                      setConfirmAction('reject');
                                      setShowConfirmDialog(true);
                                    }}
                                    title="Rejeter le transfert"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* Actions for outgoing transfers (sender can cancel if pending) */}
                              {transfer.status === 'pending' && (transfer.fromFermeId === user?.fermeId || isSuperAdmin) && transfer.toFermeId !== user?.fermeId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedTransfer(transfer);
                                    setConfirmAction('cancel');
                                    setShowConfirmDialog(true);
                                  }}
                                  title="Annuler le transfert"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Status indicator for pending transfers */}
                              {transfer.status === 'pending' && (
                                <Clock className="h-4 w-4 text-orange-500" title="En attente" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {paginatedTransfers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          Aucun transfert trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls for Transfers */}
              {transfersTotalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      Affichage {transfersStartIndex + 1}-{Math.min(transfersEndIndex, filteredTransfers.length)} sur {filteredTransfers.length} transferts
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransfersCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={transfersCurrentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(transfersTotalPages, 10) }, (_, i) => {
                        let page;
                        if (transfersTotalPages <= 10) {
                          page = i + 1;
                        } else {
                          // Show first few, current page area, and last few
                          if (transfersCurrentPage <= 5) {
                            page = i + 1;
                          } else if (transfersCurrentPage >= transfersTotalPages - 4) {
                            page = transfersTotalPages - 9 + i;
                          } else {
                            page = transfersCurrentPage - 5 + i;
                          }
                        }

                        return (
                          <Button
                            key={page}
                            variant={transfersCurrentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTransfersCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransfersCurrentPage(prev => Math.min(transfersTotalPages, prev + 1))}
                      disabled={transfersCurrentPage === transfersTotalPages}
                      className="flex items-center gap-1"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Historique des mouvements de stock
              </CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stock Additions/Purchases */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Entrées de stock
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Article</TableHead>
                          <TableHead>Quantité</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStocks
                          .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                          .map((stock) => (
                          <TableRow key={`entry-${stock.id}`}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{formatDate(stock.lastUpdated)}</div>
                                {stock.createdAt && stock.createdAt !== stock.lastUpdated && (
                                  <div className="text-xs text-gray-500">
                                    Créé: {formatDate(stock.createdAt)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{stock.item}</div>
                                <div className="text-xs text-gray-500">
                                  {getFermeName(stock.secteurId)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold">+{stock.quantity} {stock.unit}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
                                Ajout d'article
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 max-w-xs">
                              {stock.notes || `Article créé avec ${stock.quantity} ${stock.unit || 'unité(s)'}`}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredStocks.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                              <div className="space-y-2">
                                <div className="text-lg">📦 Aucune entrée de stock enregistrée</div>
                                <div className="text-sm">
                                  Les nouveaux articles ajoutés apparaîtront ici automatiquement
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>


                {/* Workers with LIT/EPONGE Allocations */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-600 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Ouvriers avec allocations LIT/EPONGE
                  </h3>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Matricule</TableHead>
                          <TableHead>Ouvrier</TableHead>
                          <TableHead>CIN</TableHead>
                          <TableHead>Ferme</TableHead>
                          <TableHead>Chambre</TableHead>
                          <TableHead className="text-center">&nbsp;LIT</TableHead>
                          <TableHead className="text-center">&nbsp;EPONGE</TableHead>
                          <TableHead>Date allocation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          // Get workers with LIT or EPONGE allocations
                          const workersWithAllocations = workers
                            .filter(worker => {
                              // Filter by farm permission
                              const farmMatch = isSuperAdmin || hasAllFarmsAccess ||
                                               selectedFerme === 'all' ||
                                               worker.fermeId === selectedFerme ||
                                               (!selectedFerme && worker.fermeId === user?.fermeId);

                              if (!farmMatch) return false;

                              // Check if worker has LIT or EPONGE allocations
                              const allocatedItems = Array.isArray(worker.allocatedItems) ? worker.allocatedItems : [];
                              const hasLitOrEponge = allocatedItems.some(item =>
                                item.status === 'allocated' &&
                                (item.itemName.toLowerCase().includes('lit') ||
                                 item.itemName.toLowerCase().includes('eponge'))
                              );

                              return hasLitOrEponge;
                            })
                            .map(worker => {
                              const allocatedItems = Array.isArray(worker.allocatedItems) ? worker.allocatedItems : [];

                              // Get LIT allocations
                              const litAllocations = allocatedItems.filter(item =>
                                item.status === 'allocated' && item.itemName.toLowerCase().includes('lit')
                              );

                              // Get EPONGE allocations
                              const epongeAllocations = allocatedItems.filter(item =>
                                item.status === 'allocated' && item.itemName.toLowerCase().includes('eponge')
                              );

                              // Get most recent allocation date
                              const allLitEpongeAllocations = [...litAllocations, ...epongeAllocations];
                              const mostRecentDate = allLitEpongeAllocations.length > 0
                                ? Math.max(...allLitEpongeAllocations.map(a => new Date(a.allocatedAt).getTime()))
                                : 0;

                              return {
                                ...worker,
                                litCount: litAllocations.length,
                                epongeCount: epongeAllocations.length,
                                mostRecentAllocation: mostRecentDate > 0 ? new Date(mostRecentDate).toISOString() : null
                              };
                            })
                            .sort((a, b) => {
                              // Sort by most recent allocation date, then by name
                              if (a.mostRecentAllocation && b.mostRecentAllocation) {
                                return new Date(b.mostRecentAllocation).getTime() - new Date(a.mostRecentAllocation).getTime();
                              }
                              return a.nom.localeCompare(b.nom);
                            });

                          // Pagination logic
                          const totalWorkers = workersWithAllocations.length;
                          const totalPages = Math.ceil(totalWorkers / workersItemsPerPage);
                          const startIndex = (workersCurrentPage - 1) * workersItemsPerPage;
                          const endIndex = startIndex + workersItemsPerPage;
                          const paginatedWorkers = workersWithAllocations.slice(startIndex, endIndex);

                          return paginatedWorkers.map((worker) => (
                            <TableRow key={`worker-allocation-${worker.id}`}>
                              <TableCell className="font-mono text-sm">{worker.matricule || '-'}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{worker.nom}</div>
                                  <div className="text-xs text-gray-500">
                                    {worker.statut === 'actif' ? (
                                      <Badge className="bg-green-100 text-green-800 text-xs">Actif</Badge>
                                    ) : (
                                      <Badge className="bg-gray-100 text-gray-800 text-xs">Inactif</Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{worker.cin}</TableCell>
                              <TableCell>
                                <div className="text-sm">{getFermeName(worker.fermeId)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{worker.chambre || '-'}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                {worker.litCount > 0 ? (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    ✓ {worker.litCount}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {worker.epongeCount > 0 ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    ✓ {worker.epongeCount}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {worker.mostRecentAllocation ? (
                                  <div className="text-sm">
                                    {formatDate(worker.mostRecentAllocation)}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                        {(() => {
                          const workersWithAllocations = workers.filter(worker => {
                            const farmMatch = isSuperAdmin || hasAllFarmsAccess ||
                                             selectedFerme === 'all' ||
                                             worker.fermeId === selectedFerme ||
                                             (!selectedFerme && worker.fermeId === user?.fermeId);

                            if (!farmMatch) return false;

                            const allocatedItems = Array.isArray(worker.allocatedItems) ? worker.allocatedItems : [];
                            return allocatedItems.some(item =>
                              item.status === 'allocated' &&
                              (item.itemName.toLowerCase().includes('lit') ||
                               item.itemName.toLowerCase().includes('eponge'))
                            );
                          });

                          return workersWithAllocations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                <div className="space-y-2">
                                  <div className="text-lg">👥 Aucun ouvrier avec allocations LIT/EPONGE</div>
                                  <div className="text-sm">
                                    Les ouvriers qui reçoivent des allocations apparaîtront ici
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null;
                        })()}
                      </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {(() => {
                      const workersWithAllocations = workers.filter(worker => {
                        const farmMatch = isSuperAdmin || hasAllFarmsAccess ||
                                         selectedFerme === 'all' ||
                                         worker.fermeId === selectedFerme ||
                                         (!selectedFerme && worker.fermeId === user?.fermeId);

                        if (!farmMatch) return false;

                        const allocatedItems = Array.isArray(worker.allocatedItems) ? worker.allocatedItems : [];
                        return allocatedItems.some(item =>
                          item.status === 'allocated' &&
                          (item.itemName.toLowerCase().includes('lit') ||
                           item.itemName.toLowerCase().includes('eponge'))
                        );
                      });

                      const totalWorkers = workersWithAllocations.length;
                      const totalPages = Math.ceil(totalWorkers / workersItemsPerPage);

                      if (totalPages <= 1) return null;

                      return (
                        <div className="flex items-center justify-between mt-4 px-2">
                          <div className="text-sm text-gray-600">
                            Affichage {Math.min((workersCurrentPage - 1) * workersItemsPerPage + 1, totalWorkers)}-{Math.min(workersCurrentPage * workersItemsPerPage, totalWorkers)} sur {totalWorkers} ouvriers
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWorkersCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={workersCurrentPage === 1}
                              className="flex items-center gap-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Précédent
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                <Button
                                  key={pageNum}
                                  variant={pageNum === workersCurrentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setWorkersCurrentPage(pageNum)}
                                  className="w-8 h-8 p-0"
                                >
                                  {pageNum}
                                </Button>
                              ))}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWorkersCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={workersCurrentPage === totalPages}
                              className="flex items-center gap-1"
                            >
                              Suivant
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Transfers In/Out */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Transferts
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Article</TableHead>
                          <TableHead>De</TableHead>
                          <TableHead>Vers</TableHead>
                          <TableHead>Quantité</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transfers
                          .filter(transfer =>
                            transfer.fromFermeId === user?.fermeId ||
                            transfer.toFermeId === user?.fermeId ||
                            (!user?.fermeId && true)
                          )
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((transfer) => (
                          <TableRow key={transfer.id}>
                            <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                            <TableCell className="font-medium">{transfer.item}</TableCell>
                            <TableCell>{transfer.fromFermeName || getFermeName(transfer.fromFermeId)}</TableCell>
                            <TableCell>{transfer.toFermeName || getFermeName(transfer.toFermeId)}</TableCell>
                            <TableCell className={`font-semibold ${
                              transfer.toFermeId === user?.fermeId ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transfer.toFermeId === user?.fermeId ? '+' : '-'}{transfer.quantity}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${
                                transfer.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : transfer.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transfer.status === 'completed' ? 'Terminé' :
                                 transfer.status === 'pending' ? 'En attente' : 'Annulé'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {transfers
                          .filter(transfer =>
                            transfer.fromFermeId === user?.fermeId ||
                            transfer.toFermeId === user?.fermeId ||
                            (!user?.fermeId && true)
                          ).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500 py-4">
                              Aucun transfert enregistré
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Stock Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="w-[95vw] max-w-lg mx-2 sm:mx-auto mobile-dialog-container">
          <DialogHeader className="mobile-dialog-header">
            <DialogTitle>
              {editingItem ? 'Modifier l\'Article' : 'Ajouter un Article'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modifiez les informations de l\'article.' : 'Ajoutez un nouvel article à l\'inventaire.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ArticleCombobox
              value={addForm.item}
              onValueChange={(value) => setAddForm(prev => ({ ...prev, item: value }))}
              onUnitChange={(unit) => setAddForm(prev => ({ ...prev, unit }))}
              placeholder="Sélectionner un article..."
              required={true}
              allowCustomEntry={true}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantité *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={addForm.quantity}
                  onChange={(e) => setAddForm(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unité</Label>
                <Input
                  id="unit"
                  value={addForm.unit}
                  onChange={(e) => setAddForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="Ex: pièces, kg, litres"
                />
              </div>
            </div>

            {(isSuperAdmin || hasAllFarmsAccess) && (
              <div>
                <Label htmlFor="ferme">Ferme *</Label>
                <Select
                  value={addForm.fermeId}
                  onValueChange={(value) => setAddForm(prev => ({ ...prev, fermeId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une ferme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centralE">centralE</SelectItem>
                    {[...fermes]
                      .sort((a, b) => a.nom.localeCompare(b.nom))
                      .map(ferme => (
                        <SelectItem key={ferme.id} value={ferme.id}>
                          {ferme.nom}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Notes sur l'article (optionnel)"
                value={addForm.notes}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button
              onClick={editingItem ? handleEditStock : handleAddStock}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingItem ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg mx-2 sm:mx-auto mobile-dialog-container">
          <DialogHeader className="mobile-dialog-header">
            <DialogTitle>Créer un Transfert</DialogTitle>
            <DialogDescription>
              Transférez un article de votre ferme vers une autre ferme.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">

            <div>
              <Label htmlFor="stockItem">Article à transférer *</Label>
              <Select
                value={transferForm.stockItemId}
                onValueChange={(value) => setTransferForm(prev => ({ ...prev, stockItemId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un article" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // For super admin or users with all farms access, show all stocks. For regular users, show only their farm's stocks
                    const availableStocks = isSuperAdmin || hasAllFarmsAccess
                      ? stocks
                      : stocks.filter(stock => stock.secteurId === user?.fermeId);

                    console.log('Available stocks for transfer:', {
                      isSuperAdmin,
                      hasAllFarmsAccess,
                      totalStocks: stocks.length,
                      userFermeId: user?.fermeId,
                      availableStocks: availableStocks.length,
                      stocksData: availableStocks.map(s => ({ item: s.item, secteurId: s.secteurId, quantity: s.quantity }))
                    });

                    if (availableStocks.length === 0) {
                      const message = isSuperAdmin || hasAllFarmsAccess
                        ? "Aucun article disponible dans la base de données"
                        : `Aucun article disponible dans votre ferme (${user?.fermeId || 'Non défini'})`;
                      return (
                        <SelectItem value="no-items" disabled>
                          {message}
                        </SelectItem>
                      );
                    }

                    return availableStocks.map(stock => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.item} - {stock.quantity} {stock.unit}
                        {(isSuperAdmin || hasAllFarmsAccess) && ` (${getFermeName(stock.secteurId)})`}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="toFerme">Ferme de destination *</Label>
              <Select
                value={transferForm.toFermeId}
                onValueChange={(value) => setTransferForm(prev => ({ ...prev, toFermeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la ferme destinataire" />
                </SelectTrigger>
                <SelectContent>
                  {!isSuperAdmin && (
                    <SelectItem key="centralE" value="centralE">
                      Centrale (Superadmin)
                    </SelectItem>
                  )}
                  {[...fermes]
                    .filter(ferme => ferme.id !== user?.fermeId)
                    .sort((a, b) => a.nom.localeCompare(b.nom))
                    .map(ferme => (
                      <SelectItem key={ferme.id} value={ferme.id}>
                        {ferme.nom}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="w-full">
                <Label htmlFor="transferQuantity">Quantité *</Label>
                <Input
                  id="transferQuantity"
                  type="number"
                  placeholder="0"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="mr-auto"
                />
              </div>


            </div>

            <div>
              <Label htmlFor="transferNotes">Notes</Label>
              <Input
                id="transferNotes"
                placeholder="Notes sur le transfert (optionnel)"
                value={transferForm.notes}
                onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateTransfer} className="bg-blue-600 hover:bg-blue-700">
              Créer le Transfert
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm/Reject Transfer Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'confirm' && 'Confirmer le transfert'}
              {confirmAction === 'reject' && 'Rejeter le transfert'}
              {confirmAction === 'cancel' && 'Annuler le transfert'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'confirm' &&
                `Êtes-vous sûr de vouloir confirmer la réception de ${selectedTransfer?.quantity} ${selectedTransfer?.unit} de ${selectedTransfer?.item} de ${selectedTransfer?.fromFermeName} ?`
              }
              {confirmAction === 'reject' &&
                `Êtes-vous sûr de vouloir rejeter le transfert de ${selectedTransfer?.quantity} ${selectedTransfer?.unit} de ${selectedTransfer?.item} de ${selectedTransfer?.fromFermeName} ?`
              }
              {confirmAction === 'cancel' &&
                `Êtes-vous sûr de vouloir annuler le transfert de ${selectedTransfer?.quantity} ${selectedTransfer?.unit} de ${selectedTransfer?.item} vers ${selectedTransfer?.toFermeName} ?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTransfer) {
                  if (confirmAction === 'confirm') {
                    handleConfirmTransfer(selectedTransfer);
                  } else if (confirmAction === 'reject') {
                    handleRejectTransfer(selectedTransfer, 'Rejeté par l\'utilisateur');
                  } else if (confirmAction === 'cancel') {
                    handleCancelTransfer(selectedTransfer);
                  }
                }
                setShowConfirmDialog(false);
                setSelectedTransfer(null);
              }}
              className={
                confirmAction === 'confirm' ? 'bg-green-600 hover:bg-green-700' :
                confirmAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                'bg-orange-600 hover:bg-orange-700'
              }
            >
              {confirmAction === 'confirm' && 'Confirmer'}
              {confirmAction === 'reject' && 'Rejeter'}
              {confirmAction === 'cancel' && 'Annuler'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock Detail Modal */}
      <Dialog open={isStockDetailOpen} onOpenChange={setIsStockDetailOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-2 sm:mx-auto mobile-dialog-container">
          <DialogHeader className="mobile-dialog-header">
            <DialogTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              Détail du Stock: {selectedStockDetail?.item}
            </DialogTitle>
            <DialogDescription>
              Répartition détaillée du stock de "{selectedStockDetail?.item}" par ferme
            </DialogDescription>
          </DialogHeader>

          {selectedStockDetail && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Total Global</h3>
                    <p className="text-sm text-blue-700">Toutes fermes confondues</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedStockDetail.totalQuantity}
                    </div>
                    <div className="text-sm text-blue-700">{selectedStockDetail.unit}</div>
                  </div>
                </div>
              </div>

              {/* Farm Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Répartition par Ferme ({selectedStockDetail.farms.length})
                </h3>

                <div className="grid gap-3">
                  {selectedStockDetail.farms.map((farm, index) => {
                    const percentage = ((farm.quantity / selectedStockDetail.totalQuantity) * 100).toFixed(1);
                    return (
                      <div
                        key={`${farm.farmId}-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg border">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{farm.farmName}</div>
                            <div className="text-sm text-gray-600">
                              {percentage}% du stock total
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {farm.quantity}
                          </div>
                          <div className="text-sm text-gray-600">{selectedStockDetail.unit}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedStockDetail.farms.length}
                  </div>
                  <div className="text-sm text-gray-600">Fermes avec cet article</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {(selectedStockDetail.totalQuantity / selectedStockDetail.farms.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Quantité moyenne par ferme</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsStockDetailOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
