import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import {
  Bluetooth, Wifi, MapPin, Users, UserCheck, CheckCircle2,
  AlertCircle, ChevronDown, Monitor, Signal, Clock, Shield,
  Search, ArrowDownUp, Timer, Radio
} from 'lucide-react';
import { generateMockAutoCheckIn, generateMockBluetoothDevices } from '../../lib/mockData';
import type { BluetoothDevice } from '../../types/database';

interface LiveCheckInEntry {
  id: string;
  user_name: string;
  user_company: string;
  ticket_type: string;
  detection_type: string;
  signal_strength: number;
  detected_at: string;
  confirmed: boolean;
  elapsed_seconds: number;
}

export default function StaffTabletMonitor() {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [liveEntries, setLiveEntries] = useState<LiveCheckInEntry[]>([]);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time');
  const [filterType, setFilterType] = useState<string>('all');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(0);

  // Stats
  const [stats, setStats] = useState({
    totalDetected: 0,
    confirmed: 0,
    entriesPerMinute: 0,
    activeBeacons: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchEvents(user.id);
    }
  }, [user?.id, fetchEvents]);

  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0].id);
    }
  }, [events, selectedEvent]);

  useEffect(() => {
    if (selectedEvent) {
      const mockDevices = generateMockBluetoothDevices(selectedEvent, 8);
      setDevices(mockDevices);
      setStats(prev => ({
        ...prev,
        activeBeacons: mockDevices.filter(d => d.is_active).length,
      }));
    }
  }, [selectedEvent]);

  // Timer to update elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveEntries(prev => prev.map(entry => ({
        ...entry,
        elapsed_seconds: Math.floor((Date.now() - new Date(entry.detected_at).getTime()) / 1000),
      })));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startMonitoring = useCallback(() => {
    if (!selectedEvent) return;
    setIsMonitoring(true);
    countRef.current = 0;

    // Simulate incoming BLE detections every 2-5 seconds
    const addEntry = () => {
      const mockEntry = generateMockAutoCheckIn(selectedEvent);
      const entry: LiveCheckInEntry = {
        id: mockEntry.id,
        user_name: mockEntry.user_name,
        user_company: mockEntry.user_company,
        ticket_type: mockEntry.ticket_type,
        detection_type: mockEntry.detection_type,
        signal_strength: mockEntry.signal_strength || -50,
        detected_at: mockEntry.detected_at,
        confirmed: false,
        elapsed_seconds: 0,
      };

      countRef.current += 1;

      setLiveEntries(prev => {
        const updated = [entry, ...prev].slice(0, 100); // Keep last 100
        return updated;
      });

      setStats(prev => ({
        ...prev,
        totalDetected: prev.totalDetected + 1,
        entriesPerMinute: Math.round(countRef.current / Math.max(1, (Date.now() - startTime) / 60000)),
      }));

      // Schedule next
      const nextDelay = 1500 + Math.random() * 3500;
      intervalRef.current = setTimeout(addEntry, nextDelay) as unknown as ReturnType<typeof setInterval>;
    };

    const startTime = Date.now();
    const nextDelay = 500 + Math.random() * 2000;
    intervalRef.current = setTimeout(addEntry, nextDelay) as unknown as ReturnType<typeof setInterval>;
  }, [selectedEvent]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearTimeout(intervalRef.current as unknown as number);
      intervalRef.current = null;
    }
  }, []);

  const confirmEntry = (entryId: string) => {
    setLiveEntries(prev =>
      prev.map(e => e.id === entryId ? { ...e, confirmed: true } : e)
    );
    setStats(prev => ({ ...prev, confirmed: prev.confirmed + 1 }));
  };

  const confirmAll = () => {
    setLiveEntries(prev => prev.map(e => ({ ...e, confirmed: true })));
    setStats(prev => ({ ...prev, confirmed: prev.totalDetected }));
  };

  const getSignalIcon = (strength: number) => {
    if (strength > -40) return <Signal size={14} className="signal-strong" />;
    if (strength > -60) return <Signal size={14} className="signal-medium" />;
    return <Signal size={14} className="signal-weak" />;
  };

  const getTicketBadge = (type: string) => {
    const colors: Record<string, string> = {
      vip: 'badge-vip',
      speaker: 'badge-speaker',
      staff: 'badge-staff',
      press: 'badge-press',
      student: 'badge-student',
      general: 'badge-general',
    };
    return colors[type] || 'badge-general';
  };

  const filteredEntries = useMemo(() => {
    let result = [...liveEntries];
    if (searchQuery) {
      result = result.filter(e =>
        e.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.user_company.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterType !== 'all') {
      result = result.filter(e => e.ticket_type === filterType);
    }
    if (sortBy === 'name') {
      result.sort((a, b) => a.user_name.localeCompare(b.user_name));
    }
    return result;
  }, [liveEntries, searchQuery, filterType, sortBy]);

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  return (
    <div className="staff-monitor-page">
      <div className="page-header">
        <div className="page-header-content">
          <h2>
            <Monitor size={24} />
            Staff Check-In Monitor
          </h2>
          <p>Real-time auto-detection of attendees via Bluetooth beacons & geofencing</p>
        </div>
        <div className="monitor-header-actions">
          <div className="event-selector">
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              title="Select event"
            >
              <option value="">Select Event</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
          {isMonitoring ? (
            <button className="btn btn-danger monitor-btn" onClick={stopMonitoring}>
              <Radio size={18} />
              Stop Monitoring
            </button>
          ) : (
            <button className="btn btn-primary monitor-btn" onClick={startMonitoring} disabled={!selectedEvent}>
              <Radio size={18} />
              Start Monitoring
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="monitor-status-bar">
        <div className={`monitor-status-indicator ${isMonitoring ? 'active' : 'inactive'}`}>
          <span className="status-dot" />
          <span>{isMonitoring ? 'LIVE MONITORING' : 'STANDBY'}</span>
        </div>
        <div className="monitor-stats-row">
          <div className="monitor-stat">
            <Users size={16} />
            <span className="stat-value">{stats.totalDetected}</span>
            <span className="stat-label">Detected</span>
          </div>
          <div className="monitor-stat">
            <CheckCircle2 size={16} />
            <span className="stat-value">{stats.confirmed}</span>
            <span className="stat-label">Confirmed</span>
          </div>
          <div className="monitor-stat">
            <Timer size={16} />
            <span className="stat-value">{stats.entriesPerMinute}</span>
            <span className="stat-label">/min</span>
          </div>
          <div className="monitor-stat">
            <Bluetooth size={16} />
            <span className="stat-value">{stats.activeBeacons}</span>
            <span className="stat-label">Beacons</span>
          </div>
        </div>
        {liveEntries.filter(e => !e.confirmed).length > 0 && (
          <button className="btn btn-success confirm-all-btn" onClick={confirmAll}>
            <CheckCircle2 size={16} />
            Confirm All ({liveEntries.filter(e => !e.confirmed).length})
          </button>
        )}
      </div>

      <div className="monitor-content">
        {/* Beacon Devices Panel */}
        <div className="monitor-sidebar">
          <div className="monitor-panel">
            <h3>
              <Bluetooth size={18} />
              Active Beacons
            </h3>
            <div className="beacon-list">
              {devices.map(device => (
                <div key={device.id} className={`beacon-item ${device.is_active ? 'active' : 'inactive'}`}>
                  <div className="beacon-icon">
                    {device.location_type === 'entrance' ? <MapPin size={14} /> :
                     device.location_type === 'exit' ? <ArrowDownUp size={14} /> :
                     <Wifi size={14} />}
                  </div>
                  <div className="beacon-info">
                    <span className="beacon-name">{device.zone_name}</span>
                    <span className="beacon-mac">{device.device_mac}</span>
                  </div>
                  <span className={`beacon-status ${device.is_active ? 'online' : 'offline'}`}>
                    {device.is_active ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="monitor-main">
          <div className="monitor-toolbar">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search attendee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} title="Filter by type">
                <option value="all">All Types</option>
                <option value="vip">VIP</option>
                <option value="speaker">Speaker</option>
                <option value="staff">Staff</option>
                <option value="general">General</option>
                <option value="student">Student</option>
                <option value="press">Press</option>
              </select>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setSortBy(sortBy === 'time' ? 'name' : 'time')}
            >
              <ArrowDownUp size={14} />
              {sortBy === 'time' ? 'By Time' : 'By Name'}
            </button>
          </div>

          <div className="live-feed">
            {filteredEntries.length === 0 ? (
              <div className="monitor-empty">
                <Shield size={48} />
                <h3>{isMonitoring ? 'Waiting for detections...' : 'Start monitoring to see live check-ins'}</h3>
                <p>Attendees will appear here automatically when detected by Bluetooth beacons or geofence triggers</p>
              </div>
            ) : (
              <div className="live-entries">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`live-entry ${entry.confirmed ? 'confirmed' : 'pending'} ${entry.elapsed_seconds < 5 ? 'new-entry' : ''}`}
                  >
                    <div className="entry-avatar">
                      <span>{entry.user_name.charAt(0)}</span>
                    </div>
                    <div className="entry-info">
                      <div className="entry-name-row">
                        <span className="entry-name">{entry.user_name}</span>
                        <span className={`entry-ticket ${getTicketBadge(entry.ticket_type)}`}>
                          {entry.ticket_type.toUpperCase()}
                        </span>
                      </div>
                      <span className="entry-company">{entry.user_company}</span>
                    </div>
                    <div className="entry-detection">
                      <div className="entry-method">
                        {entry.detection_type === 'bluetooth' ? <Bluetooth size={12} /> : 
                         entry.detection_type === 'geofence' ? <MapPin size={12} /> : 
                         <Wifi size={12} />}
                        <span>{entry.detection_type}</span>
                      </div>
                      <div className="entry-signal">
                        {getSignalIcon(entry.signal_strength)}
                        <span>{entry.signal_strength} dBm</span>
                      </div>
                    </div>
                    <div className="entry-time">
                      <Clock size={12} />
                      <span>{formatElapsed(entry.elapsed_seconds)}</span>
                    </div>
                    <div className="entry-action">
                      {entry.confirmed ? (
                        <span className="entry-confirmed">
                          <CheckCircle2 size={16} />
                        </span>
                      ) : (
                        <button
                          className="btn-confirm"
                          onClick={() => confirmEntry(entry.id)}
                          title="Confirm check-in"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unconfirmed Alert */}
          {liveEntries.filter(e => !e.confirmed).length > 5 && (
            <div className="monitor-alert">
              <AlertCircle size={16} />
              <span>{liveEntries.filter(e => !e.confirmed).length} entries awaiting confirmation</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
