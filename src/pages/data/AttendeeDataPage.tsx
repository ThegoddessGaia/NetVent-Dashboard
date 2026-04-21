import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { supabase } from '../../lib/supabase';
import {
  Users, Download, Search, Filter, BarChart3, Star, Briefcase, Award, RefreshCw
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { RegistrationWithUser } from '../../types/database';

export default function AttendeeDataPage() {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [registrations, setRegistrations] = useState<RegistrationWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) fetchEvents(user.id);
  }, [user?.id, fetchEvents]);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (selectedEventId) loadData();
  }, [selectedEventId]);

  const loadData = async () => {
    if (!selectedEventId) return;
    setIsLoading(true);
    try {
      const { data: realRegs } = await supabase
        .from('registrations')
        .select(`*, user:users(name, email, company, position)`)
        .eq('event_id', selectedEventId);
      
      setRegistrations((realRegs || []) as RegistrationWithUser[]);
    } catch (err) {
      console.error(err);
      setRegistrations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Demographic KPIs
  const totalRegs = registrations.length;
  const vipCount = registrations.filter(r => r.ticket_type === 'vip').length;
  const speakerCount = registrations.filter(r => r.role === 'speaker').length;
  
  const distinctCompanies = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach(r => {
      const c = r.user?.company?.trim();
      if (c) set.add(c);
    });
    return set.size;
  }, [registrations]);

  // Chart Data
  const roleDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    registrations.forEach(r => {
      map[r.role] = (map[r.role] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [registrations]);

  const ticketDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    registrations.forEach(r => {
      map[r.ticket_type] = (map[r.ticket_type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [registrations]);
  
  const COLORS = ['#4654A1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  // Table Data
  const filteredRegs = useMemo(() => {
    return registrations.filter(r => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const n = (r.user?.name || '').toLowerCase();
        const e = (r.user?.email || '').toLowerCase();
        const c = (r.user?.company || '').toLowerCase();
        if (!n.includes(query) && !e.includes(query) && !c.includes(query)) return false;
      }
      if (filterRole !== 'all' && r.role !== filterRole) return false;
      return true;
    }).sort((a, b) => {
      // alphabetically by name instead of check in
      const AName = (a.user?.name || '').toLowerCase();
      const BName = (b.user?.name || '').toLowerCase();
      return AName.localeCompare(BName);
    });
  }, [registrations, searchQuery, filterRole]);

  const handleExport = () => {
    const csvRows = [
      ['Name', 'Email', 'Company', 'Position', 'Ticket Type', 'Role'].join(','),
      ...filteredRegs.map(r => {
        return [
          r.user?.name || 'Unknown',
          r.user?.email || '',
          r.user?.company || '',
          r.user?.position || '',
          r.ticket_type,
          r.role
        ].map(val => `"${val}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed-attendee-data-${selectedEventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dat-container">
      <header className="dat-header">
        <div className="dat-title-block">
          <h2><BarChart3 size={24} /> Attendee Profiles & Demographics</h2>
          <p>Audience segmentation and registry data.</p>
        </div>
        <div className="dat-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadData} 
            disabled={isLoading || !selectedEventId}
            title="Reload Data"
            style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Reload
          </button>
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            <option value="" disabled>Select Event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
          <button className="dat-export-btn" onClick={handleExport} disabled={filteredRegs.length === 0}>
            <Download size={16} /> Export
          </button>
        </div>
      </header>

      {isLoading && <div className="dat-loading">Fetching audience data...</div>}

      <div className="dat-kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="dat-kpi-card">
          <Users size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h4>{totalRegs}</h4>
            <p>Total Registered</p>
          </div>
        </div>
        <div className="dat-kpi-card">
          <Star size={20} style={{ color: 'var(--warning)' }} />
          <div>
            <h4>{vipCount}</h4>
            <p>VIP Tickets</p>
          </div>
        </div>
        <div className="dat-kpi-card">
          <Award size={20} style={{ color: 'var(--info)' }} />
          <div>
            <h4>{speakerCount}</h4>
            <p>Total Speakers</p>
          </div>
        </div>
        <div className="dat-kpi-card">
          <Briefcase size={20} style={{ color: 'var(--success)' }} />
          <div>
            <h4>{distinctCompanies}</h4>
            <p>Distinct Companies</p>
          </div>
        </div>
      </div>

      <div className="dat-grid">
        <div className="dat-table-card">
          <div className="dat-table-header">
            <div className="dat-search">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search name, email, or company..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="dat-filter">
              <Filter size={16} />
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="attendee">Attendee</option>
                <option value="speaker">Speaker</option>
                <option value="sponsor">Sponsor</option>
                <option value="exhibitor">Exhibitor</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
          <div className="dat-table-wrap" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="dat-table">
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                <tr>
                  <th>Profile</th>
                  <th>Company / Org</th>
                  <th>Position</th>
                  <th>Ticket</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegs.length > 0 ? (
                  filteredRegs.map(r => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.user?.name || 'Unknown'}</strong><br/>
                        <span className="dat-sub">{r.user?.email}</span>
                      </td>
                      <td>{r.user?.company || '-'}</td>
                      <td>{r.user?.position || '-'}</td>
                      <td><span className="dat-badge">{r.ticket_type}</span></td>
                      <td><span className="dat-pill">{r.role}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No attendees match your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="dat-chart-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="dat-chart-card">
            <h3>Roles Distribution</h3>
            <div className="dat-chart" style={{ height: '220px' }}>
              {roleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                      {roleDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="dat-empty" style={{ color: 'var(--text-muted)' }}>No role data available</div>
              )}
            </div>
          </div>

          <div className="dat-chart-card">
            <h3>Ticket Types</h3>
            <div className="dat-chart" style={{ height: '220px' }}>
              {ticketDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ticketDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                      {ticketDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="dat-empty" style={{ color: 'var(--text-muted)' }}>No ticket data available</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
 

  );
}
