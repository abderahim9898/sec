import "./global.css";

import React, { useState, useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DataProvider } from "@/contexts/DataContext";
import { Layout } from "@/components/Layout";
import { LoginForm } from "@/components/LoginForm";
import { UserSetupDialog } from "@/components/UserSetupDialog";
import { UserSetupCheck } from "@/components/UserSetupCheck";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FirebaseStatus } from "@/components/FirebaseStatus";
import { NetworkStatus } from "@/components/NetworkStatus";
import { FirebaseErrorBoundary } from "@/components/FirebaseErrorBoundary";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Workers = lazy(() => import("./pages/Workers"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Fermes = lazy(() => import("./pages/Fermes"));
const Stock = lazy(() => import("./pages/Stock"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Transfers = lazy(() => import("./pages/Transfers"));
const AdminTools = lazy(() => import("./pages/AdminTools"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUserManagement = lazy(() => import("./pages/AdminUserManagement"));
const AdminContentManagement = lazy(() => import("./pages/AdminContentManagement"));
const AdminSupervisorManagement = lazy(() => import("./pages/AdminSupervisorManagement"));
const AdminSystemTools = lazy(() => import("./pages/AdminSystemTools"));
const AdminSecurityCenter = lazy(() => import("./pages/AdminSecurityCenter"));
const SuperAdminSetup = lazy(() => import("./pages/SuperAdminSetup"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimize QueryClient for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="space-y-4 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);

const ProtectedRoute = React.memo(({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    // Show setup dialog if user is authenticated but profile is incomplete
    if (isAuthenticated && user) {
      const isIncomplete = !user.nom || user.nom === 'Utilisateur' || !user.telephone;
      setShowSetup(isIncomplete);
    }
  }, [isAuthenticated, user]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginForm />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <UserSetupCheck>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
          <UserSetupDialog
            open={showSetup}
            onClose={() => setShowSetup(false)}
          />
        </Layout>
      </UserSetupCheck>
    </ErrorBoundary>
  );
});

ProtectedRoute.displayName = 'ProtectedRoute';

const AppRoutes = React.memo(() => {
  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/fermes" element={
        <ProtectedRoute>
          <Fermes />
        </ProtectedRoute>
      } />
      <Route path="/ouvriers" element={
        <ProtectedRoute>
          <Workers />
        </ProtectedRoute>
      } />
      <Route path="/workers" element={
        <ProtectedRoute>
          <Workers />
        </ProtectedRoute>
      } />
      <Route path="/workers/:id" element={
        <ProtectedRoute>
          <Workers />
        </ProtectedRoute>
      } />
      <Route path="/ouvriers/:id" element={
        <ProtectedRoute>
          <Workers />
        </ProtectedRoute>
      } />
      <Route path="/chambres" element={
        <ProtectedRoute>
          <Rooms />
        </ProtectedRoute>
      } />
      <Route path="/transferts" element={
        <ProtectedRoute>
          <Transfers />
        </ProtectedRoute>
      } />
      <Route path="/stock" element={
        <ProtectedRoute>
          <Stock />
        </ProtectedRoute>
      } />
      <Route path="/statistiques" element={
        <ProtectedRoute>
          <Statistics />
        </ProtectedRoute>
      } />
      <Route path="/Statistics" element={
        <ProtectedRoute>
          <Statistics />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute>
          <AdminUserManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/content" element={
        <ProtectedRoute>
          <AdminContentManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/supervisors" element={
        <ProtectedRoute>
          <AdminSupervisorManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/system" element={
        <ProtectedRoute>
          <AdminSystemTools />
        </ProtectedRoute>
      } />
      <Route path="/admin/security" element={
        <ProtectedRoute>
          <AdminSecurityCenter />
        </ProtectedRoute>
      } />
      <Route path="/admin-tools" element={
        <ProtectedRoute>
          <AdminTools />
        </ProtectedRoute>
      } />
      <Route path="/super-admin-setup" element={
        <Suspense fallback={<PageLoader />}>
          <SuperAdminSetup />
        </Suspense>
      } />
      <Route path="/SuperAdminSetup" element={
        <Suspense fallback={<PageLoader />}>
          <SuperAdminSetup />
        </Suspense>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/parametres" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="*" element={
        <Suspense fallback={<PageLoader />}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
  );
});

AppRoutes.displayName = 'AppRoutes';

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NetworkStatus />
          <FirebaseStatus />
          <FirebaseErrorBoundary>
            <AuthProvider>
              <NotificationProvider>
                <DataProvider>
                  <BrowserRouter>
                    <AppRoutes />
                  </BrowserRouter>
                </DataProvider>
              </NotificationProvider>
            </AuthProvider>
          </FirebaseErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

createRoot(document.getElementById("root")!).render(<App />);
