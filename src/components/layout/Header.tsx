import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/events': 'Events',
  '/dashboard/events/new': 'Create Event',
  '/dashboard/attendees': 'Attendees',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
};

export default function Header() {
  const location = useLocation();
  
  const getTitle = () => {
    // Check for exact match first
    if (pageTitles[location.pathname]) {
      return pageTitles[location.pathname];
    }
    // Check for event edit/analytics pages
    if (location.pathname.includes('/events/') && location.pathname.includes('/edit')) {
      return 'Edit Event';
    }
    if (location.pathname.includes('/events/') && location.pathname.includes('/analytics')) {
      return 'Event Analytics';
    }
    if (location.pathname.match(/\/events\/[^/]+$/)) {
      return 'Event Details';
    }
    return 'Dashboard';
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <h1 className="page-title">{getTitle()}</h1>
      </div>

    </header>
  );
}
