import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Wrench, Package, AlertCircle, Users, Key, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { syncRoomOccupancy } from '@/utils/roomOccupancySync';
import { autoFixUserFarmAdmin } from '@/utils/autoFixFarmAdmin';
import {
  findUsersWithoutFarms,
  autoAssignUsersToFarms
} from '@/utils/userFarmAssignment';

export default function AdminSystemTools() {
  const { user, isSuperAdmin } = useAuth();
  const { data: allUsers, refetch: refetchUsers } = useFirestore('users');
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Accès non autorisé
              </h3>
              <p className="text-gray-600">
                Seuls les super administrateurs peuvent accéder à cette page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSyncRoomOccupancy = async () => {
    setLoading(true);
    try {
      await syncRoomOccupancy();
      toast({
        title: "Succès",
        description: "Synchronisation des chambres terminée avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error('Error syncing room occupancy:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la synchronisation des chambres",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Wrench className="mr-3 h-8 w-8" />
              Outils système
            </h1>
            <p className="text-gray-600 mt-2">
              Synchronisation et outils de débogage
            </p>
          </div>
        </div>
      </div>

      {/* System Maintenance Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Room Occupancy Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Synchronisation des chambres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-gray-600 mb-4">
                Synchronise l'occupation des chambres avec les assignations réelles des ouvriers.
                Utile pour corriger les incohérences après suppression d'ouvriers.
              </p>
              <Button
                onClick={handleSyncRoomOccupancy}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Synchroniser les chambres
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Farm Assignment Debug */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Débogage - Assignations de fermes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Cette section aide à diagnostiquer et corriger les problèmes d'assignation de fermes aux utilisateurs.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const usersWithoutFarms = await findUsersWithoutFarms();
                      setMessage(`Trouvé ${usersWithoutFarms.length} utilisateur(s) sans ferme assignée:\n${usersWithoutFarms.map(u => `• ${u.nom} (${u.email}) - ${u.role}`).join('\n')}`);
                    } catch (error) {
                      setError(`Erreur: ${error}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Détecter utilisateurs sans ferme
                </Button>

                <Button
                  onClick={async () => {
                    if (!window.confirm('Ceci va assigner automatiquement tous les utilisateurs sans ferme à la première ferme disponible. Continuer ?')) {
                      return;
                    }
                    setLoading(true);
                    try {
                      const result = await autoAssignUsersToFarms();
                      setMessage(`Assignation automatique terminée:\n• ${result.assigned} utilisateur(s) assigné(s)\n• ${result.errors.length} erreur(s)\n\nAssignations:\n${result.assignments.map(a => `• ${a.userName} → ${a.farmName}`).join('\n')}\n\nErreurs:\n${result.errors.join('\n')}`);
                      refetchUsers();
                    } catch (error) {
                      setError(`Erreur: ${error}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Auto-assigner utilisateurs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Farm Admin Debug Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Outils de débogage - Administrateurs de ferme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ces outils permettent de corriger les problèmes de synchronisation entre les rôles utilisateur et les assignations d'administrateurs de ferme.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { debugFarmAdminData } = await import('@/utils/debugFarmAdmins');
                    const result = await debugFarmAdminData();
                    alert(`🏢 Analyse des administrateurs de ferme:\n\n` +
                      `• Total fermes: ${result.summary.totalFarms}\n` +
                      `🏗️ Fermes avec admins: ${result.summary.farmsWithAdmins}\n` +
                      `• Total assignments admin: ${result.summary.totalAdminAssignments}\n` +
                      `• Utilisateurs admin: ${result.summary.adminUsers}\n\n` +
                      `Voir console pour détails complets.`);
                  } catch (error) {
                    console.error('Debug failed:', error);
                    alert(`❌ Debug échoué: ${error}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Analyser toutes les fermes
              </Button>

              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    // Fix all admin users who have role=admin but are not in their farm's admins array
                    const adminUsers = allUsers?.filter(u => u.role === 'admin' && u.fermeId) || [];
                    let fixedCount = 0;
                    let errorCount = 0;

                    for (const adminUser of adminUsers) {
                      try {
                        const userForFix = {
                          uid: adminUser.id,
                          fermeId: adminUser.fermeId
                        };
                        const fixResult = await autoFixUserFarmAdmin(userForFix);
                        if (fixResult.userAdded) {
                          fixedCount++;
                        }
                      } catch (error) {
                        console.error(`Failed to fix admin ${adminUser.email}:`, error);
                        errorCount++;
                      }
                    }

                    alert(`🔧 Réparation automatique terminée:\n\n` +
                      `• Utilisateurs admin traités: ${adminUsers.length}\n` +
                      `• Corrections appliquées: ${fixedCount}\n` +
                      ` Erreurs: ${errorCount}\n\n` +
                      `Les administrateurs ont été synchronisés avec leurs fermes.`);

                  } catch (error) {
                    console.error('Auto-fix failed:', error);
                    alert(`❌ Réparation échouée: ${error}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Shield className="mr-2 h-4 w-4" />
                Réparer tous les admins
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-600" />
              Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="font-semibold">{allUsers?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Admins:</span>
                <span className="font-semibold">{allUsers?.filter(u => u.role === 'admin').length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Super admins:</span>
                <span className="font-semibold">{allUsers?.filter(u => u.role === 'superadmin').length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5 text-green-600" />
              Statut système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Base de données</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Authentification</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Stockage</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-orange-600" />
              Actions récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Dernière synchronisation: Aujourd'hui
              </p>
              <p className="text-sm text-gray-600">
                Dernière réparation: Aucune
              </p>
              <p className="text-sm text-gray-600">
                Statut: Opérationnel
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      {message && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800 whitespace-pre-line">
            {message}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Guide des outils système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Synchronisation des chambres</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Corrige les incohérences d'occupation des chambres</li>
                <li>• Utile après suppression en masse d'ouvriers</li>
                <li>• Met à jour les compteurs d'occupants actuels</li>
                <li>• Supprime les références aux ouvriers supprimés</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Débogage des fermes</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Détecte les utilisateurs sans assignation de ferme</li>
                <li>• Assigne automatiquement les utilisateurs orphelins</li>
                <li>• Synchronise les rôles admin avec les fermes</li>
                <li>• Corrige les problèmes de permissions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
