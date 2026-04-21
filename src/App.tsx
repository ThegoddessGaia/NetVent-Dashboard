import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Auth pages
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Dashboard pages
import DashboardHome from './pages/dashboard/DashboardHome';
import EventsList from './pages/events/EventsList';
import CreateEvent from './pages/events/CreateEvent';
import EventDetails from './pages/events/EventDetails';
import EventAnalytics from './pages/events/EventAnalytics';
import AttendeesPage from './pages/attendees/AttendeesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';

// New dashboard pages
import CheckInPage from './pages/checkin/CheckInPage';
import VenueZonesPage from './pages/venue/VenueZonesPage';
import MarketingPage from './pages/marketing/MarketingPage';
import FeedPage from './pages/feed/FeedPage';
import AttendeeDataPage from './pages/data/AttendeeDataPage';
import RoleAssignmentPage from './pages/roles/RoleAssignmentPage';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* Protected dashboard routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="events" element={<EventsList />} />
          <Route path="events/new" element={<CreateEvent />} />
          <Route path="events/:id" element={<EventDetails />} />
          <Route path="events/:id/edit" element={<CreateEvent />} />
          <Route path="events/:id/analytics" element={<EventAnalytics />} />
          <Route path="checkin" element={<CheckInPage />} />
          <Route path="venue" element={<VenueZonesPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="attendee-data" element={<AttendeeDataPage />} />
          <Route path="roles" element={<RoleAssignmentPage />} />
          <Route path="attendees" element={<AttendeesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
