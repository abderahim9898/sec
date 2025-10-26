import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { useSupervisors } from '@/hooks/useSupervisors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AdvancedNavigation } from '@/components/AdvancedNavigation';
import { ResponsiveDataTable } from '@/components/ResponsiveDataTable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdvancedSearch } from '@/components/AdvancedSearch';
import { SimpleLayout } from '@/components/SimpleLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart3,
  Users,
  BedDouble,
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Clock,
  LogOut,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target,
  UserCheck,
  UserX,
  Home,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  PieChart,
  BarChart as BarChartIcon,
  LineChart,
  Users2,
  Clock3,
  TrendingDown as TrendDown,
  Eye,
  Sparkles,
  Shield,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  IdCard,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Ferme, Worker, Room, WorkerTransfer, StockTransfer } from '@shared/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
  }
}
import { NetworkErrorHandler } from '@/components/NetworkErrorHandler';
import { forceSyncRoomOccupancy, getOccupancySummary, type SyncResult } from '@/utils/syncUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart
} from '@/components/WarningFreeRecharts';

// Exit reason translation function
const getMotifLabel = (motif: string): string => {
  const motifTranslations: Record<string, string> = {
    'fin_contrat': 'Fin de contrat',
    'demission': 'Démission',
    'licenciement': 'Licenciement',
    'mutation': 'Mutation',
    'retraite': 'Retraite',
    'opportunite_salariale': 'Opportunité salariale',
    'absences_frequentes': 'Absences fréquentes',
    'comportement': 'Comportement',
    'salaire': 'Raisons salariales',
    'depart_volontaire': 'Départ volontaire',
    'horaires_nocturnes': 'Horaires nocturnes',
    'adaptation_difficile': 'Adaptation difficile',
    'etudes': 'Étudiant',
    'heures_insuffisantes': 'Heures insuffisantes',
    'distance': 'Distance',
    'indiscipline': 'Indiscipline',
    'balance': 'Difficulté avec la balance',
    'maladie': 'Maladie',
    'respect_voisins': 'Respect des voisins',
    'nature_travail': 'Nature du travail',
    'sante': 'Santé',
    'securite': 'Sécurité',
    'rendement': 'Rendement',
    'problemes_personnels': 'Problèmes personnels',
    'caporal': 'Raison de caporal',
    'refus_poste': 'Refus de poste',
    'rejet_selection': 'Rejet lors de la sélection',
    'repos_temporaire': 'Repos temporaire',
    'secteur_insatisfaisant': 'Secteur insatisfaisant',
    'pas_reponse': 'Pas de réponse',
    'conditions_secteur': 'Conditions du secteur',
    'raisons_personnelles': 'Raisons personnelles',
    'autre': 'Autre',
    'none': 'Non spécifié'
  };

  return motifTranslations[motif] || motif || 'Non spécifié';
};

export default function Statistics() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isUser, hasAllFarmsAccess } = useAuth();


  const { data: fermes, error: fermesError, refetch: refetchFermes } = useFirestore<Ferme>('fermes');
  const { data: allWorkers, error: workersError, refetch: refetchWorkers } = useFirestore<Worker>('workers');
  const { data: allRooms, error: roomsError, refetch: refetchRooms } = useFirestore<Room>('rooms');
  const { data: workerTransfers } = useFirestore<WorkerTransfer>('worker_transfers');
  const { data: stockTransfers } = useFirestore<StockTransfer>('stock_transfers');
  const { supervisors } = useSupervisors();
  
  const [selectedFerme, setSelectedFerme] = useState('all');
  const [timeRange, setTimeRange] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGender, setSelectedGender] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [comparePrevious, setComparePrevious] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const trendContainerRef = useRef<HTMLDivElement | null>(null);
  const [trendReady, setTrendReady] = useState(false);
  useEffect(() => {
    const update = () => {
      const el = trendContainerRef.current;
      if (!el) return;
      const w = el.offsetWidth || 0;
      const h = el.offsetHeight || 0;
      setTrendReady(w > 100 && h > 100);
    };
    update();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      if (trendContainerRef.current) ro.observe(trendContainerRef.current);
    } else {
      window.addEventListener('resize', update);
    }
    return () => {
      if (ro && trendContainerRef.current) ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Helper function to get month name
  const getMonthName = (monthNum: string) => {
    const months = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[parseInt(monthNum)];
  };

  // Filter data based on user role, selected ferme, and gender
  const workers = useMemo(() => {
    let filteredWorkers = selectedFerme === 'all'
      ? (isSuperAdmin || hasAllFarmsAccess ? allWorkers : allWorkers.filter(w => w.fermeId === user?.fermeId))
      : allWorkers.filter(w => w.fermeId === selectedFerme);

    // Apply gender filter
    if (selectedGender !== 'all') {
      filteredWorkers = filteredWorkers.filter(w => w.sexe === selectedGender);
    }

    return filteredWorkers;
  }, [allWorkers, selectedFerme, selectedGender, isSuperAdmin, hasAllFarmsAccess, user?.fermeId]);

  const rooms = selectedFerme === 'all'
    ? (isSuperAdmin || hasAllFarmsAccess ? allRooms : allRooms.filter(r => r.fermeId === user?.fermeId))
    : allRooms.filter(r => r.fermeId === selectedFerme);

  const getPeriodBounds = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    if (timeRange === 'week') {
      end = now; const s = new Date(); s.setDate(now.getDate() - 6); start = s;
    } else if (timeRange === 'month') {
      end = now; const s = new Date(); s.setDate(now.getDate() - 29); start = s;
    } else if (timeRange === 'quarter') {
      end = now; const s = new Date(); s.setDate(now.getDate() - 89); start = s;
    } else if (timeRange === 'year') {
      end = now; const s = new Date(); s.setFullYear(now.getFullYear() - 1); s.setDate(s.getDate() + 1); start = s;
    } else if (timeRange === 'specific_month' && selectedMonth && selectedYear) {
      const y = Number(selectedYear); const m = Number(selectedMonth) - 1;
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0);
    } else if (timeRange === 'specific_year' && selectedYear) {
      const y = Number(selectedYear);
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31);
    } else if (timeRange === 'custom' && dateRange.from && dateRange.to) {
      start = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
      end = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
    } else {
      end = now; const s = new Date(); s.setDate(now.getDate() - 29); start = s;
    }
    return { start: start!, end: end! };
  }, [timeRange, selectedMonth, selectedYear, dateRange]);

  const getPrevPeriodBounds = useMemo(() => {
    const { start, end } = getPeriodBounds;
    const msInDay = 24 * 60 * 60 * 1000;
    const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msInDay) + 1);
    const prevEnd = new Date(start.getTime() - msInDay);
    const prevStart = new Date(prevEnd.getTime() - (durationDays - 1) * msInDay);
    return { start: prevStart, end: prevEnd };
  }, [getPeriodBounds]);

  const normalizeDate = (d: any) => {
    if (!d) return null;
    if (typeof d === 'string') return new Date(d);
    if (d?.toDate) return d.toDate();
    if (d instanceof Date) return d;
    return new Date(d);
  };

  const within = (d: any, start: Date, end: Date) => {
    const dt = normalizeDate(d);
    if (!dt) return false;
    const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    return day >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && day <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
  };

  // Comprehensive statistics calculation
  const statistics = useMemo(() => {
    // Enhanced filtering for specific month/year
    const filterByTimeRange = (date: Date, range: string) => {
      if (range === 'specific_month' && selectedMonth && selectedYear) {
        return date.getMonth() + 1 == parseInt(selectedMonth) &&
               date.getFullYear() == parseInt(selectedYear);
      }
      if (range === 'specific_year' && selectedYear) {
        return date.getFullYear() == parseInt(selectedYear);
      }
      // For relative periods (week, month, quarter, year), use threshold comparison
      const getTimeThreshold = (range: string) => {
        const date = new Date();
        switch (range) {
          case 'week': date.setDate(date.getDate() - 7); break;
          case 'month': date.setDate(date.getDate() - 30); break;
          case 'quarter': date.setDate(date.getDate() - 90); break;
          case 'year': date.setFullYear(date.getFullYear() - 1); break;
          default: date.setDate(date.getDate() - 30);
        }
        return date;
      };
      const threshold = getTimeThreshold(range);
      return date >= threshold;
    };

    // Filter workers based on the time period for entry dates
    const getFilteredWorkers = () => {
      if (timeRange === 'specific_month' || timeRange === 'specific_year') {
        // For specific month/year, filter workers by their entry date
        return workers.filter(w => {
          if (!w.dateEntree) return false;
          return filterByTimeRange(new Date(w.dateEntree), timeRange);
        });
      }
      // For other time ranges, use all workers (existing behavior)
      return workers;
    };

    const filteredWorkers = getFilteredWorkers();
    const activeWorkers = filteredWorkers.filter(w => w.statut === 'actif');
    const inactiveWorkers = filteredWorkers.filter(w => w.statut === 'inactif');
    const exitedWorkers = filteredWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);
    
    const maleWorkers = activeWorkers.filter(w => w.sexe === 'homme');
    const femaleWorkers = activeWorkers.filter(w => w.sexe === 'femme');
    
    const maleRooms = rooms.filter(r => r.genre === 'hommes');
    const femaleRooms = rooms.filter(r => r.genre === 'femmes');
    
    const occupiedRooms = rooms.filter(r => r.occupantsActuels > 0);
    const fullRooms = rooms.filter(r => r.occupantsActuels >= r.capaciteTotale);
    const emptyRooms = rooms.filter(r => r.occupantsActuels === 0);
    
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capaciteTotale, 0);

    // Calculate actual occupied places from worker assignments (gender-aware)
    const occupiedPlaces = (() => {
      const workerRoomMap = new Map<string, number>();

      workers.filter(w => w.statut === 'actif' && w.chambre).forEach(worker => {
        const workerGenderType = worker.sexe === 'homme' ? 'hommes' : 'femmes';
        const roomKey = `${worker.fermeId}-${worker.chambre}-${workerGenderType}`;
        workerRoomMap.set(roomKey, (workerRoomMap.get(roomKey) || 0) + 1);
      });

      return Array.from(workerRoomMap.values()).reduce((sum, count) => sum + count, 0);
    })();

    const availablePlaces = totalCapacity - occupiedPlaces;
    
    const occupancyRate = totalCapacity > 0 ? (occupiedPlaces / totalCapacity) * 100 : 0;

    // For recent arrivals/exits, use the original workers array with time filtering
    const recentArrivals = workers.filter(w =>
      filterByTimeRange(new Date(w.dateEntree), timeRange) && w.statut === 'actif'
    );
    const recentExits = workers.filter(w => w.statut === 'inactif' && w.dateSortie).filter(w =>
      w.dateSortie && filterByTimeRange(new Date(w.dateSortie), timeRange)
    );

    // Exit analysis - use filtered exits for specific periods
    const exitReasonsData = (timeRange === 'specific_month' || timeRange === 'specific_year') ? recentExits : exitedWorkers;
    const exitReasons = exitReasonsData.reduce((acc, worker) => {
      const reason = worker.motif || 'none';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topExitReason = Object.entries(exitReasons)
      .sort(([,a], [,b]) => b - a)[0];

    // Length of stay analysis - use filtered data for specific periods
    const staysWithDuration = exitReasonsData
      .filter(w => w.dateEntree && w.dateSortie)
      .map(w => {
        const entryDate = new Date(w.dateEntree);
        const exitDate = new Date(w.dateSortie!);
        return Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      });

    const averageStayDuration = staysWithDuration.length > 0
      ? Math.round(staysWithDuration.reduce((sum, days) => sum + days, 0) / staysWithDuration.length)
      : 0;

    // Calculate average active days considering work history
    const allWorkersActiveDays = filteredWorkers
      .filter(w => w.dateEntree || (w.workHistory && w.workHistory.length > 0))
      .map(w => {
        let totalDays = 0;

        // If worker has work history, calculate from all periods
        if (w.workHistory && w.workHistory.length > 0) {
          w.workHistory.forEach(period => {
            const entryDate = new Date(period.dateEntree);
            const endDate = period.dateSortie ? new Date(period.dateSortie) : new Date();
            const days = Math.floor((endDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
            totalDays += Math.max(0, days);
          });
        } else {
          // Fallback to main dates for workers without history
          const entryDate = new Date(w.dateEntree);
          const endDate = w.dateSortie ? new Date(w.dateSortie) : new Date();
          totalDays = Math.floor((endDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        return Math.max(0, totalDays);
      });

    const averageActiveDays = allWorkersActiveDays.length > 0
      ? Math.round(allWorkersActiveDays.reduce((sum, days) => sum + days, 0) / allWorkersActiveDays.length)
      : 0;

    // Calculate statistics for returning workers (exclude transfers)
    const isTransferRelated = (w: any) => {
      if (w?.lastTransferFrom || w?.transferId) return true;
      if (typeof w?.motif === 'string' && w.motif.toLowerCase().includes('transfert')) return true;
      if (Array.isArray(w?.workHistory)) {
        return w.workHistory.some((p: any) => typeof p?.motif === 'string' && p.motif.toLowerCase().includes('transfert'));
      }
      return false;
    };
    const returningWorkers = filteredWorkers
      .filter(w => w.returnCount && w.returnCount > 0)
      .filter(w => !isTransferRelated(w));
    const averageReturnCount = returningWorkers.length > 0
      ? Math.round((returningWorkers.reduce((sum, w) => sum + (w.returnCount || 0), 0) / returningWorkers.length) * 10) / 10
      : 0;

    // Age analysis
    const ages = activeWorkers.map(w => w.age);
    const averageAge = ages.length > 0 ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0;
    const minAge = ages.length > 0 ? Math.min(...ages) : 0;
    const maxAge = ages.length > 0 ? Math.max(...ages) : 0;

    // Gender-specific age calculations
    const maleAges = maleWorkers.map(w => w.age);
    const femaleAges = femaleWorkers.map(w => w.age);
    const averageAgeMen = maleAges.length > 0 ? Math.round(maleAges.reduce((sum, age) => sum + age, 0) / maleAges.length) : 0;
    const averageAgeWomen = femaleAges.length > 0 ? Math.round(femaleAges.reduce((sum, age) => sum + age, 0) / femaleAges.length) : 0;

    const ageDistribution = {
      '18-25': activeWorkers.filter(w => w.age >= 18 && w.age <= 25).length,
      '26-35': activeWorkers.filter(w => w.age >= 26 && w.age <= 35).length,
      '36-45': activeWorkers.filter(w => w.age >= 36 && w.age <= 45).length,
      '46+': activeWorkers.filter(w => w.age >= 46).length
    };

    // Efficiency metrics (calculated in return statement)
    
    // Performance indicators
    const isHighOccupancy = occupancyRate > 85;
    const isLowOccupancy = occupancyRate < 50;
    const hasRecentGrowth = recentArrivals.length > recentExits.length;
    const balancedGender = Math.abs(maleWorkers.length - femaleWorkers.length) <= Math.ceil(activeWorkers.length * 0.2);

    // Calculate exit percentage properly
    const totalWorkersInPeriod = Math.max(filteredWorkers.length, 1);
    const exitPercentage = Math.round((exitReasonsData.length / totalWorkersInPeriod) * 100 * 100) / 100;

    return {
      // Basic counts
      totalWorkers: activeWorkers.length,
      totalInactiveWorkers: inactiveWorkers.length,
      maleWorkers: maleWorkers.length,
      femaleWorkers: femaleWorkers.length,
      totalRooms: rooms.length,
      maleRooms: maleRooms.length,
      femaleRooms: femaleRooms.length,
      occupiedRooms: occupiedRooms.length,
      emptyRooms: emptyRooms.length,
      fullRooms: fullRooms.length,

      // Capacity metrics
      totalCapacity,
      occupiedPlaces,
      availablePlaces,
      occupancyRate: Math.round(occupancyRate * 100) / 100,

      // Time-based metrics
      recentArrivals: recentArrivals.length,
      recentExits: recentExits.length,
      netChange: recentArrivals.length - recentExits.length,

      // Age metrics
      averageAge,
      averageAgeMen,
      averageAgeWomen,
      minAge,
      maxAge,
      ageDistribution,

      // Stay duration
      averageStayDuration,
      averageActiveDays,
      totalExitedWorkers: exitReasonsData.length,

      // Returning workers
      returningWorkersCount: returningWorkers.length,
      averageReturnCount,

      // Exit analysis
      exitReasons,
      topExitReason: topExitReason ? topExitReason[0] : 'Aucune',
      topExitReasonCount: topExitReason ? topExitReason[1] : 0,
      exitPercentage,

      // Performance metrics - adjusted for filtered data
      turnoverRate: Math.round((filteredWorkers.length > 0 ? (exitReasonsData.length / filteredWorkers.length) * 100 : 0) * 100) / 100,
      retentionRate: Math.round((100 - (filteredWorkers.length > 0 ? (exitReasonsData.length / filteredWorkers.length) * 100 : 0)) * 100) / 100,
      utilizationRate: Math.round(occupancyRate * 100) / 100,

      // Status indicators
      isHighOccupancy,
      isLowOccupancy,
      hasRecentGrowth,
      balancedGender,

      // Trends (mock data - in real app would calculate from historical data)
      occupancyTrend: hasRecentGrowth ? 8.5 : -3.2,
      workersTrend: recentArrivals.length > 0 ? 12.1 : -5.4,
    };
  }, [workers, rooms, timeRange, selectedMonth, selectedYear, selectedGender]);

  // Trends and previous-period comparisons
  const trends = useMemo(() => {
    const { start, end } = getPeriodBounds;
    const { start: pStart, end: pEnd } = getPrevPeriodBounds;

    const scopeWorkers = workers;
    const arrivalsNow = scopeWorkers.filter(w => within(w.dateEntree, start, end)).length;
    const arrivalsPrev = scopeWorkers.filter(w => within(w.dateEntree, pStart, pEnd)).length;

    const exitsNow = scopeWorkers.filter(w => w.dateSortie && within(w.dateSortie, start, end)).length;
    const exitsPrev = scopeWorkers.filter(w => w.dateSortie && within(w.dateSortie, pStart, pEnd)).length;

    const capacity = rooms.reduce((s, r) => s + r.capaciteTotale, 0) || 1;
    const activeOn = (day: Date) => scopeWorkers.filter(w => {
      const ent = normalizeDate(w.dateEntree);
      const ext = w.dateSortie ? normalizeDate(w.dateSortie) : null;
      if (!ent) return false;
      const dd = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const entDay = new Date(ent.getFullYear(), ent.getMonth(), ent.getDate());
      const extDay = ext ? new Date(ext.getFullYear(), ext.getMonth(), ext.getDate()) : null;
      return entDay <= dd && (!extDay || extDay >= dd);
    }).length;

    const occNow = Math.round((activeOn(end) / capacity) * 10000) / 100;
    const occPrev = Math.round((activeOn(pEnd) / capacity) * 10000) / 100;

    const pct = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

    return {
      arrivals: { cur: arrivalsNow, prev: arrivalsPrev, change: pct(arrivalsNow, arrivalsPrev) },
      exits: { cur: exitsNow, prev: exitsPrev, change: pct(exitsNow, exitsPrev) },
      occupancyRate: { cur: occNow, prev: occPrev, change: pct(occNow, occPrev) }
    };
  }, [workers, rooms, getPeriodBounds, getPrevPeriodBounds]);

  // Daily trend series for charts
  const dailySeries = useMemo(() => {
    const { start, end } = getPeriodBounds;
    const msInDay = 24 * 60 * 60 * 1000;
    const days: { date: string; arrivals: number; departures: number; occupancyRate: number }[] = [];
    const capacity = rooms.reduce((s, r) => s + r.capaciteTotale, 0) || 1;
    for (let t = start.getTime(); t <= end.getTime(); t += msInDay) {
      const d = new Date(t);
      const label = d.toLocaleDateString('fr-FR');
      const arrivals = workers.filter(w => within(w.dateEntree, d, d)).length;
      const departures = workers.filter(w => w.dateSortie && within(w.dateSortie, d, d)).length;
      const active = workers.filter(w => {
        const ent = normalizeDate(w.dateEntree);
        const ext = w.dateSortie ? normalizeDate(w.dateSortie) : null;
        if (!ent) return false;
        const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const entDay = new Date(ent.getFullYear(), ent.getMonth(), ent.getDate());
        const extDay = ext ? new Date(ext.getFullYear(), ext.getMonth(), ext.getDate()) : null;
        return entDay <= dd && (!extDay || extDay >= dd);
      }).length;
      const occupancyRate = Math.round((active / capacity) * 10000) / 100;
      days.push({ date: label, arrivals, departures, occupancyRate });
    }
    return days;
  }, [workers, rooms, getPeriodBounds]);

  // Pending transfers > 2 days
  const pendingTransfersOver2Days = useMemo(() => {
    const twoDaysMs = 1000;
    const now = Date.now();
    const olderThan2 = (createdAt: any) => {
      const d = normalizeDate(createdAt);
      if (!d) return false;
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return now - day.getTime() > twoDaysMs;
    };
    const wt = (workerTransfers || []).filter(t => (t as any).status === 'pending' && olderThan2((t as any).createdAt));
    
    return wt.length;
  }, [workerTransfers]);

   // Pending transfers > 2 days
   const pendingTransfersOver2Dayss = useMemo(() => {
    const twoDaysMs = 1000;
    const now = Date.now();
    const olderThan2 = (createdAt: any) => {
      const d = normalizeDate(createdAt);
      if (!d) return false;
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return now - day.getTime() > twoDaysMs;
    };
    
    const st = (stockTransfers || []).filter(t => (t as any).status === 'pending' && olderThan2((t as any).createdAt));
    return st.length;
  }, [stockTransfers]);

  // Enhanced PDF Export functionality with charts
  const generateAdvancedPDFReport = async (fermeId: string | 'all' = 'all') => {
    try {
      // Load logo first
      const logoDataUrl = await loadLogoForPDF();

      async function loadLogoForPDF(): Promise<string | null> {
        return new Promise((resolve) => {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = 120;
              canvas.height = 30;

              // Draw white background
              ctx!.fillStyle = 'white';
              ctx!.fillRect(0, 0, canvas.width, canvas.height);

              // Draw logo
              ctx!.drawImage(logoImg, 5, 5, 110, 20);
              resolve(canvas.toDataURL('image/png'));
            } catch (error) {
              console.log('Error processing logo:', error);
              resolve(null);
            }
          };
          logoImg.onerror = () => resolve(null);
          logoImg.src = 'https://cdn.builder.io/api/v1/image/assets%2F54187f8fd2324ab0baf205c15c42f7d5%2F58ff0b28018a4660a6f30e69fd206000?format=webp&width=800';
        });
      }
      // Capture chart elements as images
      const captureChartElement = async (elementId: string): Promise<string | null> => {
        const element = document.getElementById(elementId);
        if (!element) return null;

        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true
        });
        return canvas.toDataURL('image/png');
      };

      // Capture all chart elements
      const [
        overviewChartImage,
        genderChartImage,
        ageChartImage,
        occupancyChartImage,
        exitReasonsChartImage,
        exitTrendsImage
      ] = await Promise.all([
        captureChartElement('overview-chart'),
        captureChartElement('gender-distribution-chart'),
        captureChartElement('age-distribution-chart'),
        captureChartElement('occupancy-chart'),
        captureChartElement('exit-reasons-chart'),
        captureChartElement('exit-trends-chart')
      ]);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const tableWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Filter data based on ferme
      const reportFermes = fermeId === 'all' ? fermes : fermes.filter(f => f.id === fermeId);
      const reportTitle = fermeId === 'all' ? 'Rapport Statistique Avancé Complet' : `Rapport Statistique Avancé - ${reportFermes[0]?.nom || 'Ferme'}`;

      // Compute per-report statistics based on fermeId (override page-level statistics)
      const baseWorkers = fermeId === 'all' ? allWorkers : allWorkers.filter(w => w.fermeId === fermeId);
      const reportWorkers = selectedGender === 'all' ? baseWorkers : baseWorkers.filter(w => w.sexe === selectedGender);
      const reportRooms = fermeId === 'all' ? allRooms : allRooms.filter(r => r.fermeId === fermeId);

      const activeWorkers = reportWorkers.filter(w => w.statut === 'actif');
      const inactiveWorkers = reportWorkers.filter(w => w.statut === 'inactif');

      const totalCapacity = reportRooms.reduce((sum, room) => sum + room.capaciteTotale, 0);
      const occupiedPlaces = reportRooms.reduce((sum, room) => sum + room.occupantsActuels, 0);
      const availablePlaces = Math.max(0, totalCapacity - occupiedPlaces);
      const occupancyRate = totalCapacity > 0 ? Math.round(((occupiedPlaces / totalCapacity) * 100) * 100) / 100 : 0;

      const maleWorkers = activeWorkers.filter(w => w.sexe === 'homme').length;
      const femaleWorkers = activeWorkers.filter(w => w.sexe === 'femme').length;

      // Time threshold for recents based on UI selection
      const getTimeThreshold = (range: string) => {
        const date = new Date();
        switch (range) {
          case 'week': date.setDate(date.getDate() - 7); break;
          case 'month': date.setDate(date.getDate() - 30); break;
          case 'quarter': date.setDate(date.getDate() - 90); break;
          case 'year': date.setFullYear(date.getFullYear() - 1); break;
          case 'specific_month': {
            if (selectedMonth && selectedYear) {
              const y = Number(selectedYear);
              const m = Number(selectedMonth) - 1;
              return new Date(y, m, 1);
            }
            break;
          }
          case 'specific_year': {
            if (selectedYear) {
              const y = Number(selectedYear);
              return new Date(y, 0, 1);
            }
            break;
          }
          default: date.setDate(date.getDate() - 30);
        }
        return date;
      };
      const threshold = getTimeThreshold(timeRange);

      const recentArrivals = reportWorkers.filter(w => w.dateEntree && new Date(w.dateEntree) >= threshold && w.statut === 'actif');
      const exitedWorkers = reportWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);
      const recentExits = exitedWorkers.filter(w => w.dateSortie && new Date(w.dateSortie) >= threshold);

      const exitReasons = exitedWorkers.reduce((acc, worker) => {
        const reason = worker.motif || 'Non spécifié';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topExitReasonEntry = Object.entries(exitReasons).sort(([,a],[,b]) => b - a)[0];

      const staysWithDuration = exitedWorkers
        .filter(w => w.dateEntree && w.dateSortie)
        .map(w => {
          const entryDate = new Date(w.dateEntree);
          const exitDate = new Date(w.dateSortie!);
          return Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        });
      const averageStayDuration = staysWithDuration.length > 0
        ? Math.round(staysWithDuration.reduce((sum, days) => sum + days, 0) / staysWithDuration.length)
        : 0;

      const ages = activeWorkers.map(w => w.age).filter(n => typeof n === 'number' && !isNaN(n));
      const averageAge = ages.length > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;

      const totalRooms = reportRooms.length;
      const occupiedRooms = reportRooms.filter(r => r.occupantsActuels > 0).length;
      const emptyRooms = reportRooms.filter(r => r.occupantsActuels === 0).length;
      const fullRooms = reportRooms.filter(r => r.occupantsActuels >= r.capaciteTotale).length;

      const ageDistribution: Record<string, number> = {
        '18-25': activeWorkers.filter(w => w.age >= 18 && w.age <= 25).length,
        '26-35': activeWorkers.filter(w => w.age >= 26 && w.age <= 35).length,
        '36-45': activeWorkers.filter(w => w.age >= 36 && w.age <= 45).length,
        '46+': activeWorkers.filter(w => w.age >= 46).length,
      };

      const turnoverRate = reportWorkers.length > 0 ? Math.round(((exitedWorkers.length / reportWorkers.length) * 100) * 100) / 100 : 0;
      const retentionRate = Math.round((100 - turnoverRate) * 100) / 100;
      const utilizationRate = occupancyRate;
      const isHighOccupancy = occupancyRate > 85;
      const isLowOccupancy = occupancyRate < 50;
      const hasRecentGrowth = recentArrivals.length > recentExits.length;

      // Local statistics shadowing outer 'statistics'
      const statistics = {
        totalWorkers: activeWorkers.length,
        totalInactiveWorkers: inactiveWorkers.length,
        maleWorkers,
        femaleWorkers,
        totalRooms,
        occupiedRooms,
        emptyRooms,
        fullRooms,
        totalCapacity,
        occupiedPlaces,
        availablePlaces,
        occupancyRate,
        recentArrivals: recentArrivals.length,
        recentExits: recentExits.length,
        hasRecentGrowth,
        averageAge,
        ageDistribution,
        averageStayDuration,
        totalExitedWorkers: exitedWorkers.length,
        exitReasons,
        topExitReason: topExitReasonEntry ? topExitReasonEntry[0] : 'Aucune',
        topExitReasonCount: topExitReasonEntry ? topExitReasonEntry[1] : 0,
        turnoverRate,
        retentionRate,
        utilizationRate,
        isHighOccupancy,
        isLowOccupancy,
      };

      // Professional Header with gradient effect
      doc.setFillColor(37, 99, 235); // Deep blue background
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setFillColor(59, 130, 246); // Lighter blue gradient
      doc.rect(0, 0, pageWidth, 35, 'F');

      // Header border
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(2);
      doc.line(0, 50, pageWidth, 50);

      // Add logo to PDF header
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', margin, 8, 30, 8);
      }

      // Company/System identifier
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('AROMAHERBES - SYSTEME DE GESTION DES FERMES', margin + 35, 12);

      // Main title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(reportTitle, pageWidth / 2, 30, { align: 'center' });

      // Report type indicator
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('RAPPORT PROFESSIONNEL COMPLET', pageWidth / 2, 42, { align: 'center' });

      yPosition = 60;
      doc.setTextColor(0, 0, 0);

      // Professional date and metadata section
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 20, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 20);

      const currentDate = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('GENERE LE:', margin + 10, yPosition + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(currentDate, margin + 40, yPosition + 3);

      doc.setFont('helvetica', 'bold');
      doc.text('FILTRE:', margin + 10, yPosition + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(fermeId === 'all' ? 'Toutes les fermes' : `Ferme: ${reportFermes[0]?.nom || fermeId}` , margin + 35, yPosition + 10);

      yPosition += 30;

      // Executive Summary with visual enhancements
      doc.setFillColor(34, 197, 94);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('RESUME EXECUTIF', margin + 5, yPosition);
      yPosition += 15;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Enhanced summary without emojis for PDF compatibility
      const enhancedSummaryText = [
        `* ${statistics.totalWorkers} ouvriers actifs dans le systeme`,
        `* Taux d'occupation: ${statistics.occupancyRate}% (${statistics.occupiedPlaces}/${statistics.totalCapacity} places)`,
        `* ${statistics.availablePlaces} places disponibles`,
        `* Age moyen des ouvriers: ${statistics.averageAge} ans`,
        `* Taux de retention: ${statistics.retentionRate}%`,
        `* ${statistics.recentArrivals} nouveaux arrivants et ${statistics.recentExits} sorties`,
        `* Motif de sortie principal: ${getMotifLabel(statistics.topExitReason)} (${statistics.topExitReasonCount} cas)`
      ];

      enhancedSummaryText.forEach(text => {
        doc.text(text, margin + 5, yPosition);
        yPosition += 7;
      });
      yPosition += 15;

      // Add Overview Chart if captured
      if (overviewChartImage) {
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFillColor(79, 70, 229);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('GRAPHIQUE DE VUE D\'ENSEMBLE', margin + 5, yPosition);
        yPosition += 15;
        doc.setTextColor(0, 0, 0);

        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 80;
        doc.addImage(overviewChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 15;
      }

      // Enhanced KPI Table with visual styling
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFillColor(139, 69, 19);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('INDICATEURS CLES DE PERFORMANCE', margin + 5, yPosition);
      yPosition += 15;
      doc.setTextColor(0, 0, 0);

      const kpiData = [
        ['Indicateur', 'Valeur', 'Statut'],
        ['Ouvriers Actifs', statistics.totalWorkers.toString(), statistics.totalWorkers > 0 ? 'Actif' : 'Inactif'],
        ['Taux d\'Occupation', `${statistics.occupancyRate}%`, statistics.isHighOccupancy ? 'Eleve' : statistics.isLowOccupancy ? 'Faible' : 'Optimal'],
        ['Nouveaux Arrivants', statistics.recentArrivals.toString(), statistics.hasRecentGrowth ? 'Croissance' : 'Stable'],
        ['Sorties', statistics.recentExits.toString(), statistics.recentExits > statistics.recentArrivals ? 'Eleve' : 'Normal'],
        ['Taux de Retention', `${statistics.retentionRate}%`, statistics.retentionRate > 85 ? 'Excellent' : statistics.retentionRate > 70 ? 'Bon' : 'A ameliorer',],
        ['Duree Moyenne de Sejour', `${statistics.averageStayDuration} jours`, statistics.averageStayDuration > 30 ? 'Long' : 'Court']
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [kpiData[0]],
        body: kpiData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.35 },
          1: { cellWidth: tableWidth * 0.35, halign: 'center' },
          2: { cellWidth: tableWidth * 0.3, halign: 'center' },
          
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // DEMOGRAPHICS SECTION
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = margin;
      }

      // Demographics Header with professional styling
      doc.setFillColor(59, 130, 246); // Blue gradient
      doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
      doc.setFillColor(79, 70, 229);
      doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SECTION DEMOGRAPHIQUE', pageWidth / 2, yPosition + 2, { align: 'center' });
      yPosition += 25;
      doc.setTextColor(0, 0, 0);

      // Demographics Overview Table
      const demographicsData = [
        ['Critere', 'Valeur', 'Pourcentage'],
        ['Population Totale', statistics.totalWorkers.toString(), '100%'],
        ['Ouvriers Hommes', statistics.maleWorkers.toString(), `${statistics.totalWorkers > 0 ? Math.round((statistics.maleWorkers / statistics.totalWorkers) * 100) : 0}%`, statistics.maleWorkers > statistics.femaleWorkers ? 'Majorite' : 'Minorite'],
        ['Ouvriers Femmes', statistics.femaleWorkers.toString(), `${statistics.totalWorkers > 0 ? Math.round((statistics.femaleWorkers / statistics.totalWorkers) * 100) : 0}%`, statistics.femaleWorkers > statistics.maleWorkers ? 'Majorite' : 'Minorite'],
        ['Age Moyen Global', `${statistics.averageAge} ans`, '-', statistics.averageAge > 30 ? 'Mature' : 'Jeune'],
        ['Age Moyen Hommes', `${statistics.averageAgeMen || 0} ans`, '-', 'Stable'],
        ['Age Moyen Femmes', `${statistics.averageAgeWomen || 0} ans`, '-', 'Stable']
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [demographicsData[0]],
        body: demographicsData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.35, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.35, halign: 'center' },
          2: { cellWidth: tableWidth * 0.3, halign: 'center' },
          
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Age Distribution Analysis
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(236, 72, 153);
      doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('ANALYSE PAR TRANCHE D\'AGE', margin + 5, yPosition + 1);
      yPosition += 10;
      doc.setTextColor(0, 0, 0);

      const ageDistributionData = [
        ['Tranche Age', 'Nombre', 'Pourcentage', 'Statut'],
        ...Object.entries(statistics.ageDistribution).map(([range, count]) => [
          `${range} ans`,
          count.toString(),
          `${statistics.totalWorkers > 0 ? Math.round((count / statistics.totalWorkers) * 100) : 0}%`,
          count > (statistics.totalWorkers / Object.keys(statistics.ageDistribution).length) ? 'Au-dessus moyenne' : 'En-dessous moyenne'
        ])
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [ageDistributionData[0]],
        body: ageDistributionData.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: [236, 72, 153],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.25 },
          1: { cellWidth: tableWidth * 0.2, halign: 'center' },
          2: { cellWidth: tableWidth * 0.25, halign: 'center' },
          3: { cellWidth: tableWidth * 0.3, halign: 'center' }
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Add Gender Distribution Chart
      if (genderChartImage) {
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFillColor(236, 72, 153);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('REPARTITION PAR GENRE', margin + 5, yPosition);
        yPosition += 15;
        doc.setTextColor(0, 0, 0);

        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 80;
        doc.addImage(genderChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 15;
      }

      // Add Age Distribution Chart
      if (ageChartImage) {
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFillColor(168, 85, 247);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('DISTRIBUTION PAR AGE', margin + 5, yPosition);
        yPosition += 15;
        doc.setTextColor(0, 0, 0);

        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 80;
        doc.addImage(ageChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 15;
      }

      // Add Occupancy Chart
      if (occupancyChartImage) {
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFillColor(34, 197, 94);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('ANALYSE D\'OCCUPATION', margin + 5, yPosition);
        yPosition += 15;
        doc.setTextColor(0, 0, 0);

        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 80;
        doc.addImage(occupancyChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 15;
      }

      // Add Exit Reasons Chart
      if (exitReasonsChartImage) {
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFillColor(239, 68, 68);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('MOTIFS DE SORTIE', margin + 5, yPosition);
        yPosition += 15;
        doc.setTextColor(0, 0, 0);

        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 80;
        doc.addImage(exitReasonsChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 15;
      }

      // OCCUPATION SECTION
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = margin;
      }

      // Occupation Header with professional styling
      doc.setFillColor(34, 197, 94); // Green gradient
      doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
      doc.setFillColor(22, 163, 74);
      doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SECTION OCCUPATION & LOGEMENT', pageWidth / 2, yPosition + 2, { align: 'center' });
      yPosition += 25;
      doc.setTextColor(0, 0, 0);

      // Occupation Statistics Table
      const occupationData = [
        ['Metrique Occupation', 'Valeur Actuelle', 'Capacite Max', 'Taux Utilisation'],
        ['Chambres Totales', statistics.totalRooms.toString(), statistics.totalRooms.toString(), '100%'],
        ['Chambres Occupees', statistics.occupiedRooms.toString(), statistics.totalRooms.toString(), `${Math.round((statistics.occupiedRooms / statistics.totalRooms) * 100)}%`],
        ['Chambres Vides', statistics.emptyRooms.toString(), statistics.totalRooms.toString(), `${Math.round((statistics.emptyRooms / statistics.totalRooms) * 100)}%`],
        ['Places Totales', statistics.totalCapacity.toString(), statistics.totalCapacity.toString(), '100%', 'Capacite Maximale'],
        ['Places Occupees', statistics.occupiedPlaces.toString(), statistics.totalCapacity.toString(), `${Math.round((statistics.occupiedPlaces / statistics.totalCapacity) * 100)}%`],
        ['Places Libres', statistics.availablePlaces.toString(), statistics.totalCapacity.toString(), `${Math.round((statistics.availablePlaces / statistics.totalCapacity) * 100)}%`]
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [occupationData[0]],
        body: occupationData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.4, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.2, halign: 'center' },
          2: { cellWidth: tableWidth * 0.2, halign: 'center' },
          3: { cellWidth: tableWidth * 0.2, halign: 'center' },
          
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Housing Efficiency Analysis
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(16, 185, 129);
      doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('ANALYSE D\'EFFICACITE DU LOGEMENT', margin + 5, yPosition + 1);
      yPosition += 10;
      doc.setTextColor(0, 0, 0);

      const efficiencyMetrics = [
        `Taux d'occupation global: ${statistics.occupancyRate}%`,
        `Chambres Vide: ${statistics.emptyRooms}`,
        `Efficacite d'utilisation: ${statistics.utilizationRate}%`,
        `Marge de croissance: ${statistics.availablePlaces} places disponibles`
      ];

      efficiencyMetrics.forEach(metric => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`• ${metric}`, margin + 5, yPosition);
        yPosition += 7;
      });
      yPosition += 10;

      // Detailed Analytics Table
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFillColor(245, 101, 101);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('ANALYSE DETAILLEE', margin + 5, yPosition);
      yPosition += 15;
      doc.setTextColor(0, 0, 0);

      // Comprehensive occupancy analysis
      const detailedAnalytics = [
        ['Metrique', 'Valeur', 'Performance', 'Objectif'],
        ['Chambres Totales', statistics.totalRooms.toString(), 'Inventaire', 'Optimiser'],
        ['Chambres Occupees', statistics.occupiedRooms.toString(), statistics.occupiedRooms > statistics.totalRooms * 0.8 ? 'Eleve' : 'Normal', '> 80%'],
        ['Chambres Vides', statistics.emptyRooms.toString(), statistics.emptyRooms > statistics.totalRooms * 0.2 ? 'Eleve' : 'Normal', '< 20%'],
        ['Chambres Pleines', statistics.fullRooms.toString(), statistics.fullRooms > 0 ? 'Surcharge' : 'Normal', 'Equilibre'],
        ['Capacite Totale', statistics.totalCapacity.toString(), 'Potentiel', 'Maximiser'],
        ['Places Occupees', statistics.occupiedPlaces.toString(), `${Math.round((statistics.occupiedPlaces / statistics.totalCapacity) * 100)}%`, 'Optimiser'],
        ['Places Disponibles', statistics.availablePlaces.toString(), statistics.availablePlaces > 0 ? 'Disponible' : 'Complet', 'Maintenir'],
        ['Taux d\'Utilisation', `${statistics.utilizationRate}%`, statistics.utilizationRate > 85 ? 'Optimal' : 'A ameliorer', '> 85%']
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [detailedAnalytics[0]],
        body: detailedAnalytics.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: [245, 101, 101],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.3 },
          1: { cellWidth: tableWidth * 0.2, halign: 'center' },
          2: { cellWidth: tableWidth * 0.25, halign: 'center' },
          3: { cellWidth: tableWidth * 0.25, halign: 'center' }
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // PERFORMANCE SECTION
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = margin;
      }

      // Performance Header with professional styling
      doc.setFillColor(245, 101, 101); // Red gradient
      doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
      doc.setFillColor(220, 38, 38);
      doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SECTION PERFORMANCE & RENTABILITE', pageWidth / 2, yPosition + 2, { align: 'center' });
      yPosition += 25;
      doc.setTextColor(0, 0, 0);

      // Performance KPIs Table
      const performanceData = [
        ['Indicateur Performance', 'Valeur Actuelle', 'Objectif', 'Performance'],
        ['Taux d\'Occupation', `${statistics.occupancyRate}%`, '85%', statistics.occupancyRate >= 85 ? 'Excellent' : statistics.occupancyRate >= 70 ? 'Bon' : 'A ameliorer'],
        ['Taux de Retention', `${statistics.retentionRate}%`, '90%', statistics.retentionRate >= 90 ? 'Excellent' : statistics.retentionRate >= 75 ? 'Bon' : 'Critique'],
        ['Efficacite Logement', `${statistics.utilizationRate}%`, '95%', statistics.utilizationRate >= 95 ? 'Optimal' : statistics.utilizationRate >= 80 ? 'Bon' : 'Faible'],
        ['Duree Moyenne Sejour', `${statistics.averageStayDuration} jours`, '> 60 jours', statistics.averageStayDuration > 60 ? 'Stable' : 'Court'],
        ['Croissance Population', statistics.hasRecentGrowth ? 'Positive' : 'Stable', 'Croissance', statistics.hasRecentGrowth ? 'Bonne' : 'Neutre']
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [performanceData[0]],
        body: performanceData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [254, 242, 242]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.3, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.2, halign: 'center' },
          2: { cellWidth: tableWidth * 0.2, halign: 'center' },
          3: { cellWidth: tableWidth * 0.2, halign: 'center' },
          
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Exit Analysis & Trends
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(185, 28, 28);
      doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('ANALYSE DES TENDANCES ET SORTIES', margin + 5, yPosition + 1);
      yPosition += 10;
      doc.setTextColor(0, 0, 0);

      const exitAnalysisData = [
        ['Metrique Sortie', 'Valeur', 'Impact'],
        ['Pourcentage de Sortie', `${statistics.exitPercentage}%`, statistics.exitPercentage > 20 ? 'Eleve' : statistics.exitPercentage > 10 ? 'Modere' : 'Faible'],
        ['Motif Principal', getMotifLabel(statistics.topExitReason), `${statistics.topExitReasonCount} cas`],
        ['Duree Moyenne Sejour', `${statistics.averageStayDuration} jours`],
        ['Nouveaux vs Sorties', `${statistics.recentArrivals} vs ${statistics.recentExits}`, statistics.recentArrivals >= statistics.recentExits ? 'Positive' : 'Negative']
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [exitAnalysisData[0]],
        body: exitAnalysisData.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: [185, 28, 28],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.35, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.35, halign: 'center' },
          2: { cellWidth: tableWidth * 0.3, halign: 'center' },
          
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      if (fermeId !== 'all' && reportFermes.length > 0) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFillColor(34, 139, 34);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('RESUME DE LA FERME', margin + 5, yPosition);
        yPosition += 15;
        doc.setTextColor(0, 0, 0);

        // Calculate metrics for the single ferme
        const ferme = reportFermes[0];
        const allFermeWorkers = allWorkers.filter(w => w.fermeId === ferme.id);
        const activeFermeWorkers = allFermeWorkers.filter(w => w.statut === 'actif');
        const exitedFermeWorkers = allFermeWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);

        const totalEntered = allFermeWorkers.length;
        const totalRemaining = activeFermeWorkers.length;
        const totalLeft = exitedFermeWorkers.length;
        const percentageRemaining = totalEntered > 0 ? Math.round((totalRemaining / totalEntered) * 100) : 0;

        const exitReasons = exitedFermeWorkers.reduce((acc, worker) => {
          const reason = worker.motif || 'none';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topExitReason = Object.entries(exitReasons)
          .sort(([,a], [,b]) => b - a)[0];

        const mostCommonReason = topExitReason ?
          `${getMotifLabel(topExitReason[0])} (${topExitReason[1]} cas)` :
          'Aucune sortie enregistrée';

        const singleFermeData = [
          ['Métrique', 'Valeur'],
          ['Total ouvriers entrés', totalEntered.toString()],
          ['Ouvriers restants (actifs)', totalRemaining.toString()],
          ['Ouvriers sortis', totalLeft.toString()],
          ['Pourcentage restants', `${percentageRemaining}%`],
          ['Motif principal de sortie', mostCommonReason]
        ];

        (doc as any).autoTable({
          startY: yPosition,
          head: [singleFermeData[0]],
          body: singleFermeData.slice(1),
          theme: 'grid',
          headStyles: {
            fillColor: [34, 139, 34],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' },
            1: { cellWidth: 60, halign: 'center' }
          },
          tableWidth: 'auto',
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      if (fermeId === 'all') {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = margin;
        }
        doc.setFillColor(34, 139, 34);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('RESUME GLOBAL', margin + 5, yPosition);
        yPosition += 15;
        doc.setTextColor(0, 0, 0);

        const scopeWorkers = baseWorkers;
        const activeScopeWorkers = scopeWorkers.filter(w => w.statut === 'actif');
        const exitedScopeWorkers = scopeWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);

        const totalEntered = scopeWorkers.length;
        const totalRemaining = activeScopeWorkers.length;
        const totalLeft = exitedScopeWorkers.length;
        const percentageRemaining = totalEntered > 0 ? Math.round((totalRemaining / totalEntered) * 100) : 0;

        const exitReasons = exitedScopeWorkers.reduce((acc, worker) => {
          const reason = worker.motif || 'none';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topExitReason = Object.entries(exitReasons)
          .sort(([,a], [,b]) => b - a)[0];

        const mostCommonReason = topExitReason ?
          `${getMotifLabel(topExitReason[0])} (${topExitReason[1]} cas)` :
          'Aucune sortie enregistrée';

        const globalData = [
          ['Métrique', 'Valeur'],
          ['Total ouvriers entrés', totalEntered.toString()],
          ['Ouvriers restants (actifs)', totalRemaining.toString()],
          ['Ouvriers sortis', totalLeft.toString()],
          ['Pourcentage restants', `${percentageRemaining}%`],
          ['Motif principal de sortie', mostCommonReason]
        ];

        (doc as any).autoTable({
          startY: yPosition,
          head: [globalData[0]],
          body: globalData.slice(1),
          theme: 'grid',
          headStyles: {
            fillColor: [34, 139, 34],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 50, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // START NEW PAGE FOR EXIT REASONS ANALYSIS
      doc.addPage();
      yPosition = margin;

      // Professional page header for Exit Reasons Analysis
      doc.setFillColor(220, 38, 127);
      doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
      doc.setFillColor(190, 24, 93);
      doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('ANALYSE DES MOTIFS DE SORTIE', pageWidth / 2, yPosition + 2, { align: 'center' });
      yPosition += 25;
      doc.setTextColor(0, 0, 0);

      // Add section description
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Cette section présente une analyse détaillée des motifs de sortie des ouvriers.', margin, yPosition + 5);
      yPosition += 20;

      // Calculate exit reasons for the filtered data
      const reportFilteredWorkers = fermeId === 'all'
        ? allWorkers
        : allWorkers.filter(w => w.fermeId === fermeId);

      const exitedWorkersForExit = reportFilteredWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);
      const exitReasonsForExit = exitedWorkersForExit.reduce((acc, worker) => {
        const reason = worker.motif || 'none';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalExitedForExit = exitedWorkersForExit.length;
      const exitReasonsTableData = [
        ['Motif de Sortie', 'Nombre de cas', 'Pourcentage', 'Statut'],
        ...Object.entries(exitReasonsForExit)
          .sort(([,a], [,b]) => b - a)
          .map(([reason, count]) => [
            getMotifLabel(reason),
            count.toString(),
            totalExitedForExit > 0 ? `${Math.round((count / totalExitedForExit) * 100)}%` : '0%',
            count > (totalExitedForExit * 0.2) ? 'Élevé' : count > (totalExitedForExit * 0.1) ? 'Moyen' : 'Faible'
          ])
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [exitReasonsTableData[0]],
        body: exitReasonsTableData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [220, 38, 127],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [252, 231, 243]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.4, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.2, halign: 'center' },
          2: { cellWidth: tableWidth * 0.2, halign: 'center' },
          3: { cellWidth: tableWidth * 0.2, halign: 'center' }
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      // START NEW PAGE FOR SUPERVISOR ANALYSIS
      doc.addPage();
      yPosition = margin;

      // Professional page header for Supervisor Analysis
      doc.setFillColor(147, 51, 234);
      doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
      doc.setFillColor(126, 34, 206);
      doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('ANALYSE DES SUPERVISEURS', pageWidth / 2, yPosition + 2, { align: 'center' });
      yPosition += 25;
      doc.setTextColor(0, 0, 0);

      // Add section description
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Cette section présente la répartition des ouvriers par superviseur et leurs performances.', margin, yPosition + 5);
      yPosition += 20;

      // Calculate supervisor statistics (robust to missing supervisors list)
      const activeWorkersForSupervisor = reportFilteredWorkers.filter(w => w.statut === 'actif');
      const groups: Record<string, number> = activeWorkersForSupervisor.reduce((acc, w) => {
        const key = w.supervisorId || 'none';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalActive = activeWorkersForSupervisor.length;
      const rows: string[][] = [];
      Object.entries(groups)
        .filter(([key]) => key !== 'none')
        .sort(([,a], [,b]) => Number(b) - Number(a))
        .forEach(([supId, count]) => {
          const sup = supervisors.find(s => s.id === supId);
          rows.push([
            sup?.nom || `Superviseur ${supId.substring(0, 6)}`,
            sup?.telephone || '-',
            String(count),
            totalActive > 0 ? `${Math.round((Number(count) / totalActive) * 100)}%` : '0%',
            Number(count) > 25 ? 'Excellent' : Number(count) > 10 ? 'Bon' : Number(count) > 5 ? 'Acceptable' :Number(count) > 0 ? 'Faible' : 'Inactif'
          ]);
        });

      const noSupCount = groups['none'] || 0;
      if (noSupCount > 0) {
        rows.push([
          'Sans superviseur',
          '-',
          String(noSupCount),
          totalActive > 0 ? `${Math.round((noSupCount / totalActive) * 100)}%` : '0%',
          'À assigner'
        ]);
      }

      const supervisorTableData = [
        ['Superviseur', 'Téléphone', 'Nombre d\'ouvriers', 'Pourcentage', 'Performance'],
        ...rows
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [supervisorTableData[0]],
        body: supervisorTableData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [147, 51, 234],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [243, 232, 255]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.25, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.2, halign: 'center' },
          2: { cellWidth: tableWidth * 0.2, halign: 'center' },
          3: { cellWidth: tableWidth * 0.15, halign: 'center' },
          4: { cellWidth: tableWidth * 0.2, halign: 'center' }
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      // COMPANY STATISTICS BY ENTREPRISE (same structure for all/single farm)
      {
        const companyStats = (() => {
          const stats: { [company: string]: { workers: number; activeSupervisors: number; farms: Set<string> } } = {};

          // Group workers by supervisor company using the report scope
          reportWorkers.forEach(worker => {
            if (worker.supervisorId) {
              const supervisor = supervisors.find(s => s.id === worker.supervisorId);
              if (supervisor?.company) {
                const company = supervisor.company;
                if (!stats[company]) {
                  stats[company] = { workers: 0, activeSupervisors: 0, farms: new Set() };
                }
                stats[company].workers++;
                stats[company].farms.add(worker.fermeId);
              }
            }
          });

          // Count active supervisors per company
          supervisors.filter(s => s.statut === 'actif' && s.company).forEach(supervisor => {
            const company = supervisor.company!;
            if (stats[company]) {
              stats[company].activeSupervisors++;
            } else {
              stats[company] = { workers: 0, activeSupervisors: 1, farms: new Set() };
            }
          });

          return stats;
        })();

        if (Object.keys(companyStats).length > 0) {
          // Always start a new page for Entreprise table
          doc.addPage();
          yPosition = margin;

          // Header
          doc.setFillColor(79, 70, 229);
          doc.rect(0, yPosition - 10, pageWidth, 20, 'F');
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('Statistiques par interime', pageWidth / 2, yPosition + 3, { align: 'center' });
          yPosition += 25;
          doc.setTextColor(0, 0, 0);

          const companyTableData: string[][] = [
            ['interime', 'Ouvriers', 'Superviseurs', 'Fermes']
          ];

          Object.entries(companyStats)
            .sort(([,a], [,b]) => b.workers - a.workers)
            .forEach(([company, stats]) => {
              companyTableData.push([
                company,
                stats.workers.toString(),
                stats.activeSupervisors.toString(),
                stats.farms.size.toString()
              ]);
            });

          (doc as any).autoTable({
            startY: yPosition,
            head: [companyTableData[0]],
            body: companyTableData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 11, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5, overflow: 'linebreak', cellWidth: 'wrap' },
            alternateRowStyles: { fillColor: [224, 231, 255] },
            columnStyles: {
              0: { cellWidth: tableWidth * 0.4, fontStyle: 'bold' },
              1: { cellWidth: tableWidth * 0.2, halign: 'center' },
              2: { cellWidth: tableWidth * 0.2, halign: 'center' },
              3: { cellWidth: tableWidth * 0.2, halign: 'center' }
            },
            tableWidth: 'auto',
            margin: { left: margin, right: margin }
          });

          yPosition = (doc as any).lastAutoTable.finalY + 20;
        }
      }

      // ADD FARM COMPARISON TABLE AT THE END (only for 'all' reports)
      // ADD FARM COMPARISON TABLE AT THE END (only for 'all' reports)
      if (fermeId === 'all') {
        doc.addPage();
        yPosition = margin;

        // Professional page header for Farm Comparison
        doc.setFillColor(34, 139, 34);
        doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
        doc.setFillColor(22, 101, 52);
        doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('COMPARAISON DÉTAILLÉE DES FERMES', pageWidth / 2, yPosition + 2, { align: 'center' });
        yPosition += 25;
        doc.setTextColor(0, 0, 0);

        // Add section description
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Cette section présente une comparaison exhaustive entre toutes les fermes.', margin, yPosition + 5);
        yPosition += 20;

        // Calculate comprehensive metrics for each ferme
        const farmComparisonData = reportFermes.map(ferme => {
          const allFermeWorkers = allWorkers.filter(w => w.fermeId === ferme.id);
          const activeFermeWorkers = allFermeWorkers.filter(w => w.statut === 'actif');
          const exitedFermeWorkers = allFermeWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);

          // Calculate workers who entered (all workers ever associated with this ferme)
          const totalEntered = allFermeWorkers.length;

          // Workers remaining (active workers)
          const totalRemaining = activeFermeWorkers.length;

          // Workers who left
          const totalLeft = exitedFermeWorkers.length;

          // Percentage remaining
          const percentageRemaining = totalEntered > 0 ? Math.round((totalRemaining / totalEntered) * 100) : 0;

          // Percentage of workers who left and did not return
          const percentageLeft = totalEntered > 0 ? Math.round((totalLeft / totalEntered) * 100) : 0;

          // Most common exit reason for this ferme
          const exitReasons = exitedFermeWorkers.reduce((acc, worker) => {
            const reason = worker.motif || 'none';
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const topExitReason = Object.entries(exitReasons)
            .sort(([,a], [,b]) => b - a)[0];

          const mostCommonReason = topExitReason ?
            `${getMotifLabel(topExitReason[0])} (${topExitReason[1]})` :
            'Aucune sortie';

          return [
            ferme.nom,
            totalEntered.toString(),
            totalRemaining.toString(),
            totalLeft.toString(),
            `${percentageRemaining}%`,
            `${percentageLeft}%`,
            mostCommonReason
          ];
        });

        const comparisonTableData = [
          ['Ferme', 'Total Entrés', 'Restants', 'Sortis', '% Restants', '% Sortis', 'Motif Principal Sortie'],
          ...farmComparisonData
        ];

  
        (doc as any).autoTable({
          startY: yPosition,
          head: [comparisonTableData[0]],
          body: comparisonTableData.slice(1),
          theme: 'striped',
          headStyles: {
            fillColor: [34, 139, 34],
            textColor: 255,
            fontSize: 11,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          alternateRowStyles: {
            fillColor: [240, 255, 240]
          },
          columnStyles: {
            0: { cellWidth: tableWidth * 0.15, fontStyle: 'bold' },
            1: { cellWidth: tableWidth * 0.12, halign: 'center' },
            2: { cellWidth: tableWidth * 0.12, halign: 'center' },
            3: { cellWidth: tableWidth * 0.12, halign: 'center' },
            4: { cellWidth: tableWidth * 0.12, halign: 'center' },
            5: { cellWidth: tableWidth * 0.12, halign: 'center' },
            6: { cellWidth: tableWidth * 0.25 }
          },
          tableWidth: 'auto',
          margin: { left: margin, right: margin }
        });
      }

      // PER-FARM DETAILED SECTIONS FOR 'ALL' REPORTS (disabled)
      if (false) {
        for (const ferme of reportFermes) {
          doc.addPage();
          yPosition = margin;

          // Section header for this farm
          doc.setFillColor(34, 139, 34);
          doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
          doc.setFillColor(22, 101, 52);
          doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(`RESUME DETAILLE - ${ferme.nom}`, pageWidth / 2, yPosition + 2, { align: 'center' });
          yPosition += 25;
          doc.setTextColor(0, 0, 0);

          // Compute farm-specific metrics
          const allFermeWorkers = allWorkers.filter(w => w.fermeId === ferme.id);
          const activeFermeWorkers = allFermeWorkers.filter(w => w.statut === 'actif');
          const exitedFermeWorkers = allFermeWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);

          const totalEntered = allFermeWorkers.length;
          const totalRemaining = activeFermeWorkers.length;
          const totalLeft = exitedFermeWorkers.length;
          const percentageRemaining = totalEntered > 0 ? Math.round((totalRemaining / totalEntered) * 100) : 0;
          const percentageLeft = totalEntered > 0 ? Math.round((totalLeft / totalEntered) * 100) : 0;

          const farmExitReasons = exitedFermeWorkers.reduce((acc, worker) => {
            const reason = worker.motif || 'none';
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const farmTopExitReason = Object.entries(farmExitReasons).sort(([,a], [,b]) => b - a)[0];
          const farmMostCommonReason = farmTopExitReason ? `${getMotifLabel(farmTopExitReason[0])} (${farmTopExitReason[1]} cas)` : 'Aucune sortie enregistree';

          // Per-farm summary table
          const farmSummaryData = [
            ['Métrique', 'Valeur'],
            ['Total ouvriers entrés', totalEntered.toString()],
            ['Ouvriers restants (actifs)', totalRemaining.toString()],
            ['Ouvriers sortis', totalLeft.toString()],
            ['% Restants', `${percentageRemaining}%`],
            ['% Sortis', `${percentageLeft}%`],
            ['Motif principal de sortie', farmMostCommonReason]
          ];

          (doc as any).autoTable({
            startY: yPosition,
            head: [farmSummaryData[0]],
            body: farmSummaryData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [34, 139, 34], textColor: 255, fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: { 0: { cellWidth: tableWidth * 0.45, fontStyle: 'bold' }, 1: { cellWidth: tableWidth * 0.55 } },
            margin: { left: margin, right: margin }
          });
          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Occupation & Housing for this farm
          if (yPosition > pageHeight - 100) { doc.addPage(); yPosition = margin; }
          doc.setFillColor(34, 197, 94);
          doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('OCCUPATION & LOGEMENT (Ferme)', margin + 5, yPosition);
          yPosition += 15; doc.setTextColor(0, 0, 0);

          const farmRooms = allRooms.filter(r => r.fermeId === ferme.id);
          const farmTotalRooms = farmRooms.length;
          const farmOccupiedRooms = farmRooms.filter(r => r.occupantsActuels > 0).length;
          const farmEmptyRooms = farmRooms.filter(r => r.occupantsActuels === 0).length;
          const farmFullRooms = farmRooms.filter(r => r.occupantsActuels >= r.capaciteTotale).length;
          const farmTotalCapacity = farmRooms.reduce((s, r) => s + r.capaciteTotale, 0);
          const farmOccupiedPlaces = farmRooms.reduce((s, r) => s + r.occupantsActuels, 0);
          const farmAvailablePlaces = Math.max(0, farmTotalCapacity - farmOccupiedPlaces);
          const farmUtilizationRate = farmTotalCapacity > 0 ? Math.round((farmOccupiedPlaces / farmTotalCapacity) * 100) : 0;

          const farmOccupationData = [
            ['Métrique Occupation', 'Valeur', 'Capacité/Total', 'Taux'],
            ['Chambres Totales', farmTotalRooms.toString(), farmTotalRooms.toString(), '100%'],
            ['Chambres Occupées', farmOccupiedRooms.toString(), farmTotalRooms.toString(), `${farmTotalRooms > 0 ? Math.round((farmOccupiedRooms / farmTotalRooms) * 100) : 0}%`],
            ['Chambres Vides', farmEmptyRooms.toString(), farmTotalRooms.toString(), `${farmTotalRooms > 0 ? Math.round((farmEmptyRooms / farmTotalRooms) * 100) : 0}%`],
            ['Chambres Pleines', farmFullRooms.toString(), farmTotalRooms.toString(), `${farmTotalRooms > 0 ? Math.round((farmFullRooms / farmTotalRooms) * 100) : 0}%`],
            ['Places Occupées', farmOccupiedPlaces.toString(), farmTotalCapacity.toString(), `${farmTotalCapacity > 0 ? Math.round((farmOccupiedPlaces / farmTotalCapacity) * 100) : 0}%`],
            ['Places Disponibles', farmAvailablePlaces.toString(), farmTotalCapacity.toString(), `${farmTotalCapacity > 0 ? Math.round((farmAvailablePlaces / farmTotalCapacity) * 100) : 0}%`],
            ['Taux d\'Utilisation', `${farmUtilizationRate}%`, '-', '-']
          ];

          (doc as any).autoTable({
            startY: yPosition,
            head: [farmOccupationData[0]],
            body: farmOccupationData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: { 0: { cellWidth: tableWidth * 0.35 }, 1: { cellWidth: tableWidth * 0.15, halign: 'center' }, 2: { cellWidth: tableWidth * 0.25, halign: 'center' }, 3: { cellWidth: tableWidth * 0.25, halign: 'center' } },
            tableWidth: 'auto',
            margin: { left: margin, right: margin }
          });
          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Exit reasons for this farm
          if (yPosition > pageHeight - 100) { doc.addPage(); yPosition = margin; }
          doc.setFillColor(239, 68, 68);
          doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('MOTIFS DE SORTIE (Ferme)', margin + 5, yPosition);
          yPosition += 15; doc.setTextColor(0, 0, 0);

          const farmExitTable = [
            ['Motif', 'Nombre', 'Pourcentage', 'Statut'],
            ...Object.entries(farmExitReasons)
              .sort(([,a], [,b]) => b - a)
              .map(([reason, count]) => [
                getMotifLabel(reason),
                count.toString(),
                totalLeft > 0 ? `${Math.round((count / totalLeft) * 100)}%` : '0%',
                count > (totalLeft * 0.2) ? 'Fréquent' : count > (totalLeft * 0.1) ? 'Occasionnel' : 'Rare'
              ])
          ];

          (doc as any).autoTable({
            startY: yPosition,
            head: [farmExitTable[0]],
            body: farmExitTable.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: { 0: { cellWidth: tableWidth * 0.4 }, 1: { cellWidth: tableWidth * 0.15, halign: 'center' }, 2: { cellWidth: tableWidth * 0.2, halign: 'center' }, 3: { cellWidth: tableWidth * 0.25, halign: 'center' } },
            tableWidth: 'auto',
            margin: { left: margin, right: margin }
          });
          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Supervisors for this farm
          if (yPosition > pageHeight - 100) { doc.addPage(); yPosition = margin; }
          doc.setFillColor(147, 51, 234);
          doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('SUPERVISEURS (Ferme)', margin + 5, yPosition);
          yPosition += 15; doc.setTextColor(0, 0, 0);

          const activeWorkersForFarm = activeFermeWorkers;
          const supervisorStatsForFarm = supervisors.map(supervisor => {
            const count = activeWorkersForFarm.filter(w => w.supervisorId === supervisor.id).length;
            return { supervisor, workerCount: count };
          }).filter(s => s.workerCount > 0).sort((a, b) => b.workerCount - a.workerCount);
          const farmWorkersWithoutSupervisor = activeWorkersForFarm.filter(w => !w.supervisorId);

          const supervisorFarmTable = [
            ['Superviseur', 'Téléphone', 'Ouvriers', 'Pourcentage'],
            ...supervisorStatsForFarm.map(({ supervisor, workerCount }) => [
              supervisor.nom,
              supervisor.telephone,
              workerCount.toString(),
              activeWorkersForFarm.length > 0 ? `${Math.round((workerCount / activeWorkersForFarm.length) * 100)}%` : '0%'
            ])
          ];
          if (farmWorkersWithoutSupervisor.length > 0) {
            supervisorFarmTable.push([
              'Sans superviseur',
              '-',
              farmWorkersWithoutSupervisor.length.toString(),
              activeWorkersForFarm.length > 0 ? `${Math.round((farmWorkersWithoutSupervisor.length / activeWorkersForFarm.length) * 100)}%` : '0%'
            ]);
          }

          (doc as any).autoTable({
            startY: yPosition,
            head: [supervisorFarmTable[0]],
            body: supervisorFarmTable.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [147, 51, 234], textColor: 255, fontSize: 11, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            alternateRowStyles: { fillColor: [243, 232, 255] },
            columnStyles: { 0: { cellWidth: tableWidth * 0.35, fontStyle: 'bold' }, 1: { cellWidth: tableWidth * 0.25, halign: 'center' }, 2: { cellWidth: tableWidth * 0.2, halign: 'center' }, 3: { cellWidth: tableWidth * 0.2, halign: 'center' } },
            tableWidth: 'auto',
            margin: { left: margin, right: margin }
          });
        }
      }

      // Professional Footer with enhanced design
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer background
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(0, pageHeight - 20, pageWidth, pageHeight - 20);

        // Footer content
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);

        // Left side - System name
        doc.text('Systeme de Gestion des Fermes', margin, pageHeight - 10);

        // Center - Generation date
        doc.text(
          `Rapport genere le ${new Date().toLocaleDateString('fr-FR')}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );

        // Right side - Page number
        doc.text(`Page ${i}/${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

        // Footer decoration line
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(1);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      }

      return doc;
    } catch (error) {
      console.error('Error generating advanced PDF report:', error);
      // Fallback to basic PDF generation
      return await generateBasicPDFReport(fermeId);
    }
  };

  // Fallback basic PDF generation
  const generateBasicPDFReport = async (fermeId: string | 'all' = 'all') => {
    // Load logo first
    const logoDataUrl = await loadLogoForPDF();

    async function loadLogoForPDF(): Promise<string | null> {
      return new Promise((resolve) => {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 120;
            canvas.height = 30;

            // Draw white background
            ctx!.fillStyle = 'white';
            ctx!.fillRect(0, 0, canvas.width, canvas.height);

            // Draw logo
            ctx!.drawImage(logoImg, 5, 5, 110, 20);
            resolve(canvas.toDataURL('image/png'));
          } catch (error) {
            console.log('Error processing logo:', error);
            resolve(null);
          }
        };
        logoImg.onerror = () => resolve(null);
        logoImg.src = 'https://cdn.builder.io/api/v1/image/assets%2F54187f8fd2324ab0baf205c15c42f7d5%2F58ff0b28018a4660a6f30e69fd206000?format=webp&width=800';
      });
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const tableWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Filter data based on ferme
    const reportFermes = fermeId === 'all' ? fermes : fermes.filter(f => f.id === fermeId);
    const reportTitle = fermeId === 'all' ? 'Rapport Statistique Complet' : `Rapport Statistique - ${reportFermes[0]?.nom || 'Ferme'}`;

    // Header with logo
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', margin, yPosition - 5, 25, 6);
    }

    // Company name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('AromaHerbes', margin + 30, yPosition);

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, pageWidth / 2, yPosition + 10, { align: 'center' });
    yPosition += 25;

    // Date and filters
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Généré le ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (timeRange !== 'month' || selectedMonth || selectedYear) {
      let filterText = 'Période: ';
      if (timeRange === 'specific_month' && selectedMonth && selectedYear) {
        filterText += `${getMonthName(selectedMonth)} ${selectedYear}`;
      } else if (timeRange === 'specific_year' && selectedYear) {
        filterText += selectedYear;
      } else {
        filterText += {
          'week': '7 derniers jours',
          'month': '30 derniers jours',
          'quarter': '3 derniers mois',
          'year': 'Dernière année'
        }[timeRange] || '30 derniers jours';
      }
      doc.text(filterText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    } else {
      yPosition += 10;
    }

    // Executive Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé Exécutif', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryText = [
      `• ${statistics.totalWorkers} ouvriers actifs dans le système`,
      `• Taux d'occupation: ${statistics.occupancyRate}% (${statistics.occupiedPlaces}/${statistics.totalCapacity} places)`,
      `• ${statistics.availablePlaces} places disponibles`,
      `• Âge moyen des ouvriers: ${statistics.averageAge} ans`,
      `• Taux de rétention: ${statistics.retentionRate}%`,
      `• ${statistics.recentArrivals} nouveaux arrivants et ${statistics.recentExits} sorties`,
      `• Motif de sortie principal: ${getMotifLabel(statistics.topExitReason)} (${statistics.topExitReasonCount} cas)`
    ];

    summaryText.forEach(text => {
      doc.text(text, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // KPI Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicateurs Clés de Performance', margin, yPosition);
    yPosition += 10;

    const kpiData = [
      ['Indicateur', 'Valeur', 'Statut'],
      ['Ouvriers Actifs', statistics.totalWorkers.toString(), statistics.totalWorkers > 0 ? 'Actif' : 'Inactif'],
      ['Taux d\'Occupation', `${statistics.occupancyRate}%`, statistics.isHighOccupancy ? 'Élevé' : statistics.isLowOccupancy ? 'Faible' : 'Optimal'],
      ['Nouveaux Arrivants', statistics.recentArrivals.toString(), statistics.hasRecentGrowth ? 'Croissance' : 'Stable'],
      ['Sorties', statistics.recentExits.toString(), statistics.recentExits > statistics.recentArrivals ? 'Élevé' : 'Normal'],
      ['Taux de Rétention', `${statistics.retentionRate}%`, statistics.retentionRate > 85 ? 'Excellent' : statistics.retentionRate > 70 ? 'Bon' : 'À améliorer'],
      ['Durée Moyenne de Séjour', `${statistics.averageStayDuration} jours`, statistics.averageStayDuration > 30 ? 'Long' : 'Court']
    ];

    (doc as any).autoTable({
      startY: yPosition,
      head: [kpiData[0]],
      body: kpiData.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.4, fontStyle: 'bold' },
        1: { cellWidth: tableWidth * 0.3, halign: 'center' },
        2: { cellWidth: tableWidth * 0.3, halign: 'center' }
      },
      tableWidth: 'auto',
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Demographics Section
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Démographie', margin, yPosition);
    yPosition += 10;

    // Gender Distribution
    const genderData = [
      ['Genre', 'Nombre', 'Pourcentage'],
      ['Hommes', statistics.maleWorkers.toString(), `${statistics.totalWorkers > 0 ? Math.round((statistics.maleWorkers / statistics.totalWorkers) * 100) : 0}%`],
      ['Femmes', statistics.femaleWorkers.toString(), `${statistics.totalWorkers > 0 ? Math.round((statistics.femaleWorkers / statistics.totalWorkers) * 100) : 0}%`]
    ];

    (doc as any).autoTable({
      startY: yPosition,
      head: [genderData[0]],
      body: genderData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [139, 69, 19], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Age Distribution
    const ageData = [
      ['Tranche d\'âge', 'Nombre', 'Pourcentage'],
      ...Object.entries(statistics.ageDistribution).map(([range, count]) => [
        `${range} ans`,
        count.toString(),
        `${statistics.totalWorkers > 0 ? Math.round((count / statistics.totalWorkers) * 100) : 0}%`
      ])
    ];

    (doc as any).autoTable({
      startY: yPosition,
      head: [ageData[0]],
      body: ageData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [139, 69, 19], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Occupancy Analysis
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Analyse d\'Occupation', margin, yPosition);
    yPosition += 10;

    const occupancyData = [
      ['Métrique', 'Valeur'],
      ['Chambres Totales', statistics.totalRooms.toString()],
      ['Chambres Occupées', statistics.occupiedRooms.toString()],
      ['Chambres Vides', statistics.emptyRooms.toString()],
      ['Chambres Pleines', statistics.fullRooms.toString()],
      ['Capacité Totale', statistics.totalCapacity.toString()],
      ['Places Occupées', statistics.occupiedPlaces.toString()],
      ['Places Disponibles', statistics.availablePlaces.toString()],
      ['Taux d\'Utilisation', `${statistics.utilizationRate}%`]
    ];

    (doc as any).autoTable({
      startY: yPosition,
      head: [occupancyData[0]],
      body: occupancyData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Exit Analysis
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Analyse des Sorties', margin, yPosition);
    yPosition += 10;

    // Enhanced Exit Analysis with percentage calculation
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pourcentage de sortie global: ${statistics.exitPercentage}%`, margin, yPosition);
    yPosition += 7;
    doc.text(`Impact: ${statistics.exitPercentage > 20 ? 'Élevé - Action requise' : statistics.exitPercentage > 10 ? 'Modéré - Surveillance' : 'Faible - Normal'}`, margin, yPosition);
    yPosition += 10;

    const exitData = [
      ['Motif de Sortie', 'Nombre', 'Pourcentage'],
      ...Object.entries(statistics.exitReasons)
        .sort(([,a], [,b]) => b - a)
        .map(([reason, count]) => [
          getMotifLabel(reason),
          count.toString(),
          `${statistics.totalExitedWorkers > 0 ? Math.round((count / statistics.totalExitedWorkers) * 100) : 0}%`
        ])
    ];

    if (exitData.length > 1) {
      (doc as any).autoTable({
        startY: yPosition,
        head: [exitData[0]],
        body: exitData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Aucune sortie enregistrée pour la période sélectionnée.', margin, yPosition);
    }

    // Move farm comparison to the end - this will be handled later

    // Add summary table for single ferme reports as well (basic PDF)
    if (fermeId !== 'all') {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFillColor(34, 139, 34);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('RESUME DE LA FERME', margin + 5, yPosition);
      yPosition += 15;
      doc.setTextColor(0, 0, 0);

      // Calculate metrics for the single ferme
      const reportFermes = fermeId === 'all' ? fermes : fermes.filter(f => f.id === fermeId);
      if (reportFermes.length > 0) {
        const ferme = reportFermes[0];
        const allFermeWorkers = allWorkers.filter(w => w.fermeId === ferme.id);
        const activeFermeWorkers = allFermeWorkers.filter(w => w.statut === 'actif');
        const exitedFermeWorkers = allFermeWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);

        const totalEntered = allFermeWorkers.length;
        const totalRemaining = activeFermeWorkers.length;
        const totalLeft = exitedFermeWorkers.length;
        const percentageRemaining = totalEntered > 0 ? Math.round((totalRemaining / totalEntered) * 100) : 0;

        const exitReasons = exitedFermeWorkers.reduce((acc, worker) => {
          const reason = worker.motif || 'none';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topExitReason = Object.entries(exitReasons)
          .sort(([,a], [,b]) => b - a)[0];

        const mostCommonReason = topExitReason ?
          `${getMotifLabel(topExitReason[0])} (${topExitReason[1]} cas)` :
          'Aucune sortie enregistrée';

        const singleFermeData = [
          ['Métrique', 'Valeur'],
          ['Total ouvriers entrés', totalEntered.toString()],
          ['Ouvriers restants (actifs)', totalRemaining.toString()],
          ['Ouvriers sortis', totalLeft.toString()],
          ['Pourcentage restants', `${percentageRemaining}%`],
          ['Motif principal de sortie', mostCommonReason]
        ];

        (doc as any).autoTable({
          startY: yPosition,
          head: [singleFermeData[0]],
          body: singleFermeData.slice(1),
          theme: 'grid',
          headStyles: {
            fillColor: [34, 139, 34],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' },
            1: { cellWidth: 60, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });
      }
    }

    // START NEW PAGE FOR SUPERVISOR ANALYSIS (Basic PDF)
    doc.addPage();
    yPosition = margin;

    // Professional page header for Supervisor Analysis
    doc.setFillColor(147, 51, 234);
    doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
    doc.setFillColor(126, 34, 206);
    doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ANALYSE DES SUPERVISEURS', pageWidth / 2, yPosition + 2, { align: 'center' });
    yPosition += 25;
    doc.setTextColor(0, 0, 0);

    // Add section description
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Cette section présente la répartition des ouvriers par superviseur et leurs performances.', margin, yPosition + 5);
    yPosition += 20;

    // Calculate supervisor statistics for basic PDF
    const filteredWorkers = fermeId === 'all'
      ? allWorkers
      : allWorkers.filter(w => w.fermeId === fermeId);

    const activeWorkers = filteredWorkers.filter(w => w.statut === 'actif');
    const groups: Record<string, number> = activeWorkers.reduce((acc, w) => {
      const key = w.supervisorId || 'none';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalActive = activeWorkers.length;
    const rows: string[][] = [];
    Object.entries(groups)
      .filter(([key]) => key !== 'none')
      .sort(([,a], [,b]) => Number(b) - Number(a))
      .forEach(([supId, count]) => {
        const sup = supervisors.find(s => s.id === supId);
        rows.push([
          sup?.nom || `Superviseur ${supId.substring(0, 6)}`,
          sup?.telephone || '-',
          String(count),
          totalActive > 0 ? `${Math.round((Number(count) / totalActive) * 100)}%` : '0%'
        ]);
      });

    const noSupCount = groups['none'] || 0;
    if (noSupCount > 0) {
      rows.push([
        'Sans superviseur',
        '-',
        String(noSupCount),
        totalActive > 0 ? `${Math.round((noSupCount / totalActive) * 100)}%` : '0%'
      ]);
    }

    const supervisorTableData = [
      ['Superviseur', 'Téléphone', 'Nombre d\'ouvriers', 'Pourcentage'],
      ...rows
    ];

    if (supervisorTableData.length > 1) {

      (doc as any).autoTable({
        startY: yPosition,
        head: [supervisorTableData[0]],
        body: supervisorTableData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [147, 51, 234],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [243, 232, 255]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.35, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.25, halign: 'center' },
          2: { cellWidth: tableWidth * 0.2, halign: 'center' },
          3: { cellWidth: tableWidth * 0.2, halign: 'center' }
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Aucun superviseur assigné pour la période sélectionnée.', margin, yPosition);
    }

    // ADD COMPANY STATISTICS TABLE
    const companyStats = (() => {
      const stats: { [company: string]: { workers: number; activeSupervisors: number; farms: Set<string> } } = {};

      // Group workers by supervisor company
      workers.forEach(worker => {
        if (worker.supervisorId) {
          const supervisor = supervisors.find(s => s.id === worker.supervisorId);
          if (supervisor?.company) {
            const company = supervisor.company;
            if (!stats[company]) {
              stats[company] = { workers: 0, activeSupervisors: 0, farms: new Set() };
            }
            stats[company].workers++;
            stats[company].farms.add(worker.fermeId);
          }
        }
      });

      // Count active supervisors per company
      supervisors.filter(s => s.statut === 'actif' && s.company).forEach(supervisor => {
        const company = supervisor.company!;
        if (stats[company]) {
          stats[company].activeSupervisors++;
        } else {
          stats[company] = { workers: 0, activeSupervisors: 1, farms: new Set() };
        }
      });

      return stats;
    })();

    if (Object.keys(companyStats).length > 0) {
      // Always start a new page for Entreprise table
      doc.addPage();
      yPosition = margin;

      // Company Statistics Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, yPosition - 10, pageWidth, 20, 'F');

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Statistiques par interime', pageWidth / 2, yPosition + 3, { align: 'center' });
      yPosition += 25;

      // Reset text color
      doc.setTextColor(0, 0, 0);

      const companyTableData = [
        ['interime', 'Ouvriers', 'Superviseurs', 'Fermes']
      ];

      Object.entries(companyStats)
        .sort(([,a], [,b]) => b.workers - a.workers)
        .forEach(([company, stats]) => {
          companyTableData.push([
            company,
            stats.workers.toString(),
            stats.activeSupervisors.toString(),
            stats.farms.size.toString()
          ]);
        });

      (doc as any).autoTable({
        startY: yPosition,
        head: [companyTableData[0]],
        body: companyTableData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [224, 231, 255]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.4, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.2, halign: 'center' },
          2: { cellWidth: tableWidth * 0.2, halign: 'center' },
          3: { cellWidth: tableWidth * 0.2, halign: 'center' }
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // ADD FARM COMPARISON TABLE AT THE END (Basic PDF - disabled)
    if (false) {
      doc.addPage();
      yPosition = margin;

      // Professional page header for Farm Comparison
      doc.setFillColor(34, 139, 34);
      doc.rect(0, yPosition - 10, pageWidth, 25, 'F');
      doc.setFillColor(22, 101, 52);
      doc.rect(0, yPosition - 10, pageWidth, 15, 'F');

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('COMPARAISON DÉTAILLÉE DES FERMES', pageWidth / 2, yPosition + 2, { align: 'center' });
      yPosition += 25;
      doc.setTextColor(0, 0, 0);

      // Add section description
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Cette section présente une comparaison exhaustive entre toutes les fermes du système.', margin, yPosition + 5);
      yPosition += 20;

      // Calculate comprehensive metrics for each ferme
      const farmComparisonData = reportFermes.map(ferme => {
        const allFermeWorkers = allWorkers.filter(w => w.fermeId === ferme.id);
        const activeFermeWorkers = allFermeWorkers.filter(w => w.statut === 'actif');
        const exitedFermeWorkers = allFermeWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);

        // Calculate workers who entered (all workers ever associated with this ferme)
        const totalEntered = allFermeWorkers.length;

        // Workers remaining (active workers)
        const totalRemaining = activeFermeWorkers.length;

        // Workers who left
        const totalLeft = exitedFermeWorkers.length;

        // Percentage remaining
        const percentageRemaining = totalEntered > 0 ? Math.round((totalRemaining / totalEntered) * 100) : 0;

        // Percentage of workers who left and did not return
        const percentageLeft = totalEntered > 0 ? Math.round((totalLeft / totalEntered) * 100) : 0;

        // Most common exit reason for this ferme
        const exitReasons = exitedFermeWorkers.reduce((acc, worker) => {
          const reason = worker.motif || 'none';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topExitReason = Object.entries(exitReasons)
          .sort(([,a], [,b]) => b - a)[0];

        const mostCommonReason = topExitReason ?
          `${getMotifLabel(topExitReason[0])} (${topExitReason[1]})` :
          'Aucune sortie';

        return [
          ferme.nom,
          totalEntered.toString(),
          totalRemaining.toString(),
          totalLeft.toString(),
          `${percentageRemaining}%`,
          `${percentageLeft}%`,
          mostCommonReason
        ];
      });

      const comparisonTableData = [
        ['Ferme', 'Total Entrés', 'Restants', 'Sortis', '% Restants', '% Sortis', 'Motif Principal Sortie'],
        ...farmComparisonData
      ];


      (doc as any).autoTable({
        startY: yPosition,
        head: [comparisonTableData[0]],
        body: comparisonTableData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [34, 139, 34],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [240, 255, 240]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.15, fontStyle: 'bold' },
          1: { cellWidth: tableWidth * 0.12, halign: 'center' },
          2: { cellWidth: tableWidth * 0.12, halign: 'center' },
          3: { cellWidth: tableWidth * 0.12, halign: 'center' },
          4: { cellWidth: tableWidth * 0.12, halign: 'center' },
          5: { cellWidth: tableWidth * 0.12, halign: 'center' },
          6: { cellWidth: tableWidth * 0.25 }
        },
        tableWidth: 'auto',
        margin: { left: margin, right: margin }
      });
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      doc.text('Rapport généré par le Système de Gestion des Ouvriers', margin, pageHeight - 10);
    }

    return doc;
  };

  // Handle export options
  const handleExport = async () => {
    if (isUser && !hasAllFarmsAccess) {
      // Regular users can only generate PDF for their ferme
      try {
        const doc = await generateAdvancedPDFReport(user?.fermeId || '');
        const fermeName = user?.fermeId ? fermes.find(f => f.id === user.fermeId)?.nom || 'ferme' : 'ferme';
        const fileName = `rapport_${fermeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      } catch (error) {
        console.error('Error generating user report:', error);
        // Fallback to basic PDF generation
        const doc = await generateBasicPDFReport(user?.fermeId || '');
        const fermeName = user?.fermeId ? fermes.find(f => f.id === user.fermeId)?.nom || 'ferme' : 'ferme';
        const fileName = `rapport_${fermeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      }
    } else if (isSuperAdmin || hasAllFarmsAccess) {
      // Show export options for super admin and users with all farms access
      setShowExportOptions(true);
    } else {
      // Admin users - generate PDF for current ferme only
      try {
        const doc = await generateAdvancedPDFReport(user?.fermeId || '');
        const fermeName = user?.fermeId ? fermes.find(f => f.id === user.fermeId)?.nom || 'ferme' : 'ferme';
        const fileName = `rapport_avance_${fermeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      } catch (error) {
        console.error('Error generating administrator report:', error);
        // Fallback to basic PDF generation
        const doc = await generateBasicPDFReport(user?.fermeId || '');
        const fermeName = user?.fermeId ? fermes.find(f => f.id === user.fermeId)?.nom || 'ferme' : 'ferme';
        const fileName = `rapport_statistiques_${fermeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      }
    }
  };

  const [showExportOptions, setShowExportOptions] = useState(false);

  const handleComprehensiveExport = async () => {
    try {
      const doc = await generateAdvancedPDFReport('all');
      const fileName = `rapport_avance_complet_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      setShowExportOptions(false);
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      // Fallback to basic report
      const doc = await generateBasicPDFReport('all');
      const fileName = `rapport_statistiques_complet_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      setShowExportOptions(false);
    }
  };

  const handleFermeExport = async (fermeId: string) => {
    try {
      const doc = await generateAdvancedPDFReport(fermeId);
      const fermeName = fermes.find(f => f.id === fermeId)?.nom || 'ferme';
      const fileName = `rapport_avance_${fermeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      setShowExportOptions(false);
    } catch (error) {
      console.error('Error generating ferme report:', error);
      // Fallback to basic report
      const doc = await generateBasicPDFReport(fermeId);
      const fermeName = fermes.find(f => f.id === fermeId)?.nom || 'ferme';
      const fileName = `rapport_statistiques_${fermeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      setShowExportOptions(false);
    }
  };

  // Utility function for trend display
  const TrendIndicator = ({ value, isPositive }: { value: number; isPositive: boolean }) => (
    <div className={`inline-flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
      isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    }`}>
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );

  // Modern Metric Card Component
  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend,
    className = ""
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    trend?: { value: number; isPositive: boolean };
    className?: string;
  }) => (
    <Card className={`relative overflow-hidden border-0 bg-white shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg">
              <Icon className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{title}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
          {trend && <TrendIndicator value={trend.value} isPositive={trend.isPositive} />}
        </div>
        <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
      </CardContent>
    </Card>
  );

  // Main KPI Card with better visual hierarchy
  const KPICard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    trend,
    onClick
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    trend?: { value: number; isPositive: boolean };
    onClick?: () => void;
  }) => {
    const colorClasses = {
      blue: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      purple: 'bg-gradient-to-br from-purple-500 to-violet-600',
      amber: 'bg-gradient-to-br from-amber-500 to-orange-600',
      rose: 'bg-gradient-to-br from-rose-500 to-pink-600',
      cyan: 'bg-gradient-to-br from-cyan-500 to-blue-600'
    };

    return (
      <Card
        className={`relative overflow-hidden border-0 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} text-white shadow-lg hover:shadow-xl transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Icon className="h-6 w-6" />
            </div>
            {trend && (
              <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
                trend.isPositive ? 'bg-white/20 text-white' : 'bg-white/20 text-white'
              }`}>
                {trend.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                <span>{Math.abs(trend.value).toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">{title}</h3>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-white/70">{subtitle}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Check for network errors
  const networkError = fermesError || workersError || roomsError;
  const hasNetworkError = networkError && (
    networkError.includes('fetch') ||
    networkError.includes('Failed to fetch') ||
    networkError.includes('TypeError') ||
    networkError.includes('Erreur de réseau') ||
    networkError.includes('network') ||
    networkError.includes('connexion') ||
    networkError.includes('🌐')
  );

  const handleRetry = () => {
    console.log('🔄 User initiated retry - attempting to reconnect to Firebase...');
    console.log('Current errors:', { fermesError, workersError, roomsError });
    refetchFermes();
    refetchWorkers();
    refetchRooms();
  };

  const handleSyncRoomOccupancy = async () => {
    setSyncLoading(true);
    setSyncResult(null);

    try {
      const result = await forceSyncRoomOccupancy(allWorkers, allRooms);
      setSyncResult(result);

      // Refresh data after sync
      refetchWorkers();
      refetchRooms();

      console.log('✅ Sync completed, refreshing data...');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  // Function to generate Excel file for supervisor
  const generateSupervisorExcel = (supervisorId: string) => {
    const supervisor = supervisors.find(s => s.id === supervisorId);
    if (!supervisor) return;

    // Get workers associated with this supervisor
    const supervisorWorkers = allWorkers.filter(w => w.supervisorId === supervisorId);
    const activeSupervisorWorkers = supervisorWorkers.filter(w => w.statut === 'actif');

    // Prepare workers data for Excel
    const workersData = supervisorWorkers.map(worker => ({
      'Nom': worker.nom,
      'Matricule': worker.matricule || '',
      'Âge': worker.age,
      'Sexe': worker.sexe === 'homme' ? 'Homme' : 'Femme',
      'Chambre': worker.chambre || '',
      'Date d\'entrée': worker.dateEntree ? new Date(worker.dateEntree).toLocaleDateString('fr-FR') : '',
      'Date de sortie': worker.dateSortie ? new Date(worker.dateSortie).toLocaleDateString('fr-FR') : '',
      'Statut': worker.statut === 'actif' ? 'Actif' : 'Inactif',
      'Motif de sortie': worker.motif ? getMotifLabel(worker.motif) : '',
      'Ferme': fermes.find(f => f.id === worker.fermeId)?.nom || worker.fermeId
    }));

    // Calculate supervisor statistics
    const ages = activeSupervisorWorkers.map(w => w.age).filter(age => age > 0);
    const averageAge = ages.length > 0 ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0;

    const maleCount = activeSupervisorWorkers.filter(w => w.sexe === 'homme').length;
    const femaleCount = activeSupervisorWorkers.filter(w => w.sexe === 'femme').length;

    // Calculate average length of stay for workers who have left
    const exitedWorkers = supervisorWorkers.filter(w => w.statut === 'inactif' && w.dateEntree && w.dateSortie);
    const stayDurations = exitedWorkers.map(w => {
      const entryDate = new Date(w.dateEntree);
      const exitDate = new Date(w.dateSortie!);
      return Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    });
    const averageStay = stayDurations.length > 0 ? Math.round(stayDurations.reduce((sum, days) => sum + days, 0) / stayDurations.length) : 0;

    // Calculate average duration for active workers (from entry date to current date)
    const activeWorkersWithEntryDate = activeSupervisorWorkers.filter(w => w.dateEntree);
    const activeDurations = activeWorkersWithEntryDate.map(w => {
      const entryDate = new Date(w.dateEntree);
      const currentDate = new Date();
      return Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    });
    const averageActiveDuration = activeDurations.length > 0 ? Math.round(activeDurations.reduce((sum, days) => sum + days, 0) / activeDurations.length) : 0;

    // Calculate average duration for all workers (active + exited)
    const allDurations = [...activeDurations, ...stayDurations];
    const averageAllDuration = allDurations.length > 0 ? Math.round(allDurations.reduce((sum, days) => sum + days, 0) / allDurations.length) : 0;

    // Prepare resume data
    const resumeData = [
      // Header
      ['RAPPORT DE SUPERVISION', ''],
      ['', ''],

      // Supervisor Information Section
      ['INFORMATIONS DU SUPERVISEUR', ''],
      ['Nom du superviseur', supervisor.nom],
      ['Entreprise', supervisor.company || '-'],
      ['Date de génération', new Date().toLocaleDateString('fr-FR')],
      ['', ''],

      // Statistics Overview Section
      ['APERÇU GÉNÉRAL', ''],
      ['Total ouvriers gérés', supervisorWorkers.length.toString()],
      ['Ouvriers actifs', activeSupervisorWorkers.length.toString()],
      ['Ouvriers sortis', (supervisorWorkers.length - activeSupervisorWorkers.length).toString()],
      ['Taux de rétention', `${activeSupervisorWorkers.length > 0 ? Math.round((activeSupervisorWorkers.length / supervisorWorkers.length) * 100) : 0}%`],
      ['', ''],

      // Demographics Section
      ['DÉMOGRAPHIE', ''],
      ['Âge moyen des ouvriers', `${averageAge} ans`],
      ['Nombre d\'hommes', maleCount.toString()],
      ['Nombre de femmes', femaleCount.toString()],
      ['Répartition hommes/femmes', `${Math.round((maleCount / Math.max(activeSupervisorWorkers.length, 1)) * 100)}% / ${Math.round((femaleCount / Math.max(activeSupervisorWorkers.length, 1)) * 100)}%`],
      ['', ''],

      // Duration Analysis Section
      ['ANALYSE DES DURÉES', ''],
      ['Durée moyenne ouvriers actifs', `${averageActiveDuration} jours`],
      ['Durée moyenne ouvriers sortis', `${averageStay} jours`],
      ['Durée moyenne générale (tous)', `${averageAllDuration} jours`]
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create and format workers sheet
    const workersSheet = XLSX.utils.json_to_sheet(workersData);

    // Auto-size columns for workers sheet
    const workersRange = XLSX.utils.decode_range(workersSheet['!ref'] || 'A1:A1');
    const workersColWidths = [];
    for (let C = workersRange.s.c; C <= workersRange.e.c; ++C) {
      let maxWidth = 10; // minimum width
      for (let R = workersRange.s.r; R <= workersRange.e.r; ++R) {
        const cell = workersSheet[XLSX.utils.encode_cell({c: C, r: R})];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxWidth) {
            maxWidth = Math.min(cellLength + 2, 50); // max width of 50
          }
        }
      }
      workersColWidths.push({wch: maxWidth});
    }
    workersSheet['!cols'] = workersColWidths;

    XLSX.utils.book_append_sheet(wb, workersSheet, 'Liste des Ouvriers');

    // Create and format resume sheet
    const resumeSheet = XLSX.utils.aoa_to_sheet(resumeData);

    // Auto-size columns for resume sheet
    resumeSheet['!cols'] = [
      {wch: 35}, // First column (labels) - wider
      {wch: 20}  // Second column (values)
    ];

    XLSX.utils.book_append_sheet(wb, resumeSheet, 'Résumé Exécutif');

    // Generate professional filename
    const sanitizedName = supervisor.nom.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Rapport_Supervision_${sanitizedName}_${date}.xlsx`;

    // Download file
    XLSX.writeFile(wb, fileName);
  };

  // Generate Excel for a specific farm (row-level export)
  const generateFarmExcel = (fermeId: string) => {
    const ferme = fermes.find(f => f.id === fermeId);
    const farmName = ferme ? ferme.nom : getFermeName(fermeId);

    const farmWorkers = allWorkers.filter(w => w.fermeId === fermeId);
    const activeWorkers = farmWorkers.filter(w => w.statut === 'actif');
    const exitedWorkers = farmWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);

    const ages = activeWorkers.map(w => w.age).filter((a) => typeof a === 'number' && !isNaN(a) && a > 0);
    const averageAge = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;

    const maleCount = activeWorkers.filter(w => w.sexe === 'homme').length;
    const femaleCount = activeWorkers.filter(w => w.sexe === 'femme').length;
    const totalActive = activeWorkers.length;
    const percentMale = totalActive ? Math.round((maleCount / totalActive) * 100) : 0;
    const percentFemale = totalActive ? Math.round((femaleCount / totalActive) * 100) : 0;

    const activeDurations = activeWorkers
      .filter(w => w.dateEntree)
      .map(w => {
        const entry = new Date(w.dateEntree!);
        const now = new Date();
        return Math.floor((now.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
      });
    const averageActiveDuration = activeDurations.length
      ? Math.round(activeDurations.reduce((s, d) => s + d, 0) / activeDurations.length)
      : 0;

    const exitedDurations = exitedWorkers
      .filter(w => w.dateEntree && w.dateSortie)
      .map(w => {
        const entry = new Date(w.dateEntree!);
        const exit = new Date(w.dateSortie!);
        return Math.floor((exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
      });
    const averageExitedDuration = exitedDurations.length
      ? Math.round(exitedDurations.reduce((s, d) => s + d, 0) / exitedDurations.length)
      : 0;

    const totalEntered = farmWorkers.length;
    const retentionRate = totalEntered ? Math.round((totalActive / totalEntered) * 100) : 0;
    const turnoverRate = 100 - retentionRate;

    const resolveSupervisorName = (id: string) => {
      if (!id) return '-';
      const s = supervisors?.find(s => s.id === id);
      return s?.nom || 'Superviseur inconnu';
    };

    const workersData = farmWorkers.map(worker => ({
      'Matricule': worker.matricule || '',
      'Nom': worker.nom,
      'Âge': worker.age,
      'Sexe': worker.sexe,
      'Statut': worker.statut,
      'Chambre': worker.chambre || '',
      'Date d\'entrée': worker.dateEntree ? new Date(worker.dateEntree).toLocaleDateString('fr-FR') : '',
      'Date de sortie': worker.dateSortie ? new Date(worker.dateSortie).toLocaleDateString('fr-FR') : '',
      'Superviseur': resolveSupervisorName(worker.supervisorId || '')
    }));

    const resumeData = [
      ['RAPPORT FERME', ''],
      ['', ''],
      ['INFORMATIONS', ''],
      ['Ferme', farmName],
      ['Date de génération', new Date().toLocaleDateString('fr-FR')],
      ['', ''],
      ['APERÇU DES PERFORMANCES', ''],
      ['Total ouvriers (tous)', totalEntered.toString()],
      ['Actifs', totalActive.toString()],
      ['Sortis', exitedWorkers.length.toString()],
      ['Performance (rétention)', `${retentionRate}%`],
      ['Taux de sortie', `${turnoverRate}%`],
      ['', ''],
      ['DURÉES MOYENNES', ''],
      ['Durée moyenne (actifs)', `${averageActiveDuration} jours`],
      ['Durée moyenne (sortis)', `${averageExitedDuration} jours`],
      ['', ''],
      ['DÉMOGRAPHIE (actifs)', ''],
      ['Âge moyen', `${averageAge} ans`],
      ['% Hommes', `${percentMale}%`],
      ['% Femmes', `${percentFemale}%`],
    ];

    const wb = XLSX.utils.book_new();

    const workersSheet = XLSX.utils.json_to_sheet(workersData);
    // Auto-size columns for workers sheet
    const range = XLSX.utils.decode_range(workersSheet['!ref'] || 'A1:A1');
    const colWidths = [] as { wch: number }[];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxW = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = workersSheet[XLSX.utils.encode_cell({ c: C, r: R })];
        if (cell && cell.v) {
          const len = cell.v.toString().length;
          if (len > maxW) maxW = Math.min(len + 2, 50);
        }
      }
      colWidths.push({ wch: maxW });
    }
    workersSheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, workersSheet, 'Liste des Ouvriers');

    const resumeSheet = XLSX.utils.aoa_to_sheet(resumeData);
    resumeSheet['!cols'] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, resumeSheet, 'Résumé');

    const cleanName = farmName.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Rapport_Ferme_${cleanName}_${date}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Get occupancy summary for debugging
  const occupancySummary = getOccupancySummary(allWorkers, allRooms);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">

      {hasNetworkError && (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <NetworkErrorHandler
            error={networkError}
            onRetry={handleRetry}
          />
        </div>
      )}
      
      {/* Page Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-1">
        <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:justify-between lg:items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-slate-800 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="text-2xl font-normal tracking-tight text-slate-900 ml-4">
              Statistiques
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSyncRoomOccupancy}
              disabled={syncLoading}
              variant="outline"
              className="border-slate-200 hover:bg-slate-50"
            >
              <Activity className="mr-2 h-4 w-4" />
              {syncLoading ? 'Sync...' : 'Sync Data'}
            </Button>
            {(isUser || isSuperAdmin) && (
  <Button
    onClick={handleExport}
    className="bg-slate-800 hover:bg-slate-900"
  >
    <Download className="mr-2 h-4 w-4" />
    Rapport PDF
  </Button>
)}
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 space-y-4 sm:space-y-6">
        {/* Smart Filters Section */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="py-2 px-3 sm:py-3 sm:px-4">
            <div className="space-y-3 sm:space-y-4">

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 overflow-x-auto">
                {(isSuperAdmin || hasAllFarmsAccess) && (
                  <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto">
                    <Building2 className="h-4 w-4 text-slate-600" />
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

                <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="border-slate-200 hover:border-slate-400 focus:border-indigo-500 bg-white text-sm w-full sm:w-auto sm:min-w-[100px] flex-row">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">7 jours</SelectItem>
                      <SelectItem value="month">30 jours</SelectItem>
                      <SelectItem value="quarter">3 mois</SelectItem>
                      <SelectItem value="year">1 an</SelectItem>
                      <SelectItem value="specific_month">Mois spécifique</SelectItem>
                      <SelectItem value="specific_year">Année spécifique</SelectItem>
                      <SelectItem value="custom">Plage personnalisée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender Filter */}
                <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto">
                  <Users className="h-4 w-4 text-slate-600" />
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger className="border-slate-200 hover:border-slate-400 focus:border-indigo-500 bg-white text-sm w-full sm:w-auto sm:min-w-[100px] flex-row">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous genres</SelectItem>
                      <SelectItem value="homme">Hommes</SelectItem>
                      <SelectItem value="femme">Femmes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Range Selection */}
                {timeRange === 'custom' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto justify-start">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange.from && dateRange.to
                          ? `${dateRange.from.toLocaleDateString('fr-FR')} - ${dateRange.to.toLocaleDateString('fr-FR')}`
                          : 'Sélectionner une période'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarUI
                        mode="range"
                        selected={dateRange as any}
                        onSelect={(range: any) => setDateRange(range)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {/* Specific Month Selection */}
                {timeRange === 'specific_month' && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="border-slate-200 hover:border-slate-400 focus:border-indigo-500 bg-white text-sm w-full sm:w-auto sm:min-w-[90px] flex-row flex-shrink-0">
                        <SelectValue placeholder="Mois" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Janvier</SelectItem>
                        <SelectItem value="2">Février</SelectItem>
                        <SelectItem value="3">Mars</SelectItem>
                        <SelectItem value="4">Avril</SelectItem>
                        <SelectItem value="5">Mai</SelectItem>
                        <SelectItem value="6">Juin</SelectItem>
                        <SelectItem value="7">Juillet</SelectItem>
                        <SelectItem value="8">Août</SelectItem>
                        <SelectItem value="9">Septembre</SelectItem>
                        <SelectItem value="10">Octobre</SelectItem>
                        <SelectItem value="11">Novembre</SelectItem>
                        <SelectItem value="12">Décembre</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="border-slate-200 hover:border-slate-400 focus:border-indigo-500 bg-white text-sm w-full sm:w-auto sm:min-w-[75px] flex-row flex-shrink-0">
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Specific Year Selection */}
                {timeRange === 'specific_year' && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="border-slate-200 hover:border-slate-400 focus:border-indigo-500 bg-white text-sm w-full sm:w-auto sm:min-w-[75px] flex-row flex-shrink-0">
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Compare previous period toggle */}
              <div className="flex items-center gap-2">
                <Switch checked={comparePrevious} onCheckedChange={setComparePrevious} />
                <span className="text-sm text-slate-600">Comparer période précédente</span>
              </div>

              {/* Active filters display */}
              {(selectedFerme !== 'all' || timeRange !== 'month' || selectedMonth || selectedYear || selectedGender !== 'all') && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
                  {selectedFerme !== 'all' && (
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs px-2 py-1">
                      <Building2 className="w-3 h-3 mr-1" />
                      <span className="truncate max-w-[100px] sm:max-w-[120px]">
                        {fermes.find(f => f.id === selectedFerme)?.nom || selectedFerme}
                      </span>
                    </Badge>
                  )}
                  {(timeRange !== 'month' || selectedMonth || selectedYear) && (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2 py-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span className="truncate max-w-[100px] sm:max-w-[120px]">
                        {timeRange === 'specific_month' && selectedMonth && selectedYear && `${getMonthName(selectedMonth)} ${selectedYear}`}
                        {timeRange === 'specific_year' && selectedYear && selectedYear}
                        {timeRange === 'week' && '7 derniers jours'}
                        {timeRange === 'quarter' && '3 derniers mois'}
                        {timeRange === 'year' && 'Dernière année'}
                        {timeRange === 'month' && !selectedMonth && !selectedYear && '30 derniers jours'}
                      </span>
                    </Badge>
                  )}
                  {selectedGender !== 'all' && (
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-1">
                      <Users className="w-3 h-3 mr-1" />
                      <span className="truncate max-w-[100px] sm:max-w-[120px]">
                        {selectedGender === 'homme' ? 'Hommes' : selectedGender === 'femme' ? 'Femmes' : selectedGender}
                      </span>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Performance Indicators */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <KPICard
              title="Ouvriers Actifs"
              value={statistics.totalWorkers}
              subtitle={timeRange === 'specific_month' && selectedMonth && selectedYear ? `Entrés en ${getMonthName(selectedMonth)} ${selectedYear}` : timeRange === 'specific_year' && selectedYear ? `Entrés en ${selectedYear}` : "Total dans le système"}
              icon={Users}
              color="emerald"
              
            />
            
            <KPICard
              title="Taux d'Occupation"
              value={`${statistics.occupancyRate}%`}
              subtitle={`${statistics.occupiedPlaces}/${statistics.totalCapacity} places`}
              icon={TrendingUp}
              color={statistics.isHighOccupancy ? "rose" : statistics.isLowOccupancy ? "amber" : "blue"}
              trend={comparePrevious ? { value: trends.occupancyRate.change, isPositive: trends.occupancyRate.change >= 0 } : undefined}
              
            />
            
            <KPICard
              title="Nouveaux Arrivants"
              value={statistics.recentArrivals}
              subtitle={timeRange === 'specific_month' && selectedMonth && selectedYear ? `${getMonthName(selectedMonth)} ${selectedYear}` : timeRange === 'specific_year' && selectedYear ? selectedYear : `${timeRange === 'week' ? '7' : timeRange === 'month' ? '30' : timeRange === 'quarter' ? '90' : '365'} derniers jours`}
              icon={UserCheck}
              color="purple"
              trend={comparePrevious ? { value: trends.arrivals.change, isPositive: trends.arrivals.change >= 0 } : undefined}
            />

            <KPICard
              title="Sorties"
              value={statistics.recentExits}
              subtitle="Même période"
              icon={UserX}
              color="amber"
              trend={comparePrevious ? { value: trends.exits.change, isPositive: trends.exits.change < 0 } : undefined}
            />

            <KPICard
              title="Rétention"
              value={`${statistics.retentionRate}%`}
              subtitle="Taux de fidélisation"
              icon={Target}
              color={statistics.retentionRate > 85 ? "emerald" : statistics.retentionRate > 70 ? "blue" : "rose"}
            />

            <KPICard
              title="Durée Moyenne"
              value={`${statistics.averageStayDuration}j`}
              subtitle="Séjour moyen"
              icon={Clock}
              color="cyan"
            />

            <KPICard
              title="Jours d'Activité"
              value={`${statistics.averageActiveDays}j`}
              subtitle="Moyenne générale (actifs + sortis)"
              icon={Calendar}
              color="indigo"
            />

            <KPICard
              title="Retours"
              value={statistics.returningWorkersCount}
              subtitle={`Moy. ${statistics.averageReturnCount} retours/ouvrier`}
              icon={TrendingUp}
              color="purple"
            />

            <KPICard
              title="Transferts de Ouvriers en attente"
              value={pendingTransfersOver2Days}
              subtitle="Ouvriers"
              icon={Clock}
              color="indigo"
              onClick={() => navigate('/transferts')}
            />

<KPICard
              title="Transferts de Stock en attente"
              value={pendingTransfersOver2Dayss}
              subtitle="Stock"
              icon={Clock}
              color="emerald"
              onClick={() => navigate('/stock')}
            />
          </div>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="overview" className="space-y-8 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm mx-auto">
            <TabsTrigger value="overview" className="flex flex-col lg:flex-row items-center p-4 lg:p-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md">
              <BarChartIcon className="h-4 w-4 mb-1 lg:mb-0 lg:mr-2" />
              <span className="text-xs lg:text-sm font-medium">Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger value="demographics" className="flex flex-col lg:flex-row items-center p-4 lg:p-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md">
              <Users2 className="h-4 w-4 mb-1 lg:mb-0 lg:mr-2" />
              <span className="text-xs lg:text-sm font-medium">Démographie</span>
            </TabsTrigger>

            <TabsTrigger value="performance" className="flex flex-col lg:flex-row items-center p-4 lg:p-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md">
              <LineChart className="h-4 w-4 mb-1 lg:mb-0 lg:mr-2" />
              <span className="text-xs lg:text-sm font-medium">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex flex-col lg:flex-row items-center p-4 lg:p-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md">
              <Users className="h-4 w-4 mb-1 lg:mb-0 lg:mr-2" />
              <span className="text-xs lg:text-sm font-medium">Ouvriers</span>
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex flex-col lg:flex-row items-center p-4 lg:p-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md">
              <BedDouble className="h-4 w-4 mb-1 lg:mb-0 lg:mr-2" />
              <span className="text-xs lg:text-sm font-medium">Chambres</span>
            </TabsTrigger>
            <TabsTrigger value="supervisors" className="flex flex-col lg:flex-row items-center p-4 lg:p-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md">
              <Shield className="h-4 w-4 mb-1 lg:mb-0 lg:mr-2" />
              <span className="text-xs lg:text-sm font-medium">Superviseurs</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Summary Metrics */}
              <MetricCard
                title="Total Fermes"
                value={selectedFerme === 'all' ? fermes.length : 1}
                subtitle={selectedFerme === 'all' ? "Fermes actives" : "Ferme sélectionnée"}
                icon={Building2}
                className="lg:col-span-1"
              />
              
              <MetricCard
                title="Chambres Disponibles"
                value={statistics.emptyRooms}
                subtitle={`sur ${statistics.totalRooms} chambres totales`}
                icon={BedDouble}
              />
              
              <MetricCard
                title="Places Libres"
                value={statistics.availablePlaces}
                subtitle="Disponibles immédiatement"
                icon={TrendingUp}
              />

              {/* Overview Chart */}
              <Card className="lg:col-span-2 xl:col-span-3 border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <BarChart3 className="mr-3 h-5 w-5 text-indigo-600" />
                    Vue d'ensemble des Métriques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div id="overview-chart" className="h-64">
                    <div className="grid grid-cols-2 gap-4 h-full">
                      {[
                        { name: 'Ouvriers Actifs', value: statistics.totalWorkers, color: 'bg-blue-500', textColor: 'text-blue-600' },
                        { name: 'Chambres Occupées', value: statistics.occupiedRooms, color: 'bg-green-500', textColor: 'text-green-600' },
                        { name: 'Places Libres', value: statistics.availablePlaces, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
                        { name: 'Sorties Récentes', value: statistics.recentExits, color: 'bg-red-500', textColor: 'text-red-600' }
                      ].map((metric, index) => (
                        <div key={index} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border">
                          <div className={`w-12 h-12 ${metric.color} rounded-full flex items-center justify-center mb-2`}>
                            <span className="text-white font-bold text-lg">{metric.value}</span>
                          </div>
                          <span className={`text-sm font-medium ${metric.textColor}`}>{metric.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Quick Insights */}
            </div>
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gender Distribution */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-indigo-600" />
                    Répartition par Genre
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div id="gender-distribution-chart" className="h-64">
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Hommes', value: statistics.maleWorkers, fill: '#3B82F6' },
                            { name: 'Femmes', value: statistics.femaleWorkers, fill: '#EC4899' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#3B82F6" />
                          <Cell fill="#EC4899" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Âge moyen:</span>
                      <span className="font-semibold">{statistics.averageAge} ans</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Étendue d'âge:</span>
                      <span className="font-semibold">{statistics.minAge} - {statistics.maxAge} ans</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Age Distribution */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="mr-2 h-5 w-5 text-purple-600" />
                    Distribution par Âge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div id="age-distribution-chart" className="h-64">
                    <div className="space-y-4">
                      {Object.entries(statistics.ageDistribution).map(([range, count]) => {
                        const percentage = statistics.totalWorkers > 0 ? Math.round((count / statistics.totalWorkers) * 100) : 0;
                        return (
                          <div key={range} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{count}</span>
                              </div>
                              <span className="font-medium text-gray-900">{range} ans</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-500 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-purple-600">{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>



          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Retention & Turnover */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle>Rétention et Rotation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Taux de Rétention</span>
                        <span className="font-semibold">{statistics.retentionRate}%</span>
                      </div>
                      <Progress value={statistics.retentionRate} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Taux de Rotation</span>
                        <span className="font-semibold">{statistics.turnoverRate}%</span>
                      </div>
                      <Progress value={statistics.turnoverRate} className="h-2" />
                    </div>
                    <div className="pt-2 border-t text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Durée moyenne de séjour:</span>
                        <span className="font-semibold">{statistics.averageStayDuration} jours</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total sorties enregistrées:</span>
                        <span className="font-semibold">{statistics.totalExitedWorkers}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exit Reasons Chart */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="mr-2 h-5 w-5 text-red-600" />
                    Motifs de Sortie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(statistics.exitReasons).length > 0 ? (
                    <div id="exit-reasons-chart" className="h-64">
                      <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
                        <RechartsPieChart>
                          <Pie
                            data={Object.entries(statistics.exitReasons)
                              .sort(([,a], [,b]) => b - a)
                              .map(([reason, count], index) => ({
                                name: getMotifLabel(reason),
                                value: count,
                                fill: [
                                  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
                                  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F59E0B'
                                ][index % 10]
                              }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => percent > 5 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.entries(statistics.exitReasons).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={[
                                '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
                                '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F59E0B'
                              ][index % 10]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [`${value} departs`, name]}
                            labelFormatter={(name) => `Motif: ${name}`}
                          />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-8">
                      <LogOut className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p className="text-lg font-medium">Aucune sortie enregistrée</p>
                      <p className="text-sm">Les motifs de sortie apparaîtront ici lorsque des ouvriers quitteront.</p>
                    </div>
                  )}

                  {/* Summary Statistics */}
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total sorties:</span>
                      <span className="font-semibold">{statistics.totalExitedWorkers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Motif principal:</span>
                      <span className="font-semibold">{getMotifLabel(statistics.topExitReason)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Taux de rotation:</span>
                      <span className="font-semibold">{statistics.turnoverRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exit Reasons Table */}
              <Card className="border-0 shadow-sm bg-white flex flex-col w-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center mx-auto">
                    <LogOut className="mr-2 h-5 w-5 text-red-600" />
                    Tableau des Motifs de Sortie
                  </CardTitle>
                </CardHeader>
                <CardContent className="w-full flex flex-col justify-start items-center mx-auto">
                  {Object.keys(statistics.exitReasons).length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Motif de Sortie</TableHead>
                            <TableHead className="text-center">Nombre de Cas</TableHead>
                            <TableHead className="text-center">Pourcentage</TableHead>
                            <TableHead className="text-center">Impact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(statistics.exitReasons)
                            .sort(([,a], [,b]) => b - a)
                            .map(([reason, count]) => {
                              const percentage = Math.round((count / statistics.totalExitedWorkers) * 100);
                              const isHighImpact = percentage > 30;
                              const isMediumImpact = percentage > 15;

                              return (
                                <TableRow key={reason}>
                                  <TableCell className="font-medium">
                                    {getMotifLabel(reason)}
                                  </TableCell>
                                  <TableCell className="text-center font-semibold">
                                    {count}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={isHighImpact ? "destructive" : isMediumImpact ? "secondary" : "outline"}>
                                      {percentage}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge
                                      variant={isHighImpact ? "destructive" : isMediumImpact ? "secondary" : "outline"}
                                      className={isHighImpact ? "bg-red-100 text-red-800" : isMediumImpact ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}
                                    >
                                      {isHighImpact ? "Critique" : isMediumImpact ? "Modéré" : "Faible"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>

                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total sorties:</span>
                            <span className="font-semibold">{statistics.totalExitedWorkers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Motif principal:</span>
                            <span className="font-semibold">{getMotifLabel(statistics.topExitReason)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Taux de rotation:</span>
                            <span className="font-semibold text-red-600">{statistics.turnoverRate}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <LogOut className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p className="text-lg font-medium">Aucune sortie enregistrée</p>
                      <p className="text-sm">Les motifs de sortie apparaîtront dans ce tableau lorsque des ouvriers quitteront.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workers Tab */}
          <TabsContent value="workers" className="space-y-6">
            <EnhancedWorkersTable
              workers={workers}
              fermes={fermes}
              isSuperAdmin={isSuperAdmin}
              hasAllFarmsAccess={hasAllFarmsAccess}
              supervisors={supervisors}
            />
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="space-y-6">
            <ResponsiveDataTable
              data={rooms}
              columns={[
                { id: 'numero', header: 'Numéro' },
                { id: 'genre', header: 'Genre' },
                { id: 'capaciteTotale', header: 'Capacité' },
                { id: 'occupantsActuels', header: 'Occupants' },
                {
                  id: 'fermeId',
                  header: 'Ferme',
                  cell: (room: Room) => {
                    const ferme = fermes.find(f => f.id === room.fermeId);
                    return ferme ? ferme.nom : room.fermeId;
                  }
                },
              ]}

              title="Liste des Chambres"
              description={`${rooms.length} chambres au total`}
            />
          </TabsContent>

          {/* Supervisors Tab */}
          <TabsContent value="supervisors" className="space-y-6">
            {supervisors.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Liste des Superviseurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Shield className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun superviseur trouvé</h3>
                    <p className="text-gray-600">
                      Il n'y a actuellement aucun superviseur dans la base de données.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        console.log('Supervisors debug info:', {
                          supervisorsCount: supervisors.length,
                          supervisors: supervisors,
                          workersCount: workers.length,
                          hasWorkersWithSupervisors: workers.filter(w => w.supervisorId).length
                        });
                      }}
                    >
                      Débugger les superviseurs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ResponsiveDataTable
                data={supervisors.map(supervisor => {
                  const activeWorkers = workers.filter(w => w.statut === 'actif');
                  const workersUnderSupervisor = activeWorkers.filter(w => w.supervisorId === supervisor.id);
                  const workerCount = workersUnderSupervisor.length;
                  const percentage = activeWorkers.length > 0 ? Math.round((workerCount / activeWorkers.length) * 100) : 0;

                  return {
                    id: supervisor.id,
                    nom: supervisor.nom,
                    telephone: supervisor.telephone,
                    workerCount,
                    percentage: `${percentage}%`,
                    performance: workerCount > 10 ? 'Excellent' : workerCount > 5 ? 'Bon' : workerCount > 0 ? 'Acceptable' : 'Inactif'

                  };
                })}
                columns={[
                  { id: 'nom', header: 'Nom du Superviseur' },
                  { id: 'telephone', header: 'Téléphone' },
                  { id: 'workerCount', header: 'Nombre d\'ouvriers' },
                  { id: 'percentage', header: 'Pourcentage' },
                  {
                    id: 'performance',
                    header: 'Performance',
                    cell: (supervisor: any) => (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        supervisor.performance === 'Excellent' ? 'bg-green-100 text-green-800' :
                        supervisor.performance === 'Bon' ? 'bg-blue-100 text-blue-800' :
                        supervisor.performance === 'Acceptable' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {supervisor.performance}
                      </span>
                    )
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (supervisor: any) => (
                      <Button
                        onClick={() => generateSupervisorExcel(supervisor.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Excel
                      </Button>
                    )
                  }
                ]}
                title="Liste des Superviseurs"
                description={`${supervisors.length} superviseurs au total`}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Entreprises (interime) comparison table - standalone with search */}
        {(() => {
          const activeWorkers = workers.filter(w => w.statut === 'actif');
          const stats: { [company: string]: { workers: number; activeSupervisors: number; farms: Set<string> } } = {};

          activeWorkers.forEach(w => {
            if (!w.supervisorId) return;
            const sup = supervisors.find(s => s.id === w.supervisorId);
            const company = sup?.company;
            if (!company) return;
            if (!stats[company]) stats[company] = { workers: 0, activeSupervisors: 0, farms: new Set() };
            stats[company].workers++;
            stats[company].farms.add(w.fermeId);
          });

          supervisors.filter(s => s.statut === 'actif' && s.company).forEach(s => {
            const company = s.company as string;
            if (!stats[company]) stats[company] = { workers: 0, activeSupervisors: 0, farms: new Set() };
            stats[company].activeSupervisors++;
          });

          const data = Object.entries(stats)
            .sort(([,a],[,b]) => (b.workers - a.workers))
            .map(([company, v]) => ({
              company,
              workers: v.workers,
              supervisors: v.activeSupervisors,
              farms: v.farms.size
            }));

          if (data.length === 0) return null;

          return (
            <Card className="border-0 shadow-sm bg-white mt-6">
              <CardContent>
                <ResponsiveDataTable
                  data={data}
                  columns={[
                    { id: 'company', header: 'interime' },
                    { id: 'workers', header: 'Ouvriers' },
                    { id: 'supervisors', header: 'Superviseurs' },
                    { id: 'farms', header: 'Fermes' }
                  ]}
                  title="Statistiques par interime"
                  description={`${data.length} entreprises`}
                />
              </CardContent>
            </Card>
          );
        })()}

        {/* Farm Comparison Table - Detailed comparison of all farms */}
        {(isSuperAdmin || hasAllFarmsAccess) && selectedFerme === 'all' && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent>
              <ResponsiveDataTable
                data={[...fermes].sort((a, b) => a.nom.localeCompare(b.nom)).map(ferme => {
                  const allFermeWorkers = allWorkers.filter(w => w.fermeId === ferme.id);
                  const activeFermeWorkers = allFermeWorkers.filter(w => w.statut === 'actif');
                  const exitedFermeWorkers = allFermeWorkers.filter(w => w.statut === 'inactif' && w.dateSortie);

                  const totalEntered = allFermeWorkers.length;
                  const totalRemaining = activeFermeWorkers.length;
                  const totalLeft = exitedFermeWorkers.length;
                  const percentageRemaining = totalEntered > 0 ? Math.round((totalRemaining / totalEntered) * 100) : 0;
                  const percentageLeft = totalEntered > 0 ? Math.round((totalLeft / totalEntered) * 100) : 0;

                  const exitReasons = exitedFermeWorkers.reduce((acc, worker) => {
                    const reason = worker.motif || 'none';
                    acc[reason] = (acc[reason] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  const topExitReason = Object.entries(exitReasons)
                    .sort(([,a], [,b]) => b - a)[0];

                  const mostCommonReason = topExitReason ?
                    `${getMotifLabel(topExitReason[0])} (${topExitReason[1]})` :
                    'Aucune sortie';

                  return {
                    id: ferme.id,
                    nom: ferme.nom,
                    totalEntres: totalEntered,
                    restants: totalRemaining,
                    sortis: totalLeft,
                    pourcentageRestants: percentageRemaining,
                    pourcentageSortis: percentageLeft,
                    motifPrincipal: mostCommonReason
                  };
                })}
                columns={[
                  { id: 'nom', header: 'Ferme' },
                  { id: 'totalEntres', header: 'Total Entrés' },
                  { id: 'restants', header: 'Restants' },
                  { id: 'sortis', header: 'Sortis' },
                  {
                    id: 'pourcentageRestants',
                    header: '% Restants',
                    cell: (item: any) => `${item.pourcentageRestants}%`
                  },
                  {
                    id: 'pourcentageSortis',
                    header: '% Sortis',
                    cell: (item: any) => `${item.pourcentageSortis}%`
                  },
                  { id: 'motifPrincipal', header: 'Motif Principal Sortie' },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (item: any) => (
                      <Button
                        onClick={() => generateFarmExcel(item.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Excel
                      </Button>
                    )
                  }
                ]}
                title="Comparaison Détaillée des Fermes"
                description={`Analyse comparative de ${fermes.length} fermes`}
                exportable
                onExport={(rows) => {
                  const exportData = (rows as any[]).map((item) => ({
                    'Ferme': item.nom,
                    'Total Entrés': item.totalEntres,
                    'Restants': item.restants,
                    'Sortis': item.sortis,
                    '% Restants': `${item.pourcentageRestants}%`,
                    '% Sortis': `${item.pourcentageSortis}%`,
                    'Motif Principal Sortie': item.motifPrincipal,
                  }));

                  const ws = XLSX.utils.json_to_sheet(exportData);
                  ws['!cols'] = [
                    { width: 30 },
                    { width: 15 },
                    { width: 12 },
                    { width: 12 },
                    { width: 12 },
                    { width: 12 },
                    { width: 30 },
                  ];
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Comparaison Fermes');

                  const currentDate = new Date().toISOString().split('T')[0];
                  XLSX.writeFile(wb, `comparaison_fermes_${currentDate}.xlsx`);
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Export Options Dialog */}
      <Dialog open={showExportOptions} onOpenChange={setShowExportOptions}>
      <DialogContent className="w-[95vw] max-w-md h-[75vh] overflow-y-auto mx-2 sm:mx-auto mobile-dialog-container">

          <DialogHeader className="mobile-dialog-header">
            <DialogTitle className="flex items-center">
              <Download className="mr-2 h-5 w-5" />
              Options d'Export PDF
            </DialogTitle>
            <DialogDescription>
              Rapports avancés avec graphiques, tableaux et analyses visuelles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Comprehensive Report */}
            <Card className="border-indigo-200 hover:bg-indigo-50 cursor-pointer transition-colors" onClick={handleComprehensiveExport}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Rapport Avancé Complet</h3>
                    
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Farm Reports */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Rapports Avancés par Ferme</h4>
              {[...fermes].sort((a, b) => a.nom.localeCompare(b.nom)).map(ferme => (
                <Card
                  key={ferme.id}
                  className="border-green-200 hover:bg-green-50 cursor-pointer transition-colors"
                  onClick={() => handleFermeExport(ferme.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-green-100 rounded-lg">
                        <Building2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{ferme.nom}</h4>
                        <p className="text-xs text-gray-600">
                          {allWorkers.filter(w => w.fermeId === ferme.id && w.statut === 'actif').length} ouvriers -
                          {allRooms.filter(r => r.fermeId === ferme.id).length} chambres
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowExportOptions(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Enhanced Workers Table Component with Excel-like features
interface EnhancedWorkersTableProps {
  workers: Worker[];
  fermes: Ferme[];
  isSuperAdmin: boolean;
  hasAllFarmsAccess: boolean;
  supervisors: any[];
}

function EnhancedWorkersTable({ workers, fermes, isSuperAdmin, hasAllFarmsAccess, supervisors }: EnhancedWorkersTableProps) {
  // Debug logging
  console.log('EnhancedWorkersTable received supervisors:', supervisors?.length || 0, supervisors);

  // State for filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFerme, setSelectedFerme] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 10;

  // Get ferme name helper
  const getFermeName = (fermeId: string) => {
    const ferme = fermes.find(f => f.id === fermeId);
    return ferme?.nom || fermeId;
  };

  // Get supervisor name helper
  const getSupervisorName = (supervisorId: string) => {
    if (!supervisorId) return '-';

    // Check if supervisors data is available
    if (!supervisors || supervisors.length === 0) {
      console.warn('No supervisors data available');
      return 'Superviseur inconnu';
    }

    const supervisor = supervisors.find(s => s && s.id === supervisorId);

    // Debug logging
    if (supervisorId && !supervisor) {
      console.log('Supervisor not found for ID:', supervisorId);
      console.log('Available supervisors:', supervisors.map(s => ({ id: s.id, nom: s.nom })));
    }

    return supervisor?.nom || 'Superviseur inconnu';
  };

  // Filtered and sorted data
  const filteredWorkers = useMemo(() => {
    let filtered = workers.filter(worker => {
      const matchesSearch = worker.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (worker.matricule && worker.matricule.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFerme = selectedFerme === 'all' || worker.fermeId === selectedFerme;
      const matchesStatus = statusFilter === 'all' || worker.statut === statusFilter;
      const matchesGender = genderFilter === 'all' || worker.sexe === genderFilter;
      const matchesAge = ageFilter === '' ||
                        worker.age >= parseInt(ageFilter) ||
                        worker.age.toString().includes(ageFilter);

      return matchesSearch && matchesFerme && matchesStatus && matchesGender && matchesAge;
    });

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case 'nom':
            aValue = a.nom.toLowerCase();
            bValue = b.nom.toLowerCase();
            break;
          case 'age':
            aValue = a.age;
            bValue = b.age;
            break;
          case 'sexe':
            aValue = a.sexe.toLowerCase();
            bValue = b.sexe.toLowerCase();
            break;
          case 'statut':
            aValue = a.statut.toLowerCase();
            bValue = b.statut.toLowerCase();
            break;
          case 'ferme':
            aValue = getFermeName(a.fermeId).toLowerCase();
            bValue = getFermeName(b.fermeId).toLowerCase();
            break;
          case 'chambre':
            aValue = a.chambre || '';
            bValue = b.chambre || '';
            break;
          case 'matricule':
            aValue = a.matricule || '';
            bValue = b.matricule || '';
            break;
          case 'dateEntree':
            aValue = new Date(a.dateEntree || '').getTime();
            bValue = new Date(b.dateEntree || '').getTime();
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
  }, [workers, searchTerm, selectedFerme, statusFilter, genderFilter, ageFilter, sortColumn, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWorkers = filteredWorkers.slice(startIndex, endIndex);

  // Get unique values for filters
  const uniqueStatuses = [...new Set(workers.map(w => w.statut))];
  const uniqueGenders = [...new Set(workers.map(w => w.sexe))];

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFerme, statusFilter, genderFilter, ageFilter]);

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
    if (sortColumn !== column) return <ChevronsUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc' ?
      <ChevronUp className="ml-2 h-4 w-4" /> :
      <ChevronDown className="ml-2 h-4 w-4" />;
  };

  // Export to Excel function with multiple sheets
  const handleExportExcel = () => {
    // Check if supervisors are loaded
    if (!supervisors || supervisors.length === 0) {
      console.warn('Supervisors not loaded yet, exporting with IDs only');
    } else {
      console.log('Exporting with supervisor names, found', supervisors.length, 'supervisors');
    }

    const wb = XLSX.utils.book_new();

    // Set column widths template
    const cols = [
      { width: 15 }, // Matricule
      { width: 25 }, // Nom
      { width: 10 }, // Âge
      { width: 10 }, // Genre
      { width: 15 }, // Statut
      { width: 20 }, // Ferme
      { width: 15 }, // Chambre
      { width: 15 }, // Date d'entrée
      { width: 15 }, // Date de sortie
      { width: 25 }  // Superviseur
    ];

    // Create global sheet with all workers
    const globalExportData = filteredWorkers.map(worker => ({
      'Matricule': worker.matricule || '',
      'Nom': worker.nom,
      'Âge': worker.age,
      'Genre': worker.sexe,
      'Statut': worker.statut,
      'Ferme': getFermeName(worker.fermeId),
      'Chambre': worker.chambre || '',
      'Date d\'entrée': worker.dateEntree ? new Date(worker.dateEntree).toLocaleDateString('fr-FR') : '',
      'Date de sortie': worker.dateSortie ? new Date(worker.dateSortie).toLocaleDateString('fr-FR') : '',
      'Superviseur': resolveSupervisorName(worker.supervisorId || '')
    }));

    const globalWs = XLSX.utils.json_to_sheet(globalExportData);
    globalWs['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, globalWs, 'Global - Tous');

    // Create separate sheet for each farm
    const farmIds = [...new Set(filteredWorkers.map(worker => worker.fermeId))];

    farmIds.forEach(fermeId => {
      const farmWorkers = filteredWorkers.filter(worker => worker.fermeId === fermeId);

      if (farmWorkers.length > 0) {
        const farmExportData = farmWorkers.map(worker => ({
          'Matricule': worker.matricule || '',
          'Nom': worker.nom,
          'Âge': worker.age,
          'Genre': worker.sexe,
          'Statut': worker.statut,
          'Chambre': worker.chambre || '',
          'Date d\'entrée': worker.dateEntree ? new Date(worker.dateEntree).toLocaleDateString('fr-FR') : '',
          'Date de sortie': worker.dateSortie ? new Date(worker.dateSortie).toLocaleDateString('fr-FR') : '',
          'Superviseur': resolveSupervisorName(worker.supervisorId || '')
        }));

        const farmWs = XLSX.utils.json_to_sheet(farmExportData);

        // Set column widths (excluding Ferme column for individual farm sheets)
        const farmCols = [
          { width: 15 }, // Matricule
          { width: 25 }, // Nom
          { width: 10 }, // Âge
          { width: 10 }, // Genre
          { width: 15 }, // Statut
          { width: 15 }, // Chambre
          { width: 15 }, // Date d'entrée
          { width: 15 }, // Date de sortie
          { width: 25 }  // Superviseur
        ];
        farmWs['!cols'] = farmCols;

        // Clean farm name for sheet name (max 31 characters, no special chars)
        const farmName = getFermeName(fermeId);
        const cleanFarmName = farmName.replace(/[^\w\s]/gi, '').substring(0, 31);

        XLSX.utils.book_append_sheet(wb, farmWs, cleanFarmName);
      }
    });

    // Create summary sheet with farm statistics
    const summaryData = farmIds.map(fermeId => {
      const farmWorkers = filteredWorkers.filter(worker => worker.fermeId === fermeId);
      const activeWorkers = farmWorkers.filter(worker => worker.statut === 'actif');
      const inactiveWorkers = farmWorkers.filter(worker => worker.statut === 'inactif');

      return {
        'Ferme': getFermeName(fermeId),
        'Total Ouvriers': farmWorkers.length,
        'Actifs': activeWorkers.length,
        'Inactifs': inactiveWorkers.length,
        'Pourcentage Actifs': farmWorkers.length > 0 ? Math.round((activeWorkers.length / farmWorkers.length) * 100) + '%' : '0%'
      };
    });

    // Add total row
    const totalWorkers = filteredWorkers.length;
    const totalActive = filteredWorkers.filter(worker => worker.statut === 'actif').length;
    const totalInactive = filteredWorkers.filter(worker => worker.statut === 'inactif').length;

    summaryData.push({
      'Ferme': 'TOTAL',
      'Total Ouvriers': totalWorkers,
      'Actifs': totalActive,
      'Inactifs': totalInactive,
      'Pourcentage Actifs': totalWorkers > 0 ? Math.round((totalActive / totalWorkers) * 100) + '%' : '0%'
    });

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    const summaryCols = [
      { width: 25 }, // Ferme
      { width: 15 }, // Total Ouvriers
      { width: 15 }, // Actifs
      { width: 15 }, // Inactifs
      { width: 20 }  // Pourcentage Actifs
    ];
    summaryWs['!cols'] = summaryCols;
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');

    const currentDate = new Date().toISOString().split('T')[0];
    const farmSuffix = selectedFerme === 'all' ? 'toutes_fermes' : getFermeName(selectedFerme).replace(/[^\w]/g, '_');
    const filename = `ouvriers_${farmSuffix}_${currentDate}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Export All Matricule function
  const handleExportAllMatricule = () => {
    const matriculeData = filteredWorkers
      .filter(worker => worker.matricule)
      .map(worker => ({
        'Matricule': worker.matricule,
        'Nom': worker.nom,
        'Ferme': getFermeName(worker.fermeId)
      }));

    const ws = XLSX.utils.json_to_sheet(matriculeData);
    const wb = XLSX.utils.book_new();

    // Set column widths
    const cols = [
      { width: 20 }, // Matricule
      { width: 30 }, // Nom
      { width: 20 }  // Ferme
    ];
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, 'Matricules');

    const currentDate = new Date().toISOString().split('T')[0];
    const farmSuffix = selectedFerme === 'all' ? 'tous' : getFermeName(selectedFerme).replace(/[^\w]/g, '_');
    const filename = `matricules_${farmSuffix}_${currentDate}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Format date function
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Liste des Ouvriers
          <span className="text-sm font-normal text-gray-600">
            ({filteredWorkers.length} ouvrier{filteredWorkers.length > 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters and Export Buttons */}
        <div className="space-y-4 mb-6">
          {/* Primary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nom ou matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {(isSuperAdmin || hasAllFarmsAccess) && (
              <div>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les genres</SelectItem>
                  {uniqueGenders.map(gender => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters and Export Buttons */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedFerme('all');
                    setStatusFilter('all');
                    setGenderFilter('all');
                    setAgeFilter('');
                    setSortColumn('');
                    setSortDirection('asc');
                  }}
                  className="w-full"
                >
                  Réinitialiser
                </Button>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleExportExcel}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleExportAllMatricule}
                  variant="outline"
                  className="w-full"
                >
                  <IdCard className="h-4 w-4 mr-2" />
                  Telecharger Simple
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Workers Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('matricule')}
                >
                  Matricule <SortIndicator column="matricule" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nom')}
                >
                  Nom <SortIndicator column="nom" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('age')}
                >
                  Âge <SortIndicator column="age" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sexe')}
                >
                  Genre <SortIndicator column="sexe" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('statut')}
                >
                  Statut <SortIndicator column="statut" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ferme')}
                >
                  Ferme <SortIndicator column="ferme" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('chambre')}
                >
                  Chambre <SortIndicator column="chambre" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dateEntree')}
                >
                  Date d'entrée <SortIndicator column="dateEntree" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedWorkers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell className="font-mono text-sm">
                    {worker.matricule || '-'}
                  </TableCell>
                  <TableCell className="font-medium">{worker.nom}</TableCell>
                  <TableCell>{worker.age}</TableCell>
                  <TableCell>{worker.sexe}</TableCell>
                  <TableCell>
                    <Badge variant={worker.statut === 'actif' ? 'default' : 'secondary'}>
                      {worker.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{getFermeName(worker.fermeId)}</TableCell>
                  <TableCell>{worker.chambre || '-'}</TableCell>
                  <TableCell>{formatDate(worker.dateEntree)}</TableCell>
                </TableRow>
              ))}
              {paginatedWorkers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Aucun ouvrier trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                Affichage {startIndex + 1}-{Math.min(endIndex, filteredWorkers.length)} sur {filteredWorkers.length} ouvriers
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
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                  let page;
                  if (totalPages <= 10) {
                    page = i + 1;
                  } else {
                    if (currentPage <= 5) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 4) {
                      page = totalPages - 9 + i;
                    } else {
                      page = currentPage - 5 + i;
                    }
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
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
  );
}
