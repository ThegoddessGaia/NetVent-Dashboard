import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, MoreVertical } from 'lucide-react';
import { formatDate, getEventStatus } from '../../lib/utils';
import type { EventWithAnalytics } from '../../types/database';
import { useState } from 'react';

interface EventCardProps {
  event: EventWithAnalytics;
  isLive?: boolean;
}

export default function EventCard({ event, isLive }: EventCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const status = getEventStatus(event.start_date, event.end_date);

  const statusColors = {
    upcoming: 'status-upcoming',
    ongoing: 'status-ongoing',
    past: 'status-past',
  };

  return (
    <div className={`event-card ${isLive ? 'event-card-live' : ''}`}>
      <div className="event-card-header">
        {event.banner_url ? (
          <img src={event.banner_url} alt={event.title} className="event-banner" />
        ) : (
          <div className="event-banner-placeholder">
            <Calendar size={32} />
          </div>
        )}
        <div className={`event-status ${statusColors[status]}`}>
          {status === 'ongoing' && <span className="live-dot"></span>}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
        <div className="event-menu">
          <button onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical size={18} />
          </button>
          {showMenu && (
            <div className="event-menu-dropdown">
              <Link to={`/dashboard/events/${event.id}`}>View Details</Link>
              <Link to={`/dashboard/events/${event.id}/edit`}>Edit Event</Link>
              <Link to={`/dashboard/events/${event.id}/analytics`}>Analytics</Link>
            </div>
          )}
        </div>
      </div>
      
      <div className="event-card-body">
        <h4 className="event-title">{event.title}</h4>
        
        <div className="event-meta">
          <div className="event-meta-item">
            <Calendar size={14} />
            <span>{formatDate(event.start_date)}</span>
          </div>
          <div className="event-meta-item">
            <MapPin size={14} />
            <span>{event.venue_name}</span>
          </div>
        </div>

        <div className="event-stats">
          <div className="event-stat">
            <Users size={16} />
            <span>{event.registration_count || 0} registered</span>
          </div>
          {isLive && (
            <div className="event-stat live">
              <span className="live-dot"></span>
              <span>{event.checked_in_count || 0} checked in</span>
            </div>
          )}
        </div>
      </div>

      <div className="event-card-footer">
        <Link to={`/dashboard/events/${event.id}`} className="btn btn-secondary btn-sm">
          View Details
        </Link>
        <Link to={`/dashboard/events/${event.id}/analytics`} className="btn btn-ghost btn-sm">
          Analytics
        </Link>
      </div>
    </div>
  );
}
