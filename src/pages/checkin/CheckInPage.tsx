import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { parseCheckInQrValue } from '../../utils/checkInQr';
import { 
  Camera, ScanLine, Search, CheckCircle2, 
  AlertCircle, Users, Activity, Clock, LogOut, CheckSquare, RefreshCw 
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { Event } from '../../types/database';

type ScanOutcome = 'idle' | 'success' | 'error' | 'duplicate';

export default function CheckInPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [allCheckins, setAllCheckins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<{ type: ScanOutcome; message: string }>({ type: 'idle', message: 'Waiting for camera...' });
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanHostId = 'chk-qr-scanner-mount';

  // Stats
  const totalRegs = registrations.length;
  // Total who ever checked in (historic)
  const checkedInCount = registrations.filter(r => !!r.checked_in_at).length;
  // Currently inside the venue (checked in but have not checked out)
  const inVenueCount = registrations.filter(r => !!r.checked_in_at && !r.checked_out_at).length;
  // Total checked out
  const checkedOutCount = registrations.filter(r => !!r.checked_out_at).length;
  // Attendance percentage based on how many people arrived vs total registrations
  const attendanceRate = totalRegs > 0 ? Math.round((checkedInCount / totalRegs) * 100) : 0;

  useEffect(() => {
    if (user?.id) fetchEvents();
  }, [user?.id]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventData(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (isScannerOpen && selectedEventId) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isScannerOpen, selectedEventId]);

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('start_date', { ascending: false });
      if (data && data.length > 0) {
        setEvents(data);
        const latestEvent: any = data[0];
        setSelectedEventId(latestEvent.id); // Auto select most recent
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const loadEventData = async (eventId: string) => {
    setIsLoading(true);
    try {
      const { data: regsData } = await supabase
        .from('registrations')
        .select(`
          id, user_id, event_id, status, ticket_type, role, 
          checked_in_at, checked_out_at, qr_code,
          user:users(name, email, company)
        `)
        .eq('event_id', eventId);

      const { data: checkinsData } = await supabase
        .from('check_ins')
        .select('id, user_id, timestamp, type, method, auto_detected')
        .eq('event_id', eventId)
        .order('timestamp', { ascending: false });

      if (regsData) setRegistrations(regsData);

      if (checkinsData && regsData) {
        setAllCheckins(checkinsData);
        const mappedScans = checkinsData.slice(0, 25).map((c: any) => {
          const reg = regsData.find((r: any) => r.user_id === c.user_id) as any;
          return {
            ...c,
            attendeeName: reg?.user?.name || 'Unknown',
            ticketType: reg?.ticket_type || 'General'
          };
        });
        setRecentScans(mappedScans);
      }
    } catch (err) {
      console.error('Error loading event data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async (decodedText: string) => {
    if (!selectedEventId) return;
    
    stopCamera(); // Pause scanning briefly
    try {
      const parsed = parseCheckInQrValue(decodedText);
      let targetUserId: string | null = null;
      let targetReg: any = null;

      if (parsed.kind === 'legacy') {
        targetReg = registrations.find(r => r.qr_code === parsed.raw);
        if (targetReg) targetUserId = targetReg.user_id;
      } else if (parsed.kind === 'structured' && parsed.payload.eventId === selectedEventId) {
        targetUserId = parsed.payload.userId || null;
        targetReg = registrations.find(r => r.user_id === targetUserId);
      }

      if (!targetUserId || !targetReg) {
        setScanStatus({ type: 'error', message: 'Attendee not found or invalid QR.' });
      } else if (targetReg.checked_in_at && !targetReg.checked_out_at) {
        setScanStatus({ type: 'duplicate', message: `${targetReg.user.name} is already checked in.` });
      } else {
        // Perform Check in
        await confirmCheckIn(targetUserId, targetReg.user.name, 'qr_code');
      }
    } catch (err: any) {
      setScanStatus({ type: 'error', message: err.message || 'Failed to process QR code.' });
    }
    
    // Resume camera after 2.5s if scanner is still supposedly open
    setTimeout(() => { 
      // Only restart if the user hasn't closed it in the meantime
      if (scannerRef.current === null) {
        startCamera(); 
      }
    }, 2500);
  };

  const confirmCheckIn = async (userId: string, name: string, method: 'qr_code' | 'manual') => {
    const nowIso = new Date().toISOString();
    try {
      await supabase.from('check_ins').insert({
        user_id: userId,
        event_id: selectedEventId,
        type: 'check_in',
        timestamp: nowIso,
        method,
        auto_detected: method === 'qr_code',
      } as never);

      await supabase.from('registrations')
        .update({ checked_in_at: nowIso, checked_out_at: null } as never)
        .eq('user_id', userId)
        .eq('event_id', selectedEventId);

      setScanStatus({ type: 'success', message: `${name} successfully checked in!` });
      // Refresh Data implicitly
      loadEventData(selectedEventId);
    } catch (err) {
      console.error(err);
      setScanStatus({ type: 'error', message: 'Database error during check-in.' });
    }
  };

  const confirmCheckOut = async (userId: string, name: string, method: 'qr_code' | 'manual') => {
    const nowIso = new Date().toISOString();
    try {
      await supabase.from('check_ins').insert({
        user_id: userId,
        event_id: selectedEventId,
        type: 'check_out',
        timestamp: nowIso,
        method,
        auto_detected: method === 'qr_code',
      } as never);

      await supabase.from('registrations')
        .update({ checked_out_at: nowIso } as never)
        .eq('user_id', userId)
        .eq('event_id', selectedEventId);

      setScanStatus({ type: 'success', message: `${name} successfully checked out!` });
      // Refresh Data implicitly
      loadEventData(selectedEventId);
    } catch (err) {
      console.error(err);
      setScanStatus({ type: 'error', message: 'Database error during check-out.' });
    }
  };

  const startCamera = async () => {
    if (scannerRef.current) return;
    setScanStatus({ type: 'idle', message: 'Ready to scan QR Codes.' });
    try {
      const scanner = new Html5Qrcode(scanHostId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        handleScan,
        () => {} // ignore scan failures
      );
      scannerRef.current = scanner;
    } catch (err) {
      setScanStatus({ type: 'error', message: 'Camera permission denied or unavailable.' });
      setIsScannerOpen(false); // Reset on error
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {}
      scannerRef.current = null;
    }
  };

  const filteredRegistrations = useMemo(() => {
    if (!searchQuery) return registrations.slice(0, 10); // Show recent 10 if no search
    return registrations.filter(r => 
      r.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10); // display only top 10 manual search results
  }, [registrations, searchQuery]);
  const timeSeriesData = useMemo(() => {
    if (!allCheckins.length) return [];
    
    // Group by 1-hour intervals for simplicity
    const timeMap: Record<string, { time: string; CheckIns: number; CheckOuts: number }> = {};
    
    const getHourBin = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${d.getHours().toString().padStart(2, '0')}:00`;
    };
    
    allCheckins.forEach(c => {
      const bin = getHourBin(c.timestamp);
      if (!timeMap[bin]) timeMap[bin] = { time: bin, CheckIns: 0, CheckOuts: 0 };
      if (c.type === 'check_in') timeMap[bin].CheckIns++;
      else if (c.type === 'check_out') timeMap[bin].CheckOuts++;
    });

    return Object.values(timeMap).sort((a, b) => a.time.localeCompare(b.time));
  }, [allCheckins]);
  return (
    <div className="chk-container">
      {/* Header */}
      <header className="chk-header">
        <div className="chk-title-block">
          <h2>Access Control</h2>
          <p>Real-time check-in processing.</p>
        </div>
        <div className="chk-event-select" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => loadEventData(selectedEventId)} 
            disabled={isLoading || !selectedEventId}
            title="Reload Data"
            style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Reload
          </button>
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            <option value="" disabled>Select an Event</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      </header>

      {isLoading && <div className="chk-loading">Syncing data...</div>}

      {/* Chart Section */}
      {timeSeriesData.length > 0 && (
        <div className="chk-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div className="chk-card-header">
            <Activity size={20} />
            <h3>Check-In/Out Activity over Time (Hourly)</h3>
          </div>
          <div style={{ height: '300px', width: '100%', padding: '1rem 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCheckIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCheckOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="CheckIns" stroke="#10B981" fillOpacity={1} fill="url(#colorCheckIn)" />
                <Area type="monotone" dataKey="CheckOuts" stroke="#EF4444" fillOpacity={1} fill="url(#colorCheckOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="chk-grid">
        
        {/* Left Column: Scanner and Lookup */}
        <section className="chk-action-col">
          {/* Manual Lookup Box (Moved to top as primary) */}
          <div className="chk-card chk-lookup">
            <div className="chk-card-header">
              <Search size={20} />
              <h3>Manual Lookup</h3>
            </div>
            <div className="chk-search-input">
              <input 
                type="text" 
                placeholder="Search attendee by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
              <div className="chk-lookup-results">
              {filteredRegistrations.length === 0 ? (
                <p className="chk-no-results">No exact match found.</p>
              ) : (
                filteredRegistrations.map((r: any) => {
                  const isCheckedIn = !!r.checked_in_at && !r.checked_out_at;
                  return (
                    <div key={r.id} className="chk-lookup-row">
                      <div className="chk-u-info">
                        <strong>{r.user?.name}</strong>
                        <span className="chk-ticket-badge">{r.ticket_type}</span>
                      </div>
                      {isCheckedIn ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className="chk-pill-done">In Venue</span>
                          <button 
                            className="chk-btn-checkout"
                            onClick={() => confirmCheckOut(r.user_id, r.user.name, 'manual')}
                          >
                            Check Out
                          </button>
                        </div>
                      ) : !!r.checked_out_at ? (
                        <span className="chk-pill-done" style={{ background: 'var(--text-muted)' }}>Checked Out</span>
                      ) : (
                        <button 
                          className="chk-btn-checkin"
                          onClick={() => confirmCheckIn(r.user_id, r.user.name, 'manual')}
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Scanner Box (Secondary, toggleable) */}
          <div className="chk-card chk-scanner">
            <div className="chk-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Camera size={20} />
                <h3>Live Camera Scan</h3>
              </div>
              <button 
                className="chk-btn-checkin" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => setIsScannerOpen(!isScannerOpen)}
                disabled={!selectedEventId}
              >
                {isScannerOpen ? 'Close Scanner' : 'Open Scanner'}
              </button>
            </div>
            
            {isScannerOpen ? (
              <>
                <div id={scanHostId} className="chk-camera-viewport"></div>
                <div className={`chk-status-banner chk-status-${scanStatus.type}`}>
                  {scanStatus.type === 'success' && <CheckCircle2 size={18} />}
                  {scanStatus.type === 'error' && <AlertCircle size={18} />}
                  {scanStatus.type === 'duplicate' && <Activity size={18} />}
                  {scanStatus.type === 'idle' && <ScanLine size={18} />}
                  <span>{scanStatus.message}</span>
                </div>
              </>
            ) : (
              <div 
                className="chk-status-banner chk-status-idle" 
                style={{ padding: '2rem', justifyContent: 'center', color: 'var(--text-muted)' }}
              >
                <Camera size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <span>Scanner is turned off. Click "Open Scanner" to enable camera.</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Stats and Recent Feed */}
        <section className="chk-data-col">
          {/* Stats Summary */}
          <div className="chk-stats-grid">
            <div className="chk-stat-box">
              <Users size={20} />
              <div className="chk-stat-vals">
                <h4>{totalRegs}</h4>
                <p>Total Reg</p>
              </div>
            </div>
            <div className="chk-stat-box">
              <CheckSquare size={20} />
              <div className="chk-stat-vals">
                <h4>{checkedInCount}</h4>
                <p>Checked In</p>
              </div>
            </div>
            <div className="chk-stat-box">
              <CheckCircle2 size={20} />
              <div className="chk-stat-vals">
                <h4>{inVenueCount}</h4>
                <p>In Venue</p>
              </div>
            </div>
            <div className="chk-stat-box">
              <LogOut size={20} />
              <div className="chk-stat-vals">
                <h4>{checkedOutCount}</h4>
                <p>Checked Out</p>
              </div>
            </div>
            <div className="chk-stat-box">
              <Activity size={20} />
              <div className="chk-stat-vals">
                <h4>{attendanceRate}%</h4>
                <p>Attendance</p>
              </div>
            </div>
          </div>

          {/* Realtime Stream */}
          <div className="chk-card chk-feed">
            <div className="chk-card-header">
              <Clock size={20} />
              <h3>Recent Check-Ins</h3>
            </div>
            <div className="chk-feed-list">
              {recentScans.length === 0 ? (
                <p className="chk-empty-feed">No check-ins yet.</p>
              ) : (
                recentScans.map(scan => (
                  <div key={scan.id} className="chk-feed-item">
                    <div className="chk-feed-time">
                      {new Date(scan.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="chk-feed-details">
                      <strong>{scan.attendeeName}</strong> passed access control
                      <span className="chk-mini-badge">{scan.ticketType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
