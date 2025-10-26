import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import WorkerTransferNotifications from '@/components/WorkerTransferNotifications';
import WorkerTransferStatus from '@/components/WorkerTransferStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Database, 
  UserCheck, 
  BedDouble,
  Shield, 
  Wrench, 
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Server,
  ArrowRight,
  Plus,
  Settings
} from 'lucide-react';
import Rooms from './Rooms';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: allUsers } = useFirestore('users');
  const { data: fermes } = useFirestore('fermes');
  const { data: rooms } = useFirestore('rooms');
  const { data: supervisors } = useFirestore('supervisors');
  const navigate = useNavigate();

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

  // Stats calculations
  const userStats = {
    total: allUsers?.length || 0,
    superAdmins: allUsers?.filter(u => u.role === 'superadmin').length || 0,
    admins: allUsers?.filter(u => u.role === 'admin').length || 0,
    users: allUsers?.filter(u => u.role === 'user').length || 0
  };

  const systemStats = [
    {
      title: 'Utilisateurs totaux',
      value: userStats.total,
      icon: Users,
      color: 'from-blue-600 to-blue-700',
      
    },
    {
      title: 'Superviseurs',
      value: supervisors?.length || 0,
      icon: UserCheck,
      color: 'from-purple-600 to-purple-700',
      
    },
    {
      title: 'Fermes actives',
      value: fermes?.length || 0,
      icon: Database,
      color: 'from-green-600 to-green-700',
     
      
    },
    
    {
      title: 'Total chambre',
      value: rooms?.length || 0,
      icon: BedDouble,
      color: 'bg-gradient-to-r from-gray-600 to-gray-800',
      
    },
  ];

  const navigationCards = [
    {
      title: 'Gestion des utilisateurs',
      
      icon: Users,
      path: '/admin/users',
      color: 'from-blue-600 to-indigo-600',
      stats: `${userStats.total} utilisateurs`,
      actions: ['Créer un utilisateur', 'Gérer les rôles', 'Permissions'],
      priority: 'high'
    },
    {
      title: 'Gestion des superviseurs',
      description: 'Superviseurs et leurs assignations aux équipes et projets',
      icon: UserCheck,
      path: '/admin/supervisors',
      color: 'from-purple-600 to-violet-600',
      stats: `${supervisors?.length || 0} superviseurs`,
      actions: ['Ajouter superviseur', 'Assignations', 'Équipes'],
      priority: 'high'
    },
    {
      title: 'Gestion du contenu',
      description: 'Articles, données de référence et configuration du système',
      icon: Database,
      path: '/admin/content',
      color: 'from-green-600 to-emerald-600',
      stats: `${fermes?.length || 0} fermes`,
      actions: ['Articles', 'Données', 'Configuration'],
      priority: 'medium'
    },
    {
      title: 'Centre de sécurité',
      description: 'Codes de sécurité, permissions et gestion des administrateurs',
      icon: Shield,
      path: '/admin/security',
      color: 'from-red-600 to-rose-600',
      stats: 'Sécurité renforcée',
      actions: ['Codes sécurité', 'Permissions', 'Audit'],
      priority: 'high'
    },
    {
      title: 'Outils système',
      description: 'Synchronisation, maintenance et outils de débogage avancés',
      icon: Wrench,
      path: '/admin/system',
      color: 'from-orange-600 to-amber-600',
      stats: 'Maintenance',
      actions: ['Synchronisation', 'Debug', 'Logs'],
      priority: 'medium'
    }
  ];

  const quickActions = [
    {
      title: 'Créer un utilisateur',
      description: 'Ajouter un nouveau compte utilisateur',
      icon: Plus,
      action: () => navigate('/admin/users'),
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      title: 'Code de sécurité',
      description: 'Générer un code de suppression',
      icon: Shield,
      action: () => navigate('/admin/security'),
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      title: 'Créer un superviseur',
      description: 'Ajouter un nouveau compte superviseur',
      icon: Wrench,
      action: () => navigate('/admin/supervisors'),
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    }
  ];

  const recentActivity = [
    {
      action: 'Nouvel utilisateur créé',
      description: 'Compte administrateur ajouté',
      time: 'Il y a 2 heures',
      icon: Users,
      type: 'success'
    },
    {
      action: 'Synchronisation système',
      description: 'Chambres synchronisées avec succès',
      time: 'Il y a 4 heures',
      icon: CheckCircle,
      type: 'info'
    },
    {
      action: 'Code de sécurité généré',
      description: 'Nouveau code de suppression créé',
      time: 'Il y a 6 heures',
      icon: Shield,
      type: 'warning'
    }
  ];

  return (
    <AdminLayout
      title="Tableau de bord"
      
      showBackButton={false}
    >
      {/* System Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {systemStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden border-0 shadow-lg">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`}></div>
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    {stat.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Worker Transfer Notifications */}
      <WorkerTransferNotifications />

      {/* Worker Transfer Status */}
      <WorkerTransferStatus />

      {/* User Roles Breakdown */}
      <Card className="mb-8 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="flex items-center">
            <Users className="mr-3 h-5 w-5 text-blue-600" />
            Répartition des utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">{userStats.total}</div>
              <p className="text-sm text-gray-600 mb-3">Total utilisateurs</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">{userStats.superAdmins}</div>
              <p className="text-sm text-gray-600 mb-3">Super admins</p>
              <Badge className={getRoleBadgeColor('superadmin')}>
                {userStats.total > 0 ? Math.round((userStats.superAdmins / userStats.total) * 100) : 0}%
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">{userStats.admins}</div>
              <p className="text-sm text-gray-600 mb-3">Administrateurs</p>
              <Badge className={getRoleBadgeColor('admin')}>
                {userStats.total > 0 ? Math.round((userStats.admins / userStats.total) * 100) : 0}%
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 mb-2">{userStats.users}</div>
              <p className="text-sm text-gray-600 mb-3">Utilisateurs</p>
              <Badge className={getRoleBadgeColor('user')}>
                {userStats.total > 0 ? Math.round((userStats.users / userStats.total) * 100) : 0}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Cards */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Modules d'administration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {navigationCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <Card 
                  key={index}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden"
                  onClick={() => navigate(card.path)}
                >
                  <div className={`h-2 bg-gradient-to-r ${card.color}`}></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${card.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                      >
                        {card.priority === 'high' ? 'Priorité haute' : 'Priorité normale'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg group-hover:text-blue-600 transition-colors duration-200">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {card.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {card.actions.map((action, actionIndex) => (
                        <Badge key={actionIndex} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {card.stats}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className={`w-full justify-start h-auto p-4 ${action.color} border transition-all duration-200`}
                      onClick={action.action}
                    >
                      <div className="flex items-start">
                        <IconComponent className="h-5 w-5 mr-3 mt-0.5" />
                        <div className="text-left">
                          <div className="font-medium text-sm">{action.title}</div>
                          <div className="text-xs text-gray-600">{action.description}</div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          

          

          {/* Current User Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="text-lg">Session actuelle</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.nom}</p>
                  <p className="text-xs text-gray-600">{user?.email}</p>
                </div>
                <Badge className={getRoleBadgeColor(user?.role || '')}>
                  {getRoleLabel(user?.role || '')}
                </Badge>
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    Connecté depuis le centre d'administration
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
