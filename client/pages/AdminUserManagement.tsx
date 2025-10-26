import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserPlus, 
  Users, 
  AlertCircle, 
  Edit, 
  Trash2, 
  Shield, 
  CheckCircle,
  Search,
  Filter,
  Loader2,
  Mail,
  Phone,
  Building,
  TrendingUp,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserRole } from '@shared/types';
import { autoFixUserFarmAdmin } from '@/utils/autoFixFarmAdmin';
import { useToast } from '@/hooks/use-toast';

export default function AdminUserManagement() {
  const { user, isSuperAdmin } = useAuth();
  const { data: fermes } = useFirestore('fermes');
  const { data: allUsers, refetch: refetchUsers } = useFirestore('users');
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    telephone: '',
    role: 'user' as UserRole,
    fermeId: '',
    hasAllFarmsAccess: false
  });

  // Calculate user statistics
  const userStats = {
    total: allUsers?.length || 0,
    superAdmins: allUsers?.filter(u => u.role === 'superadmin').length || 0,
    admins: allUsers?.filter(u => u.role === 'admin').length || 0,
    users: allUsers?.filter(u => u.role === 'user').length || 0
  };

  const statsCards = [
    {
      title: 'Total utilisateurs',
      value: userStats.total,
      icon: Users,
      color: 'from-blue-600 to-blue-700',
      
      
    },
    {
      title: 'Super administrateurs',
      value: userStats.superAdmins,
      icon: Shield,
      color: 'from-red-600 to-red-700',
      
      
    },
    {
      title: 'Administrateurs',
      value: userStats.admins,
      icon: Shield,
      color: 'from-blue-600 to-blue-700',
      
      
    },
    {
      title: 'Utilisateurs',
      value: userStats.users,
      icon: Users,
      color: 'from-green-600 to-green-700',
      
      
    }
  ];

  // Filter users based on search and role
  const filteredUsers = allUsers?.filter(userItem => {
    const matchesSearch = !searchTerm || 
      userItem.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.telephone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || userItem.role === roleFilter;
    
    return matchesSearch && matchesRole;
  }) || [];

  const validateForm = (isCreating: boolean = false) => {
    if (!formData.nom.trim()) {
      toast({
        title: "Erreur de validation",
        description: "Le nom complet est obligatoire",
        variant: "destructive"
      });
      return false;
    }

    if (isCreating) {
      if (!formData.email.trim()) {
        toast({
          title: "Erreur de validation",
          description: "L'adresse email est obligatoire",
          variant: "destructive"
        });
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: "Erreur de validation",
          description: "L'adresse email n'est pas valide",
          variant: "destructive"
        });
        return false;
      }

      if (!formData.password || formData.password.length < 6) {
        toast({
          title: "Erreur de validation",
          description: "Le mot de passe doit contenir au moins 6 caractères",
          variant: "destructive"
        });
        return false;
      }
    }

    if (formData.telephone && formData.telephone.trim()) {
      const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.telephone)) {
        toast({
          title: "Erreur de validation",
          description: "Le format du numéro de téléphone n'est pas valide",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(true)) return;
    
    setLoading(true);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({
        title: "Erreur de session",
        description: "Session invalide. Veuillez vous reconnecter.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const newUserUid = userCredential.user.uid;

      let userData: any = {
        email: formData.email,
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim(),
        role: formData.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (formData.hasAllFarmsAccess) {
        userData.fermeId = 'all';
      } else if (formData.fermeId) {
        userData.fermeId = formData.fermeId;
      }

      await setDoc(doc(db, 'users', newUserUid), userData);

      if (formData.role === 'admin' && formData.fermeId && formData.fermeId !== 'all') {
        try {
          const userForFix = {
            uid: newUserUid,
            fermeId: formData.fermeId
          };
          await autoFixUserFarmAdmin(userForFix);
        } catch (fixError) {
          console.error('Failed to auto-fix farm admin for new user:', fixError);
        }
      }

      await auth.signOut();

      toast({
        title: "Utilisateur créé",
        description: `Compte "${formData.email}" créé avec succès`,
        duration: 5000
      });

      setFormData({
        email: '',
        password: '',
        nom: '',
        telephone: '',
        role: 'user',
        fermeId: '',
        hasAllFarmsAccess: false
      });
      setIsCreateDialogOpen(false);
      refetchUsers();

    } catch (error: any) {
      let errorMessage = 'Erreur lors de la création de l\'utilisateur';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Cette adresse email est déjà utilisée';
          break;
        case 'auth/weak-password':
          errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (userToEdit: any) => {
    setEditingUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      password: '',
      nom: userToEdit.nom,
      telephone: userToEdit.telephone || '',
      role: userToEdit.role,
      fermeId: userToEdit.fermeId === 'all' ? '' : (userToEdit.fermeId || ''),
      hasAllFarmsAccess: userToEdit.fermeId === 'all'
    });
    setIsUserDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!validateForm(false)) return;

    setLoading(true);

    try {
      const userData: any = {
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim(),
        role: formData.role,
        updatedAt: new Date()
      };

      if (formData.hasAllFarmsAccess) {
        userData.fermeId = 'all';
      } else if (formData.fermeId) {
        userData.fermeId = formData.fermeId;
      } else {
        userData.fermeId = null;
      }

      await updateDoc(doc(db, 'users', editingUser.id), userData);

      if (formData.role === 'admin' && formData.fermeId && formData.fermeId !== 'all') {
        try {
          const userForFix = {
            uid: editingUser.id,
            fermeId: formData.fermeId
          };
          const fixResult = await autoFixUserFarmAdmin(userForFix);
          if (fixResult.userAdded) {
            toast({
              title: "Utilisateur mis à jour",
              description: `${editingUser.email} mis à jour et ajouté aux admins de la ferme`,
              duration: 5000
            });
          } else {
            toast({
              title: "Utilisateur mis à jour",
              description: `${editingUser.email} mis à jour avec succès`,
              duration: 5000
            });
          }
        } catch (fixError) {
          toast({
            title: "Utilisateur mis à jour",
            description: `${editingUser.email} mis à jour (erreur lors de l'ajout aux admins)`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Utilisateur mis à jour",
          description: `${editingUser.email} mis à jour avec succès`,
          duration: 5000
        });
      }

      setEditingUser(null);
      setIsUserDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        nom: '',
        telephone: '',
        role: 'user',
        fermeId: '',
        hasAllFarmsAccess: false
      });

      refetchUsers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: any) => {
    if (userToDelete.id === user?.uid) {
      toast({
        title: "Action impossible",
        description: "Vous ne pouvez pas supprimer votre propre compte",
        variant: "destructive"
      });
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer l'utilisateur "${userToDelete.email}" ?\n\nCette action est irréversible et supprimera toutes les données associées.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      toast({
        title: "Utilisateur supprimé",
        description: `${userToDelete.email} a été supprimé avec succès`,
        duration: 5000
      });
      refetchUsers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrateur';
      case 'user': return 'Utilisateur';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800 border-red-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFermeName = (fermeId: string) => {
    if (!fermeId) return 'Aucune ferme';
    if (fermeId === 'all') return 'Toutes les fermes';
    if (!fermes || fermes.length === 0) return fermeId;
    const ferme = fermes.find(f => f.id === fermeId);
    return ferme ? ferme.nom : fermeId;
  };

  return (
    <AdminLayout
      title="Gestion des utilisateurs"
      
      breadcrumbs={[
        { label: 'Administration', href: '/admin' },
        { label: 'Utilisateurs' }
      ]}
    >
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden border-0 shadow-lg">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`}></div>
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {stat.change}
                  </Badge>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    {stat.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* User Management Actions */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <UserPlus className="mr-3 h-6 w-6 text-blue-600" />
                  Actions utilisateurs
                </CardTitle>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-200">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Créer un utilisateur
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-lg mx-2 sm:mx-auto mobile-dialog-container">
                    <DialogHeader className="mobile-dialog-header">
                      <DialogTitle className="flex items-center">
                        <UserPlus className="mr-2 h-5 w-5" />
                        Créer un nouvel utilisateur
                      </DialogTitle>
                      <DialogDescription>
                        Créez un nouveau compte utilisateur avec les permissions appropriées
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleCreateUser} className="space-y-6 mobile-dialog-content">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">
                            <Mail className="inline mr-1 h-4 w-4" />
                            Email *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="utilisateur@exemple.com"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password">Mot de passe *</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Au moins 6 caractères"
                              required
                              minLength={6}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nom">Nom complet *</Label>
                          <Input
                            id="nom"
                            value={formData.nom}
                            onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                            placeholder="Nom et prénom"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="telephone">
                            <Phone className="inline mr-1 h-4 w-4" />
                            Téléphone
                          </Label>
                          <Input
                            id="telephone"
                            value={formData.telephone}
                            onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                            placeholder="0612345678"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Rôle *</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">
                              <div className="flex items-center">
                                <Users className="mr-2 h-4 w-4 text-gray-600" />
                                Utilisateur
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center">
                                <Shield className="mr-2 h-4 w-4 text-blue-600" />
                                Administrateur
                              </div>
                            </SelectItem>
                            <SelectItem value="superadmin">
                              <div className="flex items-center">
                                <Shield className="mr-2 h-4 w-4 text-red-600" />
                                Super Administrateur
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Farm Assignment Section */}
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <Label className="text-base font-semibold flex items-center">
                          <Building className="mr-2 h-4 w-4" />
                          Accès aux fermes
                        </Label>

                        <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                          <input
                            type="checkbox"
                            id="allFarmsAccess"
                            checked={formData.hasAllFarmsAccess}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              hasAllFarmsAccess: e.target.checked,
                              fermeId: e.target.checked ? '' : prev.fermeId
                            }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <Label htmlFor="allFarmsAccess" className="text-sm text-blue-700">
                            Accès à toutes les fermes (comme un super administrateur)
                          </Label>
                        </div>

                        {!formData.hasAllFarmsAccess && (
                          <div className="space-y-2">
                            <Label>Ferme spécifique assignée</Label>
                            <Select
                              value={formData.fermeId}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, fermeId: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une ferme (optionnel)" />
                              </SelectTrigger>
                              <SelectContent>
                                {fermes?.map(ferme => (
                                  <SelectItem key={ferme.id} value={ferme.id}>
                                    {ferme.nom}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">
                              Laissez vide si l'utilisateur n'a pas besoin d'accès spécifique à une ferme
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>
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
                              Création...
                            </>
                          ) : (
                            'Créer l\'utilisateur'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-900">Total utilisateurs</p>
                  <p className="text-2xl font-bold text-blue-700">{userStats.total}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-900">Comptes actifs</p>
                  <p className="text-2xl font-bold text-green-700">{userStats.total}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-purple-900">Administrateurs</p>
                  <p className="text-2xl font-bold text-purple-700">{userStats.admins + userStats.superAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="mr-3 h-6 w-6 text-blue-600" />
                  Liste des utilisateurs
                  <Badge variant="outline" className="ml-3 bg-blue-100 text-blue-800 border-blue-200">
                    {filteredUsers.length} / {userStats.total}
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, email ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(value: 'all' | UserRole) => setRoleFilter(value)}>
                  <SelectTrigger className="w-full sm:w-48 h-10">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="superadmin">Super admins</SelectItem>
                    <SelectItem value="admin">Administrateurs</SelectItem>
                    <SelectItem value="user">Utilisateurs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Info */}
              {(searchTerm || roleFilter !== 'all') && (
                <div className="mb-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      {filteredUsers.length} utilisateur(s) trouvé(s) sur {userStats.total} au total
                      {searchTerm && ` pour "${searchTerm}"`}
                      {roleFilter !== 'all' && ` avec le rôle "${getRoleLabel(roleFilter)}"`}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Utilisateur</TableHead>
                      <TableHead className="font-semibold">Rôle</TableHead>
                      <TableHead className="font-semibold">Ferme</TableHead>
                      <TableHead className="font-semibold">Contact</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userItem) => (
                      <TableRow key={userItem.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{userItem.nom}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="mr-1 h-3 w-3" />
                                {userItem.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(userItem.role)}>
                            {getRoleLabel(userItem.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="text-gray-700 text-sm">
                              {getFermeName(userItem.fermeId)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Phone className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="text-gray-700 text-sm font-mono">
                              {userItem.telephone || (
                                <span className="text-gray-400 italic">Non renseigné</span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(userItem)}
                              className="hover:bg-blue-50 hover:border-blue-200"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {userItem.id !== user?.uid && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                                onClick={() => handleDeleteUser(userItem)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredUsers.length === 0 && userStats.total > 0 && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat</h3>
                  <p className="text-gray-600 mb-4">
                    Aucun utilisateur ne correspond à vos critères de recherche.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                    }}
                  >
                    Effacer les filtres
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-lg flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total utilisateurs</span>
                  <Badge variant="outline">{userStats.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Super admins</span>
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    {userStats.superAdmins}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Administrateurs</span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {userStats.admins}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Utilisateurs</span>
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                    {userStats.users}
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Votre rôle</span>
                    <Badge className={getRoleBadgeColor(user?.role || '')}>
                      {getRoleLabel(user?.role || '')}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="text-lg">Répartition des rôles</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Super Administrateurs</span>
                    <span>{userStats.total > 0 ? Math.round((userStats.superAdmins / userStats.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${userStats.total > 0 ? (userStats.superAdmins / userStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Administrateurs</span>
                    <span>{userStats.total > 0 ? Math.round((userStats.admins / userStats.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${userStats.total > 0 ? (userStats.admins / userStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Utilisateurs</span>
                    <span>{userStats.total > 0 ? Math.round((userStats.users / userStats.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-600 h-2 rounded-full" 
                      style={{ width: `${userStats.total > 0 ? (userStats.users / userStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg mx-2 sm:mx-auto mobile-dialog-container">
          <DialogHeader className="mobile-dialog-header">
            <DialogTitle className="flex items-center">
              <Edit className="mr-2 h-5 w-5" />
              Modifier l'utilisateur
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations et permissions de l'utilisateur sélectionné
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom complet *</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telephone">
                  <Phone className="inline mr-1 h-4 w-4" />
                  Téléphone
                </Label>
                <Input
                  id="edit-telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Rôle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="superadmin">Super Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <Label className="text-base font-semibold flex items-center">
                  <Building className="mr-2 h-4 w-4" />
                  Accès aux fermes
                </Label>

                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="editAllFarmsAccess"
                    checked={formData.hasAllFarmsAccess}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      hasAllFarmsAccess: e.target.checked,
                      fermeId: e.target.checked ? '' : prev.fermeId
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="editAllFarmsAccess" className="text-sm text-blue-700">
                    Accès à toutes les fermes
                  </Label>
                </div>

                {!formData.hasAllFarmsAccess && (
                  <div className="space-y-2">
                    <Label>Ferme spécifique assignée</Label>
                    <Select
                      value={formData.fermeId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fermeId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une ferme (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        {fermes?.map(ferme => (
                          <SelectItem key={ferme.id} value={ferme.id}>
                            {ferme.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setIsUserDialogOpen(false)}>
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
                    Mise à jour...
                  </>
                ) : (
                  'Mettre à jour'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
