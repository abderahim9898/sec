import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner, CardLoading, TableLoading } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Database, 
  Shield, 
  Settings, 
  UserCheck,
  Wrench
} from 'lucide-react';

// Admin Dashboard Loading State
export const AdminDashboardLoading: React.FC = () => (
  <div className="space-y-8">
    {/* Header Loading */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>

    {/* Stats Cards Loading */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* User Roles Breakdown Loading */}
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
        <CardTitle className="flex items-center">
          <Users className="mr-3 h-5 w-5 text-blue-600" />
          <Skeleton className="h-5 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="text-center space-y-3">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Navigation Cards Loading */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <div className="h-2 bg-gray-200"></div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex flex-wrap gap-1 mb-4">
                    {Array.from({ length: 3 }).map((_, badgeIndex) => (
                      <Skeleton key={badgeIndex} className="h-5 w-16 rounded-full" />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Loading */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="p-4">
              <CardLoading />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

// User Management Loading State
export const UserManagementLoading: React.FC = () => (
  <div className="space-y-8">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3">
        {/* Actions Card */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserCheck className="mr-3 h-6 w-6 text-blue-600" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="text-center p-4 bg-blue-50 rounded-lg">
                  <Skeleton className="h-8 w-8 mx-auto mb-2 rounded-full" />
                  <Skeleton className="h-4 w-20 mx-auto mb-2" />
                  <Skeleton className="h-6 w-12 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="mr-3 h-6 w-6 text-blue-600" />
                <Skeleton className="h-6 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
            
            {/* Table */}
            <div className="rounded-lg border">
              <div className="p-4 bg-gray-50 border-b">
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-4 w-20" />
                  ))}
                </div>
              </div>
              <div className="p-4">
                <TableLoading rows={6} columns={5} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="p-4">
              <CardLoading />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

// Supervisor Management Loading State
export const SupervisorManagementLoading: React.FC = () => (
  <div className="space-y-8">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserCheck className="mr-3 h-6 w-6 text-blue-600" />
                <Skeleton className="h-6 w-48" />
              </div>
              <Skeleton className="h-10 w-48 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
            
            <div className="rounded-lg border">
              <div className="p-4 bg-gray-50 border-b">
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-4 w-20" />
                  ))}
                </div>
              </div>
              <div className="p-4">
                <TableLoading rows={5} columns={5} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="p-4">
              <CardLoading />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

// Generic Admin Page Loading
export const AdminPageLoading: React.FC<{ title?: string }> = ({ title = "Chargement..." }) => (
  <div className="space-y-8">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <CardLoading />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Full page loading overlay
export const AdminFullPageLoading: React.FC<{ message?: string }> = ({ 
  message = "Chargement de l'administration..." 
}) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="p-4 bg-white rounded-full shadow-lg">
        <LoadingSpinner size="xl" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
        <p className="text-sm text-gray-600">Veuillez patienter...</p>
      </div>
    </div>
  </div>
);
