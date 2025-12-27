
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Role } from './types';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageOrganisations from './pages/admin/ManageOrganisations';
import AdminReports from './pages/admin/AdminReports';

// Fix: Add missing imports for Role-specific pages
import OrganisationDashboard from './pages/organisation/OrganisationDashboard';
import ManageVolunteers from './pages/organisation/ManageVolunteers';
import OrganisationReports from './pages/organisation/OrganisationReports';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import NewMemberForm from './pages/volunteer/NewMemberForm';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Master Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole={Role.MasterAdmin}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/organisations" element={<ProtectedRoute requiredRole={Role.MasterAdmin}><ManageOrganisations /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requiredRole={Role.MasterAdmin}><AdminReports /></ProtectedRoute>} />
            
            {/* Organisation Routes */}
            <Route path="/organisation" element={<ProtectedRoute requiredRole={Role.Organisation}><OrganisationDashboard /></ProtectedRoute>} />
            <Route path="/organisation/volunteers" element={<ProtectedRoute requiredRole={Role.Organisation}><ManageVolunteers /></ProtectedRoute>} />
            <Route path="/organisation/reports" element={<ProtectedRoute requiredRole={Role.Organisation}><OrganisationReports /></ProtectedRoute>} />

            {/* Volunteer Routes */}
            <Route path="/volunteer" element={<ProtectedRoute requiredRole={Role.Volunteer}><VolunteerDashboard /></ProtectedRoute>} />
            <Route path="/volunteer/new-member" element={<ProtectedRoute requiredRole={Role.Volunteer}><NewMemberForm /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user } = useAuth();
  if (!user || user.role !== requiredRole) {
    return <Navigate to="/login" />;
  }
  return children;
};

export default App;
