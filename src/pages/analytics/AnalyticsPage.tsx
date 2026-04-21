import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  BarChart3, Users, Calendar, TrendingUp, TrendingDown,
  RefreshCw, Download, FileText, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatDate } from '../../lib/utils';
import type { Event, RegistrationWithUser } from '../../types/database';

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchAnalyticsData();
  }, [user?.id]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('start_date', { ascending: false });

      if (eventsError) throw eventsError;

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        setRegistrations([]);
        return;
      }
      setEvents(eventsData as Event[]);
      
      const eventIds = (eventsData as Event[]).map(e => e.id);
      
      const { data: regsData, error: regsError } = await supabase
        .from('registrations')
        .select('*, user:users(name, email, company, position)')
        .in('event_id', eventIds);

      if (regsError) throw regsError;
      setRegistrations((regsData || []) as RegistrationWithUser[]);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalEvents = events.length;
  const totalRegistrations = registrations.length;
  const totalCheckIns = registrations.filter(r => !!r.checked_in_at).length;
  
  const avgAttendanceRate = totalRegistrations > 0 
    ? Math.round((totalCheckIns / totalRegistrations) * 100) 
    : 0;

  const getMonthlyData = () => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const dataMap: Record<string, { events: number; registrations: number; checkIns: number }> = {};
    
    sortedEvents.forEach(e => {
      const monthKey = new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!dataMap[monthKey]) dataMap[monthKey] = { events: 0, registrations: 0, checkIns: 0 };
      
      dataMap[monthKey].events += 1;
      const eRegs = registrations.filter(r => r.event_id === e.id);
      dataMap[monthKey].registrations += eRegs.length;
      dataMap[monthKey].checkIns += eRegs.filter(r => !!r.checked_in_at).length;
    });
    
    return Object.entries(dataMap)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-8);
  };

  const getRecentEventsData = () => {
    return events.slice(0, 5).map(e => {
      const eRegs = registrations.filter(r => r.event_id === e.id);
      return {
        name: e.title.length > 15 ? e.title.substring(0, 15) + '...' : e.title,
        Registrations: eRegs.length,
        CheckIns: eRegs.filter(r => !!r.checked_in_at).length,
      };
    }).reverse();
  };

  const getRoleDistData = () => {
    const map: Record<string, number> = {};
    registrations.forEach(r => map[r.role] = (map[r.role] || 0) + 1);
    return Object.entries(map).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  };

  const monthlyData = useMemo(getMonthlyData, [events, registrations]);
  const recentEventsData = useMemo(getRecentEventsData, [events, registrations]);
  const roleDistData = useMemo(getRoleDistData, [registrations]);

  const COLORS = ['#4B3F91', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

  const exportGeneralReport = () => {
    let csv = "Event ID,Event title,Start date,Registrations,Check-ins,Attendance Rate %\n";
    events.forEach(e => {
      const eRegs = registrations.filter(r => r.event_id === e.id).length;
      const eChks = registrations.filter(r => r.event_id === e.id && !!r.checked_in_at).length;
      const rate = eRegs > 0 ? ((eChks / eRegs) * 100).toFixed(1) : "0";
      csv += `${e.id},"${e.title}","${formatDate(e.start_date)}",${eRegs},${eChks},${rate}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `general-analytics.csv`;
    a.click();
  };
  
  const exportDetailedReport = () => {
    let csv = "Registration ID,Event Title,Attendee Name,Attendee Email,Role,Ticket Type,Checked In\n";
    registrations.forEach(r => {
      const ev = events.find(e => e.id === r.event_id);
      const isCheckedIn = r.checked_in_at ? 'Yes' : 'No';
      csv += `${r.id},"${ev?.title || ''}","${r.user?.name || ''}","${r.user?.email || ''}","${r.role}","${r.ticket_type}","${isCheckedIn}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `detailed-registrations.csv`;
    a.click();
  };

  return (
    <div className="dat-container">
      <header className="dat-header">
        <div className="dat-title-block">
          <h2><Activity size={24} /> Organizer Analytics & Reports</h2>
          <p>Real-time macro insights and downloadable data across all events.</p>
        </div>
        <div className="dat-actions">
          <button onClick={fetchAnalyticsData} className="dat-btn dat-btn-outline" disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'dat-spin' : ''} /> Refresh
          </button>
          <button onClick={exportGeneralReport} className="dat-btn dat-btn-primary" disabled={events.length === 0}>
            <Download size={16} /> Summary CSV
          </button>
          <button onClick={exportDetailedReport} className="dat-btn dat-btn-primary" disabled={registrations.length === 0}>
            <FileText size={16} /> Detailed Registry CSV
          </button>
        </div>
      </header>

      {/* KPI Row (Reusing data styles if we can, or general stats block) */}
      <div className="dat-stats-grid">
        <div className="dat-stat-card">
          <div className="dat-stat-icon" style={{ backgroundColor: 'rgba(75, 63, 145, 0.1)', color: '#4B3F91' }}>
            <Calendar size={20} />
          </div>
          <div className="dat-stat-info">
            <p>Total Events</p>
            <h4>{totalEvents}</h4>
          </div>
        </div>
        <div className="dat-stat-card">
          <div className="dat-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Users size={20} />
          </div>
          <div className="dat-stat-info">
            <p>Total Registrations</p>
            <h4>{totalRegistrations.toLocaleString()}</h4>
          </div>
        </div>
        <div className="dat-stat-card">
          <div className="dat-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <TrendingUp size={20} />
          </div>
          <div className="dat-stat-info">
            <p>Total Check-ins</p>
            <h4>{totalCheckIns.toLocaleString()}</h4>
          </div>
        </div>
        <div className="dat-stat-card">
          <div className="dat-stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
            <BarChart3 size={20} />
          </div>
          <div className="dat-stat-info">
            <p>Global Attendance Rate</p>
            <h4>{avgAttendanceRate}%</h4>
            <span className={`dat-stat-trend ${avgAttendanceRate >= 50 ? 'up' : 'down'}`}>
              {avgAttendanceRate >= 50 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
              {avgAttendanceRate >= 50 ? ' Healthy' : ' Needs Attention'}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="dat-empty">Loading analytics...</div>
      ) : events.length === 0 ? (
        <div className="dat-empty">
          <Calendar size={40} />
          <h3>No Data</h3>
          <p>Please create an event first.</p>
        </div>
      ) : (
        <>
          <div className="dat-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="dat-chart-card" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--text)' }}>Registration Trends</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRegs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4B3F91" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4B3F91" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorChecks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}/>
                    <Legend iconType="circle" />
                    <Area type="monotone" dataKey="registrations" name="Registrations" stroke="#4B3F91" fillOpacity={1} fill="url(#colorRegs)" />
                    <Area type="monotone" dataKey="checkIns" name="Check-ins" stroke="#10B981" fillOpacity={1} fill="url(#colorChecks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dat-chart-card" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--text)' }}>Top Events Comparison</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentEventsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 11}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}/>
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Registrations" fill="#4B3F91" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="CheckIns" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="dat-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            <div className="dat-chart-card" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--text)' }}>Global Role Distribution</h3>
              <div style={{ height: '250px' }}>
                {roleDistData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {roleDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="dat-empty" style={{ height: '100%', padding: 0 }}>No Data</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

}
