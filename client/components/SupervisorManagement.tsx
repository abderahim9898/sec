import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  UserPlus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Phone, 
  CheckCircle,
  Building,
  Search,
  Filter,
  Loader2
} from 'lucide-react';
import { Supervisor } from '@shared/types';
import { useToast } from '@/hooks/use-toast';

export default function SupervisorManagement() {
  const { user, isSuperAdmin } = useAuth();
  const { data: allSupervisors, addDocument, updateDocument, deleteDocument } = useFirestore('supervisors');
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'actif' | 'inactif'>('all');
  
  const [formData, setFormData] = useState({
    nom: '',
    telephone: '',
    company: '',
    statut: 'actif' as 'actif' | 'inactif'
  });

  // Use all supervisors since they are now global
  const supervisors = allSupervisors || [];

  // Filter supervisors based on search and status
  const filteredSupervisors = supervisors.filter(supervisor => {
    const matchesSearch = !searchTerm || 
      supervisor.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supervisor.telephone.includes(searchTerm) ||
      (supervisor.company && supervisor.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || supervisor.statut === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      nom: '',
      telephone: '',
      company: '',
      statut: 'actif'
    });
    setEditingSupervisor(null);
  };

  const validateForm = () => {
    if (!formData.nom.trim()) {
      toast({
        title: "Erreur de validation",
        description: "Le nom du superviseur est obligatoire",
        variant: "destructive"
      });
      return false;
    }
    
    if (!formData.telephone.trim()) {
      toast({
        title: "Erreur de validation",
        description: "Le numéro de téléphone est obligatoire",
        variant: "destructive"
      });
      return false;
    }

    // Validate phone number format (simple validation)
    const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
    if (!phoneRegex.test(formData.telephone)) {
      toast({
        title: "Erreur de validation",
        description: "Le format du numéro de téléphone n'est pas valide",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const supervisorData = {
        ...formData,
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim(),
        company: formData.company.trim(),
        updatedAt: new Date().toISOString()
      };

      if (editingSupervisor) {
        // Update existing supervisor
        await updateDocument(editingSupervisor.id, supervisorData);
        toast({
          title: "Succès",
          description: `Superviseur "${formData.nom}" mis à jour avec succès`,
          duration: 3000
        });
      } else {
        // Add new supervisor
        await addDocument({
          ...supervisorData,
          createdAt: new Date().toISOString()
        });
        toast({
          title: "Succès",
          description: `Superviseur "${formData.nom}" ajouté avec succès`,
          duration: 3000
        });
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('Error managing supervisor:', err);
      toast({
        title: "Erreur",
        description: `Erreur lors de la gestion du superviseur: ${err.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supervisor: Supervisor) => {
    setFormData({
      nom: supervisor.nom,
      telephone: supervisor.telephone,
      company: supervisor.company || '',
      statut: supervisor.statut
    });
    setEditingSupervisor(supervisor);
    setIsDialogOpen(true);
  };

  const handleDelete = async (supervisor: Supervisor) => {
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer le superviseur "${supervisor.nom}" ?\n\nCette action est irréversible et peut affecter les assignations d'ouvriers existantes.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      await deleteDocument(supervisor.id);
      toast({
        title: "Suppression réussie",
        description: `Superviseur "${supervisor.nom}" supprimé avec succès`,
        duration: 3000
      });
    } catch (err: any) {
      console.error('Error deleting supervisor:', err);
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    return (
      <Badge className={
        statut === 'actif' 
          ? 'bg-green-100 text-green-800 border-green-200' 
          : 'bg-red-100 text-red-800 border-red-200'
      }>
        {statut === 'actif' ? 'Actif' : 'Inactif'}
      </Badge>
    );
  };

  // Get unique companies for filter suggestions
  const uniqueCompanies = [...new Set(supervisors.map(s => s.company).filter(Boolean))];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl">
            <User className="mr-3 h-6 w-6 text-blue-600" />
            Gestion des Superviseurs
            <Badge variant="outline" className="ml-3 bg-blue-100 text-blue-800 border-blue-200">
              {filteredSupervisors.length} / {supervisors.length}
            </Badge>
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-200">
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter un superviseur
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg mx-2 sm:mx-auto mobile-dialog-container">
              <DialogHeader className="mobile-dialog-header">
                <DialogTitle className="flex items-center">
                  {editingSupervisor ? (
                    <>
                      <Edit className="mr-2 h-5 w-5" />
                      Modifier le superviseur
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Ajouter un nouveau superviseur
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {editingSupervisor 
                    ? 'Modifiez les informations du superviseur sélectionné'
                    : 'Remplissez les informations du nouveau superviseur pour l\'ajouter au système'
                  }
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 mobile-dialog-content">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom" className="text-sm font-medium">
                      Nom complet *
                    </Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                      placeholder="Ex: Ahmed Superviseur"
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone" className="text-sm font-medium">
                      <Phone className="inline mr-1 h-4 w-4" />
                      Téléphone *
                    </Label>
                    <Input
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="Ex: 0612345678"
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium">
                      <Building className="inline mr-1 h-4 w-4" />
                      Entreprise / Interime
                    </Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Ex: AGRI STRATEGY"
                      className="h-10"
                    />
                    {uniqueCompanies.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Entreprises existantes: {uniqueCompanies.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statut" className="text-sm font-medium">Statut</Label>
                    <Select
                      value={formData.statut}
                      onValueChange={(value: 'actif' | 'inactif') => setFormData(prev => ({ ...prev, statut: value }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="actif">
                          <div className="flex items-center">
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Actif
                          </div>
                        </SelectItem>
                        <SelectItem value="inactif">
                          <div className="flex items-center">
                            <AlertCircle className="mr-2 h-4 w-4 text-red-600" />
                            Inactif
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingSupervisor ? 'Modification...' : 'Ajout...'}
                      </>
                    ) : (
                      editingSupervisor ? 'Modifier' : 'Ajouter'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {supervisors.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <User className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun superviseur</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Commencez par ajouter votre premier superviseur pour organiser et gérer vos équipes d'ouvriers.
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter le premier superviseur
            </Button>
          </div>
        ) : (
          <>
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, téléphone ou entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'actif' | 'inactif') => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-48 h-10">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actifs seulement</SelectItem>
                  <SelectItem value="inactif">Inactifs seulement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Info */}
            {(searchTerm || statusFilter !== 'all') && (
              <div className="mb-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    {filteredSupervisors.length} superviseur(s) trouvé(s) sur {supervisors.length} au total
                    {searchTerm && ` pour "${searchTerm}"`}
                    {statusFilter !== 'all' && ` avec le statut "${statusFilter}"`}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Supervisors Table */}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Superviseur</TableHead>
                    <TableHead className="font-semibold">Entreprise</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupervisors.map((supervisor: Supervisor) => (
                    <TableRow key={supervisor.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{supervisor.nom}</div>
                            <div className="text-sm text-gray-500">ID: {supervisor.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">
                            {supervisor.company || (
                              <span className="text-gray-400 italic">Non spécifiée</span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4 text-gray-400" />
                          <span className="text-gray-700 font-mono">{supervisor.telephone}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(supervisor.statut)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(supervisor)}
                            className="hover:bg-blue-50 hover:border-blue-200"
                            disabled={loading}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                            onClick={() => handleDelete(supervisor)}
                            disabled={loading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredSupervisors.length === 0 && supervisors.length > 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat</h3>
                <p className="text-gray-600 mb-4">
                  Aucun superviseur ne correspond à vos critères de recherche.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  Effacer les filtres
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
