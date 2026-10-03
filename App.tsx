import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, mapStringToRole } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Role } from './types';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageOrganisations from './pages/admin/ManageOrganisations';
import AdminReports from './pages/admin/AdminReports';

import OrganisationDashboard from './pages/organisation/OrganisationDashboard';
import ManageVolunteers from './pages/organisation/ManageVolunteers';
import OrganisationReports from './pages/organisation/OrganisationReports';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import NewMemberForm from './pages/volunteer/NewMemberForm';
import MemberUpdates from './pages/MemberUpdates';
import SupabaseDiagnostics from './pages/SupabaseDiagnostics';

const AUTH_ROUTE_STORAGE_KEY = 'ssk_last_authenticated_route';

const isRouteAllowedForRole = (route: string, rawRole: Role | string): boolean => {
  const role = mapStringToRole(rawRole);
  if (role === Role.MasterAdmin && route.startsWith('/admin')) return true;
  if (role === Role.Organisation && route.startsWith('/organisation')) return true;
  if (role === Role.Volunteer && route.startsWith('/volunteer')) return true;
  if (role === Role.MemberUpdates && route.startsWith('/member-updates')) return true;
  return false;
};

const getDefaultRouteForRole = (rawRole: Role | string): string => {
  const role = mapStringToRole(rawRole);
  if (role === Role.MasterAdmin) return '/admin';
  if (role === Role.Organisation) return '/organisation';
  if (role === Role.Volunteer) return '/volunteer/new-member';
  if (role === Role.MemberUpdates) return '/member-updates';
  return '/';
};

const RouteTracker: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user && location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/diagnostics') {
      try {
        localStorage.setItem(AUTH_ROUTE_STORAGE_KEY, location.pathname);
      } catch (e) {
        console.error("Failed to save route state:", e);
      }
    }
  }, [location.pathname, user]);

  return null;
};

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2.5 text-xs font-semibold text-slate-500">Checking credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = mapStringToRole(user.role);
  if (userRole !== requiredRole) {
    return <Navigate to={getDefaultRouteForRole(userRole)} replace />;
  }

  return children;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <HashRouter>
          <RouteTracker />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/diagnostics" element={<SupabaseDiagnostics />} />
            
            {/* Master Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole={Role.MasterAdmin}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/organisations" element={<ProtectedRoute requiredRole={Role.MasterAdmin}><ManageOrganisations /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requiredRole={Role.MasterAdmin}><AdminReports /></ProtectedRoute>} />
            
            {/* Organisation Routes */}
            <Route path="/organisation" element={<ProtectedRoute requiredRole={Role.Organisation}><OrganisationDashboard /></ProtectedRoute>} />
            <Route path="/organisation/volunteers" element={<ProtectedRoute requiredRole={Role.Organisation}><ManageVolunteers /></ProtectedRoute>} />
            <Route path="/organisation/reports" element={<ProtectedRoute requiredRole={Role.Organisation}><OrganisationReports /></ProtectedRoute>} />

            {/* Member Updates Dashboard (Independent) */}
            <Route path="/member-updates" element={<ProtectedRoute requiredRole={Role.MemberUpdates}><MemberUpdates /></ProtectedRoute>} />

            {/* Volunteer Routes */}
            <Route path="/volunteer" element={<ProtectedRoute requiredRole={Role.Volunteer}><VolunteerDashboard /></ProtectedRoute>} />
            <Route path="/volunteer/new-member" element={<ProtectedRoute requiredRole={Role.Volunteer}><NewMemberForm /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
