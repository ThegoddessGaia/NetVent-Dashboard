import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEventStore } from '../../stores/eventStore';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Users, UserCheck, Clock, TrendingUp, 
  Download, RefreshCw, Calendar
} from 'lucide-react';
import { formatDate, formatDuration, calculateDwellTime } from '../../lib/utils';
import { 
  AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import type { RegistrationWithUser, CheckInWithUser } from '../../types/database';

interface DwellTimeData {
  userId: string;
  userName: string;
  checkIn: string;
  checkOut: string | null;
  dwellMinutes: number;
}

export default function EventAnalytics() {
  const { id } = useParams<{ id: string }>();
  const { currentEvent, fetchEvent, isLoading } = useEventStore();
  
  const [registrations, setRegistrations] = useState<RegistrationWithUser[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInWithUser[]>([]);
  const [dwellTimeData, setDwellTimeData] = useState<DwellTimeData[]>([]);
  const [registrationTrend, setRegistrationTrend] = useState<{ date: string; count: number }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEvent(id);
      fetchAnalyticsData(id);
    }
  }, [id, fetchEvent]);

  const fetchAnalyticsData = async (eventId: string) => {
    setLoadingData(true);
    try {
      // Fetch registrations with user data
      const { data: regsData } = await supabase
        .from('registrations')
        .select(`*, user:users(*)`)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: true });

      if (regsData) {
        setRegistrations(regsData as unknown as RegistrationWithUser[]);
        
        // Calculate registration trend
        const trendMap = new Map<string, number>();
        regsData.forEach((reg: any) => {
          const date = new Date(reg.registered_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          trendMap.set(date, (trendMap.get(date) || 0) + 1);
        });
        
        let cumulative = 0;
        const trend = Array.from(trendMap.entries()).map(([date, count]) => {
          cumulative += count;
          return { date, count: cumulative };
        });
        setRegistrationTrend(trend);
      }

      // Fetch check-ins with user data
      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select(`*, user:users(*)`)
        .eq('event_id', eventId)
        .order('timestamp', { ascending: true });

      if (checkInsData) {
        setCheckIns(checkInsData as unknown as CheckInWithUser[]);
        
        // Calculate dwell times
        const userCheckIns = new Map<string, { checkIn: string; user: any }>();
        const dwellTimes: DwellTimeData[] = [];

        checkInsData.forEach((record: any) => {
          if (record.type === 'check_in') {
            userCheckIns.set(record.user_id, { 
              checkIn: record.timestamp, 
              user: record.user 
            });
          } else if (record.type === 'check_out') {
            const checkInData = userCheckIns.get(record.user_id);
            if (checkInData) {
              const dwellMinutes = calculateDwellTime(checkInData.checkIn, record.timestamp);
              dwellTimes.push({
                userId: record.user_id,
                userName: checkInData.user?.name || 'Unknown',
                checkIn: checkInData.checkIn,
                checkOut: record.timestamp,
                dwellMinutes,
              });
              userCheckIns.delete(record.user_id);
            }
          }
        });

        // Add users still checked in
        userCheckIns.forEach((data, userId) => {
          const now = new Date().toISOString();
          dwellTimes.push({
            userId,
            userName: data.user?.name || 'Unknown',
            checkIn: data.checkIn,
            checkOut: null,
            dwellMinutes: calculateDwellTime(data.checkIn, now),
          });
        });

        setDwellTimeData(dwellTimes);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const exportToCSV = () => {
    if (registrations.length === 0) return;

    const headers = ['Name', 'Email', 'Company', 'Position', 'Registered At', 'Status'];
    const rows = registrations.map(r => [
      r.user?.name || '',
      r.user?.email || '',
      r.user?.company || '',
      r.user?.position || '',
      new Date(r.registered_at).toLocaleString(),
      r.status
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEvent?.title || 'event'}-attendees.csv`;
    a.click();
  };

  if (isLoading || !currentEvent) {
    return <div className="loading-placeholder">Loading analytics...</div>;
  }

  const totalRegistrations = registrations.filter(r => r.status === 'registered').length;
  const totalCheckIns = new Set(checkIns.filter(c => c.type === 'check_in').map(c => c.user_id)).size;
  const currentlyInside = dwellTimeData.filter(d => !d.checkOut).length;
  const avgDwellTime = dwellTimeData.length > 0 
    ? Math.round(dwellTimeData.reduce((sum, d) => sum + d.dwellMinutes, 0) / dwellTimeData.length)
    : 0;

  const attendanceRate = totalRegistrations > 0 
    ? Math.round((totalCheckIns / totalRegistrations) * 100) 
    : 0;

  const COLORS = ['#4654A1', '#260848', '#2A0D4B', '#220444'];

  const pieData = [
    { name: 'Checked In', value: totalCheckIns },
    { name: 'Not Attended', value: Math.max(0, totalRegistrations - totalCheckIns) },
  ];

  const dwellDistribution = [
    { range: '0-30m', count: dwellTimeData.filter(d => d.dwellMinutes <= 30).length },
    { range: '30-60m', count: dwellTimeData.filter(d => d.dwellMinutes > 30 && d.dwellMinutes <= 60).length },
    { range: '1-2h', count: dwellTimeData.filter(d => d.dwellMinutes > 60 && d.dwellMinutes <= 120).length },
    { range: '2-4h', count: dwellTimeData.filter(d => d.dwellMinutes > 120 && d.dwellMinutes <= 240).length },
    { range: '4h+', count: dwellTimeData.filter(d => d.dwellMinutes > 240).length },
  ];

  return (
    <div className="analytics-page">
      <div className="page-header">
        <Link to={`/dashboard/events/${id}`} className="back-btn">
          <ArrowLeft size={20} />
          Back to Event
        </Link>
        <div className="header-actions">
          <button onClick={() => fetchAnalyticsData(id!)} className="btn btn-secondary">
            <RefreshCw size={18} />
            Refresh
          </button>
          <button onClick={exportToCSV} className="btn btn-primary">
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="event-info-bar">
        <Calendar size={20} />
        <h2>{currentEvent.title}</h2>
        <span className="divider">|</span>
        <span>{formatDate(currentEvent.start_date)} - {formatDate(currentEvent.end_date)}</span>
      </div>

      {loadingData ? (
        <div className="loading-placeholder">Loading analytics data...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stats-card stats-card-primary">
              <div className="stats-icon"><Users size={24} /></div>
              <div className="stats-content">
                <span className="stats-label">Total Registrations</span>
                <span className="stats-value">{totalRegistrations}</span>
              </div>
            </div>

            <div className="stats-card stats-card-accent">
              <div className="stats-icon"><UserCheck size={24} /></div>
              <div className="stats-content">
                <span className="stats-label">Total Check-ins</span>
                <span className="stats-value">{totalCheckIns}</span>
                <span className="stats-trend">{attendanceRate}% attendance rate</span>
              </div>
            </div>

            <div className="stats-card stats-card-success">
              <div className="stats-icon"><TrendingUp size={24} /></div>
              <div className="stats-content">
                <span className="stats-label">Currently Inside</span>
                <span className="stats-value">{currentlyInside}</span>
              </div>
            </div>

            <div className="stats-card stats-card-warning">
              <div className="stats-icon"><Clock size={24} /></div>
              <div className="stats-content">
                <span className="stats-label">Avg. Dwell Time</span>
                <span className="stats-value">{formatDuration(avgDwellTime)}</span>
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Registration Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={registrationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#4654A1" 
                    fill="#4654A1" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Attendance Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card chart-card-full">
              <h3>Dwell Time Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dwellDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="range" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#4654A1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="attendees-section">
            <div className="section-header">
              <h3>Attendee List</h3>
              <span className="count-badge">{registrations.length} total</span>
            </div>
            
            <div className="attendees-table-container">
              <table className="attendees-table">
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>Company</th>
                    <th>Position</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th>Dwell Time</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => {
                    const dwell = dwellTimeData.find(d => d.userId === reg.user_id);
                    return (
                      <tr key={reg.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">
                              {reg.user?.avatar_url ? (
                                <img src={reg.user.avatar_url} alt={reg.user.name} />
                              ) : (
                                <span>{reg.user?.name?.charAt(0) || '?'}</span>
                              )}
                            </div>
                            <div>
                              <span className="user-name">{reg.user?.name || 'Unknown'}</span>
                              <span className="user-email">{reg.user?.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{reg.user?.company || '-'}</td>
                        <td>{reg.user?.position || '-'}</td>
                        <td>{formatDate(reg.registered_at)}</td>
                        <td>
                          <span className={`status-badge status-${dwell ? 'checked-in' : 'registered'}`}>
                            {dwell ? (dwell.checkOut ? 'Attended' : 'Inside') : 'Registered'}
                          </span>
                        </td>
                        <td>{dwell ? formatDuration(dwell.dwellMinutes) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
