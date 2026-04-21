import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  UserCheck,
  MapPin,
  Megaphone,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Rss,
  Database,
  Crown,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Operational Dashboard', path: '/dashboard' },
  { icon: UserCheck, label: 'Check-In / Check-Out', path: '/dashboard/checkin' },
  { icon: Crown, label: 'VIP & Role Assignment', path: '/dashboard/roles' },
  { icon: Database, label: 'Attendee Data', path: '/dashboard/attendee-data' },
  { icon: MapPin, label: 'Venue & Zones', path: '/dashboard/venue' },
  { icon: Megaphone, label: 'Marketing Campaigns', path: '/dashboard/marketing' },
  { icon: Rss, label: 'Feed', path: '/dashboard/feed' },
  { icon: BarChart3, label: 'Data & Reports', path: '/dashboard/analytics' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img
            src="/Netvent logo_.png"
            alt="NetVent"
            className={`sidebar-logo-img ${collapsed ? 'collapsed' : ''}`}
          />
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => `user-info ${isActive ? 'active' : ''}`}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background-color 0.2s', cursor: 'pointer' }}
          >
            <div className="user-avatar" style={{ margin: 0 }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {!collapsed && (
              <div className="user-details" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="user-name" style={{ fontWeight: 600, color: '#1e293b' }}>{user.name}</span>
                <span className="user-role" style={{ fontSize: '0.75rem', color: '#64748b' }}>Settings</span>
              </div>
            )}
          </NavLink>
        )}
        <button className="nav-item logout-btn" onClick={handleSignOut}>
          <LogOut size={20} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
