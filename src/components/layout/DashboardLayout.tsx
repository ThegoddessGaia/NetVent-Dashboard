import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Sidebar from './Sidebar';
import Header from './Header';
import { useEffect } from 'react';
import { Loader2, ShieldX, LogOut } from 'lucide-react';

export default function DashboardLayout() {
  const { user, isLoading, isInitialized, initialize, signOut } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized || isLoading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spinner" size={48} />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (user.role !== 'organizer') {
    return (
      <div className="access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">
            <ShieldX size={64} />
          </div>
          <h1>Access Denied</h1>
          <p>This dashboard is exclusively for event organizers.</p>
          <p className="role-info">Your current role: <strong>{user.role}</strong></p>
          <p className="help-text">
            If you believe you should have organizer access, please contact support
            or register with a new organizer account.
          </p>
          <div className="access-denied-actions">
            <button onClick={() => signOut()} className="btn btn-primary">
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
