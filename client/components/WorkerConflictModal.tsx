import React, { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  AlertTriangle,
  User as UserIcon,
  Building,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Worker, Ferme, User } from '@shared/types';

interface WorkerConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingWorker: Worker | null;
  currentFarm: Ferme | null;
  formData: any;
  notificationSent: boolean;
  onConfirmAction?: () => void;
}

export const WorkerConflictModal: React.FC<WorkerConflictModalProps> = ({
  isOpen,
  onClose,
  existingWorker,
  currentFarm,
  formData,
  notificationSent,
  onConfirmAction
}) => {
  const { sendNotification } = useNotifications();
  const { user } = useAuth();
  const { data: fermes } = useFirestore<Ferme>('fermes');
  const { data: users } = useFirestore<User>('users');
  const [exitDate, setExitDate] = useState('');
  const [isAddingExitDate, setIsAddingExitDate] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isSendingFarmNotification, setIsSendingFarmNotification] = useState(false);
  const [manualNotificationSent, setManualNotificationSent] = useState(false);
  const [farmNotificationSent, setFarmNotificationSent] = useState(false);

  // Helper function to get superadmins
  const getSuperAdmins = async () => {
    const allUsers = users || [];
    return allUsers.filter(userData =>
      userData.role === 'superadmin' &&
      userData.uid !== user?.uid // Exclude current user
    );
  };

  if (!existingWorker || !currentFarm) return null;

  const handleAddExitDate = async () => {
    if (!exitDate) return;

    setIsAddingExitDate(true);
    try {
      // Here you would implement the logic to add exit date to the worker
      // For now, we'll just simulate it and send a notification

      // Send notification to the requesting farm that action has been taken
      if (formData?.attemptedBy && formData.fermeId) {
        // Find the requesting farm's admins to notify them
        const requestingFarm = fermes.find(f => f.id === formData.fermeId);
        if (requestingFarm?.admins) {
          for (const adminId of requestingFarm.admins) {
            await sendNotification({
              type: 'worker_exit_confirmed',
              title: '✅ Conflit résolu - Ouvrier disponible',
              message: `L'ouvrier ${existingWorker.nom} (CIN: ${existingWorker.cin}) est maintenant disponible. Sa date de sortie (${new Date(exitDate).toLocaleDateString('fr-FR')}) a été ajoutée par ${currentFarm.nom}. Vous pouvez maintenant l'enregistrer dans votre ferme.`,
              recipientId: adminId,
              recipientFermeId: formData.fermeId,
              status: 'unread',
              priority: 'high',
              actionData: {
                workerId: existingWorker.id,
                workerName: existingWorker.nom,
                workerCin: existingWorker.cin,
                actionRequired: 'Ouvrier disponible pour enregistrement',
                actionUrl: `/workers/add?prefill=${existingWorker.cin}`
              }
            });
          }
        }
      }

      setActionTaken(true);
    } catch (error) {
      console.error('Error adding exit date:', error);
    } finally {
      setIsAddingExitDate(false);
    }
  };

  const attemptingFarmName = fermes?.find(f => f.id === user?.fermeId)?.nom || 'Votre ferme';

  // Send notification to farm admins where worker is currently active
  const handleSendFarmNotification = async () => {
    if (!existingWorker || !currentFarm) return;

    setIsSendingFarmNotification(true);
    try {
      // Get valid farm admins (exclude current user and superadmins)
      const validAdmins = (currentFarm.admins || []).filter(adminId => {
        if (adminId === user?.uid) return false;
        const adminUser = users?.find(u => u.uid === adminId);
        if (adminUser?.role === 'superadmin') return false;
        return true;
      });

      const currentUserFarmName = fermes?.find(f => f.id === user?.fermeId)?.nom || 'une autre ferme';

      console.log('📋 Sending duplicate worker notification to farm admins:', {
        workerName: existingWorker.nom,
        workerCin: existingWorker.cin,
        currentFarm: currentFarm.nom,
        attemptingFarm: currentUserFarmName,
        validAdmins: validAdmins.length,
        adminIds: validAdmins
      });

      for (const adminId of validAdmins) {
        try {
          await sendNotification({
            type: 'worker_duplicate',
            title: '🚨 Tentative d\'enregistrement d\'un ouvrier actif',
            message: `L'ouvrier ${existingWorker.nom} (CIN: ${existingWorker.cin}) est actuellement actif dans votre ferme "${currentFarm.nom}" depuis le ${new Date(existingWorker.dateEntree).toLocaleDateString('fr-FR')}. Quelqu'un de "${currentUserFarmName}" tente maintenant de l'enregistrer dans leur ferme. Veuillez vérifier son statut et ajouter une date de sortie si l'ouvrier a quitté votre ferme.`,
            recipientId: adminId,
            recipientFermeId: currentFarm.id,
            status: 'unread',
            priority: 'urgent',
            createdBy: user?.uid,
            createdByName: user?.nom || user?.email || 'Utilisateur',
            actionData: {
              workerId: existingWorker.id,
              workerName: existingWorker.nom,
              workerCin: existingWorker.cin,
              requesterFermeId: user?.fermeId,
              requesterFermeName: currentUserFarmName,
              actionRequired: 'Ajouter une date de sortie à l\'ouvrier',
              actionUrl: `/workers?search=${existingWorker.cin}`
            }
          });
          console.log(`✅ Notification sent to farm admin ${adminId}`);
        } catch (notificationError) {
          console.error(`❌ Failed to send notification to farm admin ${adminId}:`, notificationError);
        }
      }
      setFarmNotificationSent(true);
    } catch (error) {
      console.error('❌ Failed to send notifications to farm admins:', error);
    } finally {
      setIsSendingFarmNotification(false);
    }
  };

  // Send notification to superadmins only about worker conflicts
  const handleSendNotification = async () => {
    if (!existingWorker || !currentFarm) return;

    setIsSendingNotification(true);
    try {
      // Get all superadmins instead of farm admins
      const superAdmins = await getSuperAdmins();
      const currentUserFarmName = fermes?.find(f => f.id === user?.fermeId)?.nom || 'une autre ferme';

      console.log('📋 Sending conflict notification to superadmins:', {
        workerName: existingWorker.nom,
        workerCin: existingWorker.cin,
        currentFarm: currentFarm.nom,
        attemptingFarm: currentUserFarmName,
        superAdminCount: superAdmins.length
      });

      for (const admin of superAdmins) {
        try {
          await sendNotification({
            type: 'worker_duplicate',
            title: '⚠️ Conflit d\'ouvrier détecté',
            message: `Conflit détecté: L'ouvrier ${existingWorker.nom} (CIN: ${existingWorker.cin}) est actif dans "${currentFarm.nom}" depuis le ${new Date(existingWorker.dateEntree).toLocaleDateString('fr-FR')}. Une tentative d'enregistrement a été faite depuis "${currentUserFarmName}". Intervention requise pour résoudre le conflit.`,
            recipientId: admin.id,
            recipientFermeId: admin.fermeId || 'central',
            status: 'unread',
            priority: 'urgent',
            createdBy: user?.uid,
            createdByName: user?.nom || user?.email || 'Utilisateur',
            actionData: {
              workerId: existingWorker.id,
              workerName: existingWorker.nom,
              workerCin: existingWorker.cin,
              requesterFermeId: user?.fermeId,
              requesterFermeName: currentUserFarmName,
              actionRequired: 'Résoudre conflit d\'ouvrier',
              actionUrl: `/workers?search=${existingWorker.cin}`
            }
          });
          console.log(`✅ Conflict notification sent to superadmin ${admin.id}`);
        } catch (notificationError) {
          console.error(`❌ Failed to send conflict notification to superadmin ${admin.id}:`, notificationError);
        }
      }
      setManualNotificationSent(true);
    } catch (error) {
      console.error('❌ Failed to send conflict notifications to superadmins:', error);
    } finally {
      setIsSendingNotification(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] max-w-3xl mx-1 sm:mx-auto max-h-[90vh] overflow-y-auto mobile-dialog-container">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100 mobile-dialog-header" style={{ height: '1px' }}>
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-semibold text-red-600">
            <AlertTriangle className="h-6 w-6" />
            Ouvrier déjà actif détecté
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Impossible d'enregistrer cet ouvrier car il est déjà actif dans une autre ferme
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6" style={{ padding: '24px 0 10px' }}>
          {/* Conflict Details */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-red-800 text-base">
                Conflit d'enregistrement détecté
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Ouvrier concerné:</span>
                  </div>
                  <div className="pl-6">
                    <p className="font-semibold">{existingWorker.nom}</p>
                    <p className="text-sm text-gray-600">CIN: {existingWorker.cin}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Ferme actuelle:</span>
                  </div>
                  <div className="pl-6">
                    <p className="font-semibold text-green-700">{currentFarm.nom}</p>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Actif
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Tentative d'enregistrement:</span>
                </div>
                <div className="pl-6 space-y-1">
                  <p><span className="font-medium">Ferme:</span> <span style={{ paddingLeft: '10px' }}>{attemptingFarmName}</span></p>
                  <p><span className="font-medium">Date d'entrée prévue:</span> <span style={{ paddingLeft: '10px' }}>{new Date(formData?.dateEntree).toLocaleDateString('fr-FR')}</span></p>
                  {formData?.chambre && (
                    <p><span className="font-medium">Chambre prévue:</span> <span style={{ paddingLeft: '10px' }}>{formData.chambre}</span></p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Status */}
          {manualNotificationSent && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Notification envoyée avec succès aux administrateurs de <strong>{currentFarm.nom}</strong>
                pour les informer de cette tentative d'enregistrement.
              </AlertDescription>
            </Alert>
          )}

          {!farmNotificationSent && (
            <Alert className="border-green-200 bg-green-50">
              <AlertTriangle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                💬 Cliquez sur le bouton "Notifier la ferme" ci-dessous pour informer les administrateurs de <strong>{currentFarm.nom}</strong> de cette tentative d'enregistrement.
              </AlertDescription>
            </Alert>
          )}

          {!manualNotificationSent && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                💬 Vous pouvez également notifier les superadministrateurs pour résoudre ce conflit.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Required */}
          <Card className="border-orange-200 bg-orange-50" />

          {/* Automated Action */}
          <Card className="border-blue-200 bg-blue-50" />

          {/* Farm Admin Notification Section */}
          {!farmNotificationSent && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-green-800 text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Notifier la ferme où l'ouvrier est actif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-green-700">
                  Informer les administrateurs de <strong>{currentFarm.nom}</strong> qu'une tentative d'enregistrement a eu lieu pour cet ouvrier qui est déjà actif dans leur ferme.
                </p>
                <Button
                  onClick={handleSendFarmNotification}
                  disabled={isSendingFarmNotification}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  {isSendingFarmNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Notifier la ferme {currentFarm.nom}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Manual Notification Section */}
          {!manualNotificationSent && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-blue-800 text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Escalader aux superadministrateurs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-blue-700">
                  Si le problème persiste, vous pouvez notifier les <strong>superadministrateurs</strong>
                  qu'une tentative d'enregistrement a eu lieu pour cet ouvrier.
                </p>
                <Button
                  onClick={handleSendNotification}
                  disabled={isSendingNotification}
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  {isSendingNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Notifier les superadmins
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              <span style={{ fontWeight: '800', fontSize: '20px' }}>Fermer</span>
            </Button>
            {onConfirmAction && (
              <Button
                onClick={onConfirmAction}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Continuer malgré tout
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
