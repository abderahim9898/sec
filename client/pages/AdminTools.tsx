import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminTools() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    // Redirect to the new organized admin dashboard
    if (isSuperAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [navigate, isSuperAdmin]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600">Redirection vers le nouveau tableau de bord...</p>
      </div>
    </div>
  );
}
