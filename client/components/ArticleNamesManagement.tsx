import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArticleName } from '@shared/types';


const UNITS = [
  'pièces',
  'kg',
  'litres',
  'mètres',
  'boîtes',
  'paquets',
  'tubes',
  'bouteilles',
  'cartons',
  'sacs'
];

export default function ArticleNamesManagement() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [articleNames, setArticleNames] = useState<ArticleName[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleName | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<ArticleName | null>(null);

  const [form, setForm] = useState({
    name: '',
    defaultUnit: 'pièces',
    description: ''
  });

  // Load article names
  useEffect(() => {
    if (!isSuperAdmin) return;

    const articleNamesQuery = collection(db, 'article_names');

    const unsubscribe = onSnapshot(
      articleNamesQuery,
      (snapshot) => {
        const articleNamesData: ArticleName[] = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ArticleName))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort in memory
        setArticleNames(articleNamesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading article names:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les noms d'articles",
          variant: "destructive"
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isSuperAdmin]);

  // Filter article names
  const filteredArticleNames = articleNames.filter(article => {
    const matchesSearch = article.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Reset form
  const resetForm = () => {
    setForm({
      name: '',
      defaultUnit: 'pièces',
      description: ''
    });
    setEditingArticle(null);
  };

  // Open edit dialog
  const openEditDialog = (article: ArticleName) => {
    setEditingArticle(article);
    setForm({
      name: article.name,
      defaultUnit: article.defaultUnit,
      description: article.description || ''
    });
    setIsAddDialogOpen(true);
  };

  // Close dialog
  const closeDialog = () => {
    setIsAddDialogOpen(false);
    resetForm();
  };

  // Add or edit article name
  const handleSaveArticleName = async () => {
    try {
      if (!form.name.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom de l'article est obligatoire",
          variant: "destructive"
        });
        return;
      }

      // Check for duplicate names (case insensitive)
      const isDuplicate = articleNames.some(article => 
        article.name.toLowerCase() === form.name.trim().toLowerCase() && 
        (!editingArticle || article.id !== editingArticle.id)
      );

      if (isDuplicate) {
        toast({
          title: "Erreur",
          description: "Un article avec ce nom existe déjà",
          variant: "destructive"
        });
        return;
      }

      if (editingArticle) {
        // Update existing article
        const articleRef = doc(db, 'article_names', editingArticle.id);
        await updateDoc(articleRef, {
          name: form.name.trim(),
          defaultUnit: form.defaultUnit,
          description: form.description.trim() || null,
          updatedAt: serverTimestamp()
        });

        toast({
          title: "Succès",
          description: "Nom d'article modifié avec succès"
        });
      } else {
        // Add new article
        const newArticleName: Partial<ArticleName> = {
          name: form.name.trim(),
          defaultUnit: form.defaultUnit,
          description: form.description.trim() || null,
          createdBy: user?.uid || '',
          createdByName: user?.nom || user?.email || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true
        };

        await addDoc(collection(db, 'article_names'), newArticleName);

        toast({
          title: "Succès",
          description: "Nom d'article ajouté avec succès"
        });
      }

      closeDialog();
    } catch (error) {
      console.error('Error saving article name:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le nom d'article",
        variant: "destructive"
      });
    }
  };

  // Toggle article active status
  const handleToggleStatus = async (article: ArticleName) => {
    try {
      const articleRef = doc(db, 'article_names', article.id);
      await updateDoc(articleRef, {
        isActive: !article.isActive,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Succès",
        description: `Article ${!article.isActive ? 'activé' : 'désactivé'} avec succès`
      });
    } catch (error) {
      console.error('Error toggling article status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut de l'article",
        variant: "destructive"
      });
    }
  };

  // Delete article name
  const handleDeleteArticleName = async () => {
    if (!articleToDelete) return;

    try {
      await deleteDoc(doc(db, 'article_names', articleToDelete.id));
      
      toast({
        title: "Succès",
        description: "Nom d'article supprimé avec succès"
      });
      
      setShowDeleteDialog(false);
      setArticleToDelete(null);
    } catch (error) {
      console.error('Error deleting article name:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le nom d'article",
        variant: "destructive"
      });
    }
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

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">
            Seuls les superadministrateurs peuvent gérer les noms d'articles.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Chargement des noms d'articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6" />
            Gestion des Noms d'Articles
          </h2>

        </div>

        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un Nom d'Article
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Noms d'Articles</p>
                <p className="text-2xl font-bold text-gray-900">{articleNames.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Articles Actifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {articleNames.filter(a => a.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Articles Inactifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {articleNames.filter(a => !a.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div>
            <Label htmlFor="search">Rechercher</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Article Names Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Noms d'Articles ({filteredArticleNames.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticleNames.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.name}</TableCell>
                    <TableCell>{article.defaultUnit}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {article.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={article.isActive ? "default" : "secondary"}
                        className={article.isActive ? "bg-green-100 text-green-800" : ""}
                      >
                        {article.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(article.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(article)}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={article.isActive ? "secondary" : "default"}
                          onClick={() => handleToggleStatus(article)}
                          title={article.isActive ? "Désactiver" : "Activer"}
                        >
                          {article.isActive ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setArticleToDelete(article);
                            setShowDeleteDialog(true);
                          }}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredArticleNames.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucun nom d'article trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="w-[95vw] max-w-lg mx-2 sm:mx-auto mobile-dialog-container">
          <DialogHeader className="mobile-dialog-header">
            <DialogTitle>
              {editingArticle ? 'Modifier le Nom d\'Article' : 'Ajouter un Nom d\'Article'}
            </DialogTitle>
            <DialogDescription>
              {editingArticle 
                ? 'Modifiez les informations du nom d\'article.' 
                : 'Ajoutez un nouveau nom d\'article prédéfini.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="articleName">Nom de l'Article *</Label>
              <Input
                id="articleName"
                placeholder="Ex: EPONGE"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="defaultUnit">Unité *</Label>
              <Select
                value={form.defaultUnit}
                onValueChange={(value) => setForm(prev => ({ ...prev, defaultUnit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Description de l'article (optionnel)"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveArticleName}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingArticle ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le nom d'article</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le nom d'article "{articleToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArticleName}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
