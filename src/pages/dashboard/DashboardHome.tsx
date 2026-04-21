import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Plus,
  Eye,
  Award
} from 'lucide-react';
import { getEventStatus, formatDate } from '../../lib/utils';
import type { EventWithAnalytics } from '../../types/database';

export default function DashboardHome() {
  const { user } = useAuthStore();
  const { events, fetchEvents, isLoading } = useEventStore();

  useEffect(() => {
    if (user?.id) {
      fetchEvents(user.id);
    }
  }, [user?.id, fetchEvents]);

  // Categorize events
  const categorizedEvents = useMemo(() => {
    const live = events.filter(e => getEventStatus(e.start_date, e.end_date) === 'ongoing');
    const upcoming = events.filter(e => getEventStatus(e.start_date, e.end_date) === 'upcoming');
    const ended = events.filter(e => getEventStatus(e.start_date, e.end_date) === 'past');
    
    // Find event with highest success rate (check-in rate)
    let featured: EventWithAnalytics | null = null;
    let highestRate = 0;
    events.forEach(e => {
      const regCount = e.registration_count || 0;
      const rate = regCount > 0 ? (e.checked_in_count || 0) / regCount : 0;
      if (rate > highestRate && getEventStatus(e.start_date, e.end_date) !== 'past') {
        highestRate = rate;
        featured = e;
      }
    });
    
    return { 
      liveEvents: live, 
      upcomingEvents: upcoming, 
      endedEvents: ended, 
      featuredEvent: featured as EventWithAnalytics | null 
    };
  }, [events]);
  
  const { liveEvents, upcomingEvents, endedEvents, featuredEvent } = categorizedEvents;

  // Key Metrics calculations
  const metrics = useMemo(() => {
    const totalAttendees = events.reduce((sum, e) => sum + (e.checked_in_count || 0), 0);
    const totalRegistrations = events.reduce((sum, e) => sum + (e.registration_count || 0), 0);
    
    // Engagement rate
    const engagement = totalRegistrations > 0 
      ? Math.round((totalAttendees / totalRegistrations) * 100) 
      : 0;

    return {
      attendees: { value: totalAttendees, target: 10000 },
      engagement: { value: engagement, target: 75 },
    };
  }, [events]);

  const getProgressPercentage = (value: number, target: number) => {
    return Math.min(Math.round((value / target) * 100), 100);
  };

  return (
    <div className="operational-dashboard">
      {/* Events Overview Section */}
      <section className="events-overview">
        <div className="section-header">
          <h3>Events Overview</h3>
          <Link to="/dashboard/events" className="view-all-link">
            View All Events
          </Link>
        </div>
        
        {isLoading ? (
          <div className="loading-placeholder">Loading events...</div>
        ) : (
          <div className="events-grid-overview">
            {/* Live Event Card - Purple */}
            {liveEvents.length > 0 ? (
              <div className="event-card-overview live">
                <span className="status-badge live">
                  <span className="live-dot"></span>
                  Live
                </span>
                <div className="card-content">
                  <h4>{liveEvents[0].title}</h4>
                  <div className="event-meta">
                    <span><MapPin size={14} /> {liveEvents[0].venue_name || 'Convention Center'}</span>
                    <span><Clock size={14} /> {formatDate(liveEvents[0].start_date)}</span>
                  </div>
                </div>
                <Link to={`/dashboard/events/${liveEvents[0].id}`} className="view-btn-overlay">
                  <Eye size={16} />
                  View
                </Link>
              </div>
            ) : (
              <div className="event-card-overview empty">
                <div className="empty-content">
                  <Calendar size={32} />
                  <span>No live events</span>
                </div>
              </div>
            )}

            {/* Upcoming Event Card */}
            {upcomingEvents.length > 0 ? (
              <div className="event-card-overview upcoming">
                <span className="status-badge upcoming">Upcoming</span>
                <div className="card-content">
                  <h4>{upcomingEvents[0].title}</h4>
                  <div className="event-meta">
                    <span><MapPin size={14} /> {upcomingEvents[0].venue_name || 'Exhibition Hall'}</span>
                    <span><Clock size={14} /> {formatDate(upcomingEvents[0].start_date)}</span>
                  </div>
                </div>
                <Link to={`/dashboard/events/${upcomingEvents[0].id}`} className="view-btn">
                  View
                </Link>
              </div>
            ) : (
              <div className="event-card-overview empty">
                <div className="empty-content">
                  <Calendar size={32} />
                  <span>No upcoming events</span>
                </div>
              </div>
            )}

            {/* Ended Event Card */}
            {endedEvents.length > 0 ? (
              <div className="event-card-overview ended">
                <span className="status-badge ended">Ended</span>
                <div className="card-content">
                  <h4>{endedEvents[0].title}</h4>
                  <div className="event-meta">
                    <span><MapPin size={14} /> {endedEvents[0].venue_name || 'Digital Forum'}</span>
                    <span><Clock size={14} /> {formatDate(endedEvents[0].end_date)}</span>
                  </div>
                </div>
                <Link to={`/dashboard/events/${endedEvents[0].id}`} className="view-btn">
                  View
                </Link>
              </div>
            ) : (
              <div className="event-card-overview empty">
                <div className="empty-content">
                  <Calendar size={32} />
                  <span>No ended events</span>
                </div>
              </div>
            )}

            {/* Featured Event Card (Highest Success Rate) */}
            {featuredEvent ? (
              <div className="event-card-overview featured">
                <span className="status-badge success">
                  <Award size={12} />
                  Highest Success Rate
                </span>
                <div className="card-content">
                  <h4>{featuredEvent.title}</h4>
                  <div className="event-meta">
                    <span><MapPin size={14} /> {featuredEvent.venue_name || 'Training Room'}</span>
                    <span><Clock size={14} /> {formatDate(featuredEvent.start_date)}</span>
                  </div>
                </div>
                <Link to={`/dashboard/events/${featuredEvent.id}`} className="view-btn">
                  View
                </Link>
              </div>
            ) : upcomingEvents.length > 1 ? (
              <div className="event-card-overview upcoming">
                <span className="status-badge upcoming">Upcoming</span>
                <div className="card-content">
                  <h4>{upcomingEvents[1].title}</h4>
                  <div className="event-meta">
                    <span><MapPin size={14} /> {upcomingEvents[1].venue_name || 'Training Room'}</span>
                    <span><Clock size={14} /> {formatDate(upcomingEvents[1].start_date)}</span>
                  </div>
                </div>
                <Link to={`/dashboard/events/${upcomingEvents[1].id}`} className="view-btn">
                  View
                </Link>
              </div>
            ) : (
              <Link to="/dashboard/events/new" className="event-card-overview add-new">
                <Plus size={32} />
                <span>Create New Event</span>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Key Metrics Section */}
      <section className="key-metrics-section">
        <div className="section-header">
          <h3>Key Metrics</h3>
        </div>

        <div className="metrics-grid">
          {/* Attendees Number */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title" title="Total number of checked-in attendees across all events">Total Checked-In Attendees</span>
            </div>
            <div className="metric-value">{metrics.attendees.value.toLocaleString()}</div>
            <div className="metric-footer">
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>
                Overall attendance volume
              </span>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage(metrics.attendees.value, metrics.attendees.target)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Engagement */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title" title="Percentage of registered users who actually attended">Average Check-in Rate</span>
            </div>
            <div className="metric-value">{metrics.engagement.value}%</div>
            <div className="metric-footer">
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>
                Registrations vs. Actual check-ins
              </span>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage(metrics.engagement.value, metrics.engagement.target)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="quick-summary">
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-number">{liveEvents.length}</span>
            <span className="stat-label">Live Now</span>
          </div>
          <div className="summary-stat">
            <span className="stat-number">{upcomingEvents.length}</span>
            <span className="stat-label">Upcoming</span>
          </div>
          <div className="summary-stat">
            <span className="stat-number">{endedEvents.length}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="summary-stat">
            <span className="stat-number">{events.length}</span>
            <span className="stat-label">Total Events</span>
          </div>
        </div>
      </section>
    </div>
  );
}
