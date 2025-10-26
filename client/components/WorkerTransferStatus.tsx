import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Users,
  AlertCircle,
  Eye
} from 'lucide-react';
import { WorkerTransfer } from '@shared/types';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function WorkerTransferStatus() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [outgoingTransfers, setOutgoingTransfers] = useState<WorkerTransfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<WorkerTransfer | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load outgoing transfers from current farm
  useEffect(() => {
    if (!isSuperAdmin && !user?.fermeId) return;

    const transfersQuery = isSuperAdmin
      ? query(
          collection(db, 'worker_transfers')
        )
      : query(
          collection(db, 'worker_transfers'),
          where('fromFermeId', '==', user.fermeId)
        );

    const unsubscribe = onSnapshot(transfersQuery, (snapshot) => {
      const transfers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkerTransfer[];
      
      // Sort by creation date, newest first
      transfers.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
      setOutgoingTransfers(transfers);
    });

    return () => unsubscribe();
  }, [user?.fermeId, isSuperAdmin]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'delivered':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'delivered':
        return <Truck className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmé';
      case 'rejected':
        return 'Rejeté';
      case 'cancelled':
        return 'Annulé';
      case 'delivered':
        return 'Livré';
      default:
        return status;
    }
  };

  const handleCancelTransfer = async (transfer: WorkerTransfer) => {
    if (transfer.status !== 'pending') {
      toast({
        title: "Erreur",
        description: "Seuls les transferts en attente peuvent être annulés.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const transferRef = doc(db, 'worker_transfers', transfer.id);
      await updateDoc(transferRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: user?.uid,
        cancelledByName: user?.nom || user?.email
      });

      toast({
        title: "Transfert annulé",
        description: "Le transfert a été annulé avec succès.",
      });
    } catch (error: any) {
      console.error('Error cancelling transfer:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'annulation du transfert.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (transfer: WorkerTransfer) => {
    setSelectedTransfer(transfer);
    setShowDetailsDialog(true);
  };

  if (outgoingTransfers.length === 0) {
    return null;
  }

  return (
    <>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="w-[98vw] max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du transfert</DialogTitle>
            <DialogDescription>
              {selectedTransfer && (
                <>Transfert vers {selectedTransfer.toFermeName}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-700">Statut</h4>
                  <Badge className={getStatusColor(selectedTransfer.status)}>
                    {getStatusIcon(selectedTransfer.status)}
                    <span className="ml-1">{getStatusLabel(selectedTransfer.status)}</span>
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-700">Créé le</h4>
                  <p className="text-sm">{new Date(selectedTransfer.createdAt.toDate()).toLocaleString('fr-FR')}</p>
                </div>
                {selectedTransfer.confirmedAt && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Confirmé le</h4>
                    <p className="text-sm">{new Date(selectedTransfer.confirmedAt.toDate()).toLocaleString('fr-FR')}</p>
                  </div>
                )}
                {selectedTransfer.rejectedAt && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Rejeté le</h4>
                    <p className="text-sm">{new Date(selectedTransfer.rejectedAt.toDate()).toLocaleString('fr-FR')}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Ouvriers transférés</h4>
                <div className="space-y-2">
                  {selectedTransfer.workers.map((worker) => (
                    <div key={worker.workerId} className="border rounded p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{worker.workerName}</span>
                        <Badge variant="outline" className="text-xs">
                          {worker.sexe === 'homme' ? 'Homme' : 'Femme'}
                        </Badge>
                      </div>
                      {worker.matricule && (
                        <p className="text-gray-600">Matricule: {worker.matricule}</p>
                      )}
                      <p className="text-gray-600">
                        Chambre actuelle: {worker.currentChambre} | Secteur: {worker.currentSecteur}
                      </p>
                      {selectedTransfer.status === 'confirmed' && selectedTransfer.roomAssignments?.[worker.workerId] && (
                        <p className="text-green-600 font-medium">
                          Assigné à: Chambre {selectedTransfer.roomAssignments[worker.workerId].chambre}, 
                          Secteur {selectedTransfer.roomAssignments[worker.workerId].secteur}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedTransfer.notes && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{selectedTransfer.notes}</p>
                </div>
              )}

              {selectedTransfer.rejectionReason && (
                <div>
                  <h4 className="font-medium text-sm text-red-700">Raison du rejet</h4>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {selectedTransfer.rejectionReason}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
