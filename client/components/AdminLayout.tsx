import React, { ReactNode, Suspense, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Settings,
  Users,
  Database,
  Shield,
  Wrench,
  ChevronRight,
  ArrowLeft,
  Home,
  UserCheck,
  LogOut,
  Loader2,
  Menu,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminErrorBoundary } from '@/components/AdminErrorBoundary';
import { AdminPageLoading } from '@/components/AdminLoadingStates';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export const AdminLayout = ({
  children,
  title,
  subtitle,
  showBackButton = true,
  breadcrumbs
}: AdminLayoutProps) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Redirect if not super admin
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 sm:p-4">
        <Card className="p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md text-center">
          <Shield className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Accès non autorisé
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            Seuls les super administrateurs peuvent accéder à cette section.
          </p>
          <Button onClick={() => navigate('/')} className="w-full min-h-[44px] touch-manipulation">
            <Home className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  const adminNavigation = [
    {
      name: 'Tableau de bord',
      href: '/admin',
      icon: Settings,
      description: 'Vue d\'ensemble de l\'administration'
    },
    {
      name: 'Utilisateurs',
      href: '/admin/users',
      icon: Users,
      description: 'Gestion des comptes utilisateurs'
    },
    {
      name: 'Superviseurs',
      href: '/admin/supervisors',
      icon: UserCheck,
      description: 'Gestion des superviseurs'
    },
    {
      name: 'Article',
      href: '/admin/content',
      icon: Database,
      description: 'Articles et données de référence'
    },
    {
      name: 'Sécurité',
      href: '/admin/security',
      icon: Shield,
      description: 'Codes de sécurité et permissions'
    },
    
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Administrateur';
      case 'admin': return 'Administrateur';
      case 'user': return 'Utilisateur';
      default: return role;
    }
  };

  const generateBreadcrumbs = () => {
    if (breadcrumbs) return breadcrumbs;
    
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [{ label: 'Administration', href: '/admin' }];
    
    if (pathSegments.length > 1) {
      const page = pathSegments[pathSegments.length - 1];
      const pageLabels: { [key: string]: string } = {
        'users': 'Utilisateurs',
        'supervisors': 'Superviseurs',
        'content': 'Article',
        'security': 'Sécurité',
        'system': 'Outils système'
      };
      
      if (pageLabels[page]) {
        items.push({ label: pageLabels[page] });
      }
    }
    
    return items;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Left side */}
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="hover:bg-gray-100 flex-shrink-0 min-h-[44px] px-2 sm:px-3"
                >
                  <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Administration</span>
                  <span className="xs:hidden">Admin</span>
                </Button>
              )}
              <div className="hidden sm:block flex-shrink-0">
                <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                  <Settings className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                  Centre d'Administration
                </h1>
                
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Mobile Navigation */}
          <div className="md:hidden" ref={mobileMenuRef}>
            {/* Mobile Navigation Header */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center">
                {adminNavigation.find(item => location.pathname === item.href)?.icon && (
                  React.createElement(
                    adminNavigation.find(item => location.pathname === item.href)!.icon,
                    { className: "h-4 w-4 mr-2 text-blue-600" }
                  )
                )}
                <span className="font-medium text-gray-900">
                  {adminNavigation.find(item => location.pathname === item.href)?.name || 'Navigation'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  "min-h-[44px] touch-manipulation transition-all duration-200",
                  isMobileMenuOpen
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-100"
                )}
                aria-expanded={isMobileMenuOpen}
                aria-label="Menu de navigation"
              >
                <Menu className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isMobileMenuOpen ? "rotate-90" : ""
                )} />
              </Button>
            </div>

            {/* Mobile Navigation Dropdown Menu */}
            {isMobileMenuOpen && (
              <div className="pb-3 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                <div className="grid gap-1 pt-3">
                  {adminNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          navigate(item.href);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          'flex items-center w-full px-3 py-3 text-left text-sm rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation',
                          isActive
                            ? 'bg-blue-100 text-blue-700 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
                        )}
                      >
                        <IconComponent className="h-4 w-4 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Alternative: Mobile Select Dropdown (commented out) */}
            {/*
            <div className="py-3">
              <Select
                value={location.pathname}
                onValueChange={(value) => navigate(value)}
              >
                <SelectTrigger className="w-full min-h-[44px] touch-manipulation">
                  <div className="flex items-center">
                    {adminNavigation.find(item => location.pathname === item.href)?.icon && (
                      React.createElement(
                        adminNavigation.find(item => location.pathname === item.href)!.icon,
                        { className: "h-4 w-4 mr-2 text-blue-600" }
                      )
                    )}
                    <SelectValue placeholder="Sélectionner une section" />
                  </div>
                </SelectTrigger>
                <SelectContent className="w-full">
                  {adminNavigation.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <SelectItem
                        key={item.href}
                        value={item.href}
                        className="min-h-[44px] touch-manipulation"
                      >
                        <div className="flex items-center py-2">
                          <IconComponent className="h-4 w-4 mr-3 text-gray-600" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            */}
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex space-x-4 lg:space-x-8 overflow-x-auto py-4 scrollbar-hide">
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    'flex items-center px-3 lg:px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap min-w-fit min-h-[44px] touch-manipulation',
                    isActive
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Breadcrumbs */}
        <div className="mb-4 sm:mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem />
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
              {adminNavigation.find(item => location.pathname === item.href)?.icon && (
                React.createElement(
                  adminNavigation.find(item => location.pathname === item.href)!.icon,
                  { className: "h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" }
                )
              )}
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight min-w-0 flex-1">
              <span className="block sm:inline">{title}</span>
              {subtitle && (
                <p className="text-sm sm:text-base text-gray-600 font-normal mt-1 sm:mt-0 sm:ml-2 sm:inline-block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-4 sm:space-y-6">
          <AdminErrorBoundary>
            <Suspense fallback={<AdminPageLoading title={title} />}>
              {children}
            </Suspense>
          </AdminErrorBoundary>
        </div>
      </main>
    </div>
  );
};
