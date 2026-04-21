import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Search, Download, Filter, Users, Mail, Building } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { User, Event, Registration } from '../../types/database';

interface AttendeeWithEvents {
  user: User;
  events: { event: Event; registered_at: string }[];
  primaryRegistration: Pick<Registration, 'id' | 'qr_code' | 'ticket_type' | 'role' | 'registered_at'> | null;
}

export default function AttendeesPage() {
  const { user } = useAuthStore();
  const [attendees, setAttendees] = useState<AttendeeWithEvents[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch organizer's events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id);

      if (eventsData) {
        setEvents(eventsData as Event[]);

        // Fetch registrations for all events
        const eventIds = (eventsData as any[]).map((e: any) => e.id);
        
        if (eventIds.length > 0) {
          const { data: registrations } = await supabase
            .from('registrations')
            .select(`
              *,
              user:users(*),
              event:events(*)
            `)
            .in('event_id', eventIds)
            .eq('status', 'registered');

          if (registrations) {
            // Group by user
            const userMap = new Map<string, AttendeeWithEvents>();
            
            registrations.forEach((reg: any) => {
              if (!reg.user) return;
              
              const existing = userMap.get(reg.user_id);
              if (existing) {
                existing.events.push({ 
                  event: reg.event, 
                  registered_at: reg.registered_at 
                });
                if (!existing.primaryRegistration || new Date(reg.registered_at) > new Date(existing.primaryRegistration.registered_at)) {
                  existing.primaryRegistration = {
                    id: reg.id,
                    qr_code: reg.qr_code,
                    ticket_type: reg.ticket_type,
                    role: reg.role,
                    registered_at: reg.registered_at,
                  };
                }
              } else {
                userMap.set(reg.user_id, {
                  user: reg.user,
                  events: [{ event: reg.event, registered_at: reg.registered_at }]
                  ,
                  primaryRegistration: {
                    id: reg.id,
                    qr_code: reg.qr_code,
                    ticket_type: reg.ticket_type,
                    role: reg.role,
                    registered_at: reg.registered_at,
                  },
                });
              }
            });

            setAttendees(Array.from(userMap.values()));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAttendees = attendees.filter(a => {
    const matchesSearch = 
      a.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.user.company?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedEvent === 'all') return matchesSearch;
    
    return matchesSearch && a.events.some(e => e.event.id === selectedEvent);
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Company', 'Position', 'Events Registered', 'Total Events'];
    const rows = filteredAttendees.map(a => [
      a.user.name,
      a.user.email,
      a.user.company || '',
      a.user.position || '',
      a.events.map(e => e.event.title).join('; '),
      a.events.length
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendees.csv';
    a.click();
  };

  return (
    <div className="attendees-page">
      <div className="page-header">
        <div className="page-header-content">
          <h2>Attendees</h2>
          <p>Manage all attendees across your events</p>
        </div>
        <button onClick={exportToCSV} className="btn btn-primary">
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div className="attendees-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={18} />
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            title="Filter by event"
            aria-label="Filter by event"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="attendees-stats">
        <div className="stat-item">
          <Users size={20} />
          <span>{filteredAttendees.length} attendees</span>
        </div>
        <div className="stat-item">
          <Building size={20} />
          <span>
            {new Set(filteredAttendees.filter(a => a.user.company).map(a => a.user.company)).size} companies
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-placeholder">Loading attendees...</div>
      ) : filteredAttendees.length > 0 ? (
        <div className="attendees-table-container">
          <table className="attendees-table">
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Company</th>
                <th>Position</th>
                <th>Badge QR</th>
                <th>Role</th>
                <th>Events</th>
                <th>Interests</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.map((attendee) => (
                <tr key={attendee.user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-sm">
                        {attendee.user.avatar_url ? (
                          <img src={attendee.user.avatar_url} alt={attendee.user.name} />
                        ) : (
                          <span>{attendee.user.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <span className="user-name">{attendee.user.name}</span>
                        <span className="user-email">
                          <Mail size={12} />
                          {attendee.user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{attendee.user.company || '-'}</td>
                  <td>{attendee.user.position || '-'}</td>
                  <td>
                    {attendee.primaryRegistration?.qr_code ? (
                      <div className="qr-display-card" title={attendee.primaryRegistration.qr_code}>
                        <QRCodeSVG
                          value={attendee.primaryRegistration.qr_code}
                          size={168}
                          bgColor="#ffffff"
                          fgColor="#1e293b"
                          level="L"
                          includeMargin={true}
                        />
                      </div>
                    ) : (
                      <span className="qr-badge muted">No QR</span>
                    )}
                  </td>
                  <td>
                    <span className={`role-badge role-${attendee.primaryRegistration?.role || 'attendee'}`}>
                      {attendee.primaryRegistration?.role || 'attendee'}
                    </span>
                  </td>
                  <td>
                    <div className="events-badges">
                      {attendee.events.slice(0, 2).map((e, i) => (
                        <span key={i} className="event-badge">{e.event.title}</span>
                      ))}
                      {attendee.events.length > 2 && (
                        <span className="event-badge more">+{attendee.events.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="interests-list">
                      {attendee.user.interests?.slice(0, 3).map((interest, i) => (
                        <span key={i} className="interest-tag">{interest}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <Users size={48} />
          <h4>No attendees found</h4>
          <p>
            {searchQuery || selectedEvent !== 'all' 
              ? 'Try adjusting your filters.'
              : 'Attendees will appear here once they register for your events.'}
          </p>
        </div>
      )}
    </div>
  );
}
