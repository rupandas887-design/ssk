import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Role } from './types';
import AuthLoadingSplash from './components/ui/AuthLoadingSplash';

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

const AUTH_ROUTE_STORAGE_KEY = 'ssk_last_authenticated_route';

const isRouteAllowedForRole = (route: string, role: Role | string): boolean => {
  if (role === Role.MasterAdmin && route.startsWith('/admin')) return true;
  if (role === Role.Organisation && route.startsWith('/organisation')) return true;
  if (role === Role.Volunteer && route.startsWith('/volunteer')) return true;
  if (role === Role.MemberUpdates && route.startsWith('/member-updates')) return true;
  return false;
};

const getDefaultRouteForRole = (role: Role | string): string => {
  if (role === Role.MasterAdmin) return '/admin';
  if (role === Role.Organisation) return '/organisation';
  if (role === Role.Volunteer) return '/volunteer/new-member';
  if (role === Role.MemberUpdates) return '/member-updates';
  return '/login';
};

const RouteTracker: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user && location.pathname !== '/' && location.pathname !== '/login') {
      try {
        localStorage.setItem(AUTH_ROUTE_STORAGE_KEY, location.pathname);
      } catch (e) {
        console.error("Failed to save route state:", e);
      }
    }
  }, [location.pathname, user]);

  return null;
};

const hasStoredAuthToken = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('ssk_mock_session')) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = localStorage.getItem(key);
        if (val && val.includes('access_token')) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

const PublicLandingRoute: React.FC = () => {
  const { user, loading } = useAuth();

  // If already authenticated, restore to their active route or role default
  if (user) {
    const savedRoute = localStorage.getItem(AUTH_ROUTE_STORAGE_KEY);
    if (savedRoute && isRouteAllowedForRole(savedRoute, user.role)) {
      return <Navigate to={savedRoute} replace />;
    }
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  // Only display splash screen if loading AND an actual session token exists in local storage
  if (loading && hasStoredAuthToken()) {
    return <AuthLoadingSplash />;
  }

  return <LandingPage />;
};

const LoginRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingSplash />;
  }

  if (user) {
    const savedRoute = localStorage.getItem(AUTH_ROUTE_STORAGE_KEY);
    if (savedRoute && isRouteAllowedForRole(savedRoute, user.role)) {
      return <Navigate to={savedRoute} replace />;
    }
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <LoginPage />;
};

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingSplash />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== requiredRole) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return children;
};

const CatchAllRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingSplash />;
  }

  if (user) {
    const savedRoute = localStorage.getItem(AUTH_ROUTE_STORAGE_KEY);
    if (savedRoute && isRouteAllowedForRole(savedRoute, user.role)) {
      return <Navigate to={savedRoute} replace />;
    }
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <Navigate to="/" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <HashRouter>
          <RouteTracker />
          <Routes>
            <Route path="/" element={<PublicLandingRoute />} />
            <Route path="/login" element={<LoginRoute />} />
            
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

            <Route path="*" element={<CatchAllRoute />} />
          </Routes>
        </HashRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
