import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Edit,
  Trash2,
  BarChart3,
  Plus,
  Navigation,
  ExternalLink,
  Copy,
  CheckCircle2,
  Linkedin,
  Twitter,
  Globe,
  User,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

import { useEventStore } from '../../stores/eventStore';
import { getEventStatus, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { RegistrationWithUser, Speaker } from '../../types/database';

// Fix for default marker icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

type PersonSpeaker = {
  key: string;
  source: 'external' | 'internal';
  name: string;
  title: string;
  company: string;
  bio: string;
  photoUrl: string | null;
  linkedinUrl: string;
  twitterUrl: string;
  websiteUrl: string;
};

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { currentEvent, fetchEvent, deleteEvent, agendaItems, fetchAgendaItems, isLoading } = useEventStore();

  const [registrations, setRegistrations] = useState<RegistrationWithUser[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchEvent(id);
    fetchAgendaItems(id);
    void fetchRegistrations(id);
    void fetchSpeakers(id);
  }, [id, fetchEvent, fetchAgendaItems]);

  const fetchRegistrations = async (eventId: string) => {
    setLoadingRegistrations(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          *,
          user:users(*)
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });

      if (!error && data) {
        setRegistrations(data as unknown as RegistrationWithUser[]);
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const fetchSpeakers = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setSpeakers(data as Speaker[]);
      }
    } catch (err) {
      console.error('Failed to fetch speakers:', err);
    }
  };

  const handleDelete = async () => {
    if (!currentEvent) return;

    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      const success = await deleteEvent(currentEvent.id);
      if (success) {
        toast.success('Event deleted successfully');
        navigate('/dashboard/events');
      } else {
        toast.error('Failed to delete event');
      }
    }
  };

  const copyEventLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 1800);
  };

  const status = useMemo(() => {
    if (!currentEvent) return 'upcoming';
    return getEventStatus(currentEvent.start_date, currentEvent.end_date);
  }, [currentEvent]);

  const registrationCount = registrations.filter((r) => r.status === 'registered').length;

  const allSpeakers = useMemo<PersonSpeaker[]>(() => {
    const externalSpeakerNames = new Set(
      speakers.map((speaker) => speaker.name?.trim().toLowerCase()).filter(Boolean)
    );

    const externalSpeakers: PersonSpeaker[] = speakers.map((speaker) => ({
      key: `external-${speaker.id}`,
      source: 'external',
      name: speaker.name,
      title: speaker.title || '',
      company: speaker.company || '',
      bio: speaker.bio || '',
      photoUrl: speaker.photo_url,
      linkedinUrl: speaker.linkedin_url || '',
      twitterUrl: speaker.twitter_url || '',
      websiteUrl: speaker.website_url || '',
    }));

    const internalSpeakers: PersonSpeaker[] = registrations
      .filter((reg) => reg.role === 'speaker' || reg.ticket_type === 'speaker')
      .filter((reg) => reg.user?.name)
      .filter((reg) => !externalSpeakerNames.has(reg.user.name.trim().toLowerCase()))
      .map((reg) => ({
        key: `internal-${reg.id}`,
        source: 'internal',
        name: reg.user.name,
        title: reg.user.position || '',
        company: reg.user.company || '',
        bio: reg.user.bio || '',
        photoUrl: reg.user.avatar_url,
        linkedinUrl: '',
        twitterUrl: '',
        websiteUrl: '',
      }));

    return [...externalSpeakers, ...internalSpeakers].sort((a, b) => a.name.localeCompare(b.name));
  }, [speakers, registrations]);

  if (isLoading || !currentEvent) {
    return (
      <div className="evd-loading">
        <div className="evd-loading-bar" />
        <div className="evd-loading-grid">
          <div className="evd-loading-card" />
          <div className="evd-loading-card" />
          <div className="evd-loading-card" />
        </div>
      </div>
    );
  }

  const formatEventDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const formatEventTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <div className="evd-page">
      <section className="evd-hero">
        <div className="evd-hero-bg">
          {currentEvent.banner_url ? <img src={currentEvent.banner_url} alt="" /> : <div className="evd-hero-fallback" />}
        </div>
        <div className="evd-hero-overlay" />

        <div className="evd-hero-content">
          <div className="evd-topbar">
            <button onClick={() => navigate('/dashboard/events')} className="evd-back-btn">
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button onClick={copyEventLink} className="evd-copy-btn">
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>

          <div className="evd-title-wrap">
            <div className={`evd-status evd-status-${status}`}>
              {status === 'upcoming' ? 'Upcoming' : status === 'ongoing' ? 'Live Now' : 'Completed'}
            </div>
            <h1>{currentEvent.title}</h1>
            <div className="evd-meta-inline">
              <span>
                <Calendar size={14} />
                {formatEventDate(currentEvent.start_date)}
              </span>
              <span>
                <Clock size={14} />
                {formatEventTime(currentEvent.start_date)} - {formatEventTime(currentEvent.end_date)}
              </span>
              {currentEvent.venue_name && (
                <span>
                  <MapPin size={14} />
                  {currentEvent.venue_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="evd-layout">
        <main className="evd-main">
          <section className="evd-card">
            <h2>About Event</h2>
            <p>{currentEvent.description || 'No description provided.'}</p>
          </section>

          {currentEvent.event_highlights?.length > 0 && (
            <section className="evd-card">
              <h2>Event Highlights</h2>
              <div className="evd-highlights">
                {currentEvent.event_highlights.map((highlight) => (
                  <div key={highlight} className="evd-highlight-item">
                    <CheckCircle2 size={14} />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {allSpeakers.length > 0 && (
            <section className="evd-card">
              <h2>Speakers</h2>
              <div className="evd-speakers-grid">
                {allSpeakers.map((speaker) => (
                  <article key={speaker.key} className="evd-speaker">
                    <div className="evd-speaker-avatar">
                      {speaker.photoUrl ? <img src={speaker.photoUrl} alt={speaker.name} /> : <User size={24} />}
                    </div>
                    <div className="evd-speaker-body">
                      <div className="evd-speaker-row">
                        <h3>{speaker.name}</h3>
                        <span className={`evd-speaker-tag evd-speaker-tag-${speaker.source}`}>
                          {speaker.source === 'internal' ? 'Internal' : 'Guest'}
                        </span>
                      </div>
                      {(speaker.title || speaker.company) && (
                        <p className="evd-speaker-role">
                          {speaker.title}
                          {speaker.title && speaker.company ? ' at ' : ''}
                          {speaker.company}
                        </p>
                      )}
                      {speaker.bio && <p className="evd-speaker-bio">{speaker.bio}</p>}
                      {(speaker.linkedinUrl || speaker.twitterUrl || speaker.websiteUrl) && (
                        <div className="evd-speaker-links">
                          {speaker.linkedinUrl && (
                            <a href={speaker.linkedinUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                              <Linkedin size={14} />
                            </a>
                          )}
                          {speaker.twitterUrl && (
                            <a href={speaker.twitterUrl} target="_blank" rel="noopener noreferrer" title="Twitter">
                              <Twitter size={14} />
                            </a>
                          )}
                          {speaker.websiteUrl && (
                            <a href={speaker.websiteUrl} target="_blank" rel="noopener noreferrer" title="Website">
                              <Globe size={14} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {currentEvent.venue_name && (
            <section className="evd-card">
              <h2>Venue</h2>
              <div className="evd-venue-info">
                <div>
                  <h3>{currentEvent.venue_name}</h3>
                  {currentEvent.venue_address && <p>{currentEvent.venue_address}</p>}
                  {currentEvent.latitude && currentEvent.longitude && currentEvent.latitude !== 0 && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${currentEvent.latitude},${currentEvent.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evd-directions"
                    >
                      <Navigation size={14} />
                      Get Directions
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {currentEvent.latitude && currentEvent.longitude && currentEvent.latitude !== 0 && currentEvent.longitude !== 0 && (
                <div className="evd-map-wrap">
                  <MapContainer
                    center={[currentEvent.latitude, currentEvent.longitude]}
                    zoom={15}
                    scrollWheelZoom={false}
                    className="evd-map"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[currentEvent.latitude, currentEvent.longitude]} />
                    <Circle
                      center={[currentEvent.latitude, currentEvent.longitude]}
                      radius={currentEvent.radius_meters || 100}
                      pathOptions={{ color: '#1f6feb', fillColor: '#1f6feb', fillOpacity: 0.14, weight: 2 }}
                    />
                  </MapContainer>
                  <div className="evd-geofence">Geofence: {currentEvent.radius_meters || 100}m radius</div>
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="evd-side">
          <section className="evd-card evd-actions">
            <div className="evd-stats">
              <div className="evd-stat-box">
                <span>{registrationCount}</span>
                <small>Registered</small>
              </div>
              <div className="evd-stat-box">
                <span>{registrations.length}</span>
                <small>Total</small>
              </div>
            </div>

            <div className="evd-action-grid">
              <Link to={`/dashboard/events/${id}/analytics`} className="evd-btn evd-btn-ghost">
                <BarChart3 size={15} />
                <span>Analytics</span>
              </Link>
              <Link to={`/dashboard/events/${id}/edit`} className="evd-btn evd-btn-primary">
                <Edit size={15} />
                <span>Edit Event</span>
              </Link>
              <button onClick={handleDelete} className="evd-btn evd-btn-danger" title="Delete event">
                <Trash2 size={15} />
              </button>
            </div>
          </section>

          <section className="evd-card">
            <h2>Schedule</h2>
            <div className="evd-kv">
              <div>
                <label>Starts</label>
                <span>{formatEventDate(currentEvent.start_date)} • {formatEventTime(currentEvent.start_date)}</span>
              </div>
              <div>
                <label>Ends</label>
                <span>{formatEventDate(currentEvent.end_date)} • {formatEventTime(currentEvent.end_date)}</span>
              </div>
            </div>
          </section>

          {currentEvent.interests?.length > 0 && (
            <section className="evd-card">
              <h2>Categories</h2>
              <div className="evd-tags">
                {currentEvent.interests.map((interest) => (
                  <span key={interest}>{interest}</span>
                ))}
              </div>
            </section>
          )}

          <section className="evd-card">
            <h2>Agenda</h2>
            {agendaItems.length > 0 ? (
              <div className="evd-list">
                {agendaItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="evd-list-item">
                    <strong>
                      {item.start_time
                        ? new Date(item.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : 'TBD'}
                    </strong>
                    <div>
                      <span>{item.title}</span>
                      {item.location_name && (
                        <small>
                          {item.location_name}
                          {item.floor && ` • Floor ${item.floor}`}
                        </small>
                      )}
                    </div>
                  </div>
                ))}
                {agendaItems.length > 5 && <Link to={`/dashboard/events/${id}/edit`}>+{agendaItems.length - 5} more items</Link>}
              </div>
            ) : (
              <div className="evd-empty">
                <p>No agenda yet</p>
                <Link to={`/dashboard/events/${id}/edit`} className="evd-btn evd-btn-primary">
                  <Plus size={14} />
                  <span>Add Agenda</span>
                </Link>
              </div>
            )}
          </section>

          <section className="evd-card">
            <h2>Recent Registrations</h2>
            {loadingRegistrations ? (
              <div className="evd-empty"><p>Loading...</p></div>
            ) : registrations.length > 0 ? (
              <div className="evd-list">
                {registrations.slice(0, 5).map((reg) => (
                  <div key={reg.id} className="evd-reg-item">
                    <div className="evd-reg-avatar">
                      {reg.user?.avatar_url ? (
                        <img src={reg.user.avatar_url} alt={reg.user.name} />
                      ) : (
                        <span>{reg.user?.name?.charAt(0).toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="evd-reg-meta">
                      <span>{reg.user?.name || 'Unknown User'}</span>
                      <small>{formatDate(reg.registered_at)}</small>
                    </div>
                  </div>
                ))}
                <Link to={`/dashboard/events/${id}/analytics`}>View all</Link>
              </div>
            ) : (
              <div className="evd-empty"><p>No registrations yet</p></div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
