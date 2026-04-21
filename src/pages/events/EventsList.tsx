import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { Plus, Search, Filter, Grid, List, Calendar, Trash2, Edit } from 'lucide-react';
import { formatDate, getEventStatus } from '../../lib/utils';
import EventCard from '../../components/ui/EventCard';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'upcoming' | 'ongoing' | 'past';

export default function EventsList() {
  const { user } = useAuthStore();
  const { events, fetchEvents, deleteEvent, isLoading } = useEventStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchEvents(user.id);
    }
  }, [user?.id, fetchEvents]);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === 'all') return true;
    
    const status = getEventStatus(event.start_date, event.end_date);
    return status === filterStatus;
  });

  const handleDelete = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(eventId);
    }
  };

  return (
    <div className="events-page">
      <div className="page-header">
        <div className="page-header-content">
          <h2>Your Events</h2>
          <p>Manage and monitor all your events</p>
        </div>
        <Link to="/dashboard/events/new" className="btn btn-primary">
          <Plus size={18} />
          Create Event
        </Link>
      </div>

      <div className="events-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <div className="filter-group">
            <Filter size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="past">Past</option>
            </select>
          </div>

          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-placeholder">Loading events...</div>
      ) : filteredEvents.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="events-grid">
            {filteredEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                isLive={getEventStatus(event.start_date, event.end_date) === 'ongoing'}
              />
            ))}
          </div>
        ) : (
          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Venue</th>
                  <th>Registrations</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const status = getEventStatus(event.start_date, event.end_date);
                  return (
                    <tr key={event.id}>
                      <td>
                        <div className="event-cell">
                          {event.logo_url ? (
                            <img src={event.logo_url} alt="" className="event-logo-sm" />
                          ) : (
                            <div className="event-logo-placeholder-sm">
                              <Calendar size={16} />
                            </div>
                          )}
                          <span>{event.title}</span>
                        </div>
                      </td>
                      <td>{formatDate(event.start_date)}</td>
                      <td>{event.venue_name}</td>
                      <td>{event.registration_count || 0}</td>
                      <td>
                        <span className={`status-badge status-${status}`}>
                          {status === 'ongoing' && <span className="live-dot"></span>}
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link 
                            to={`/dashboard/events/${event.id}/edit`} 
                            className="btn btn-ghost btn-sm"
                          >
                            <Edit size={16} />
                          </Link>
                          <button 
                            onClick={() => handleDelete(event.id)}
                            className="btn btn-ghost btn-sm btn-danger"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="empty-state">
          <Calendar size={48} />
          <h4>No events found</h4>
          <p>
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Create your first event to get started.'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Link to="/dashboard/events/new" className="btn btn-primary">
              <Plus size={18} />
              Create Event
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
