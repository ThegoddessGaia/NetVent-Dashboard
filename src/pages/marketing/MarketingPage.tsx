import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { useCampaignStore } from '../../stores/campaignStore';
import type { CampaignInsert } from '../../types/database';
import {
  Mail,
  Rocket,
  CheckCircle,
  Clock,
  Send,
  Eye,
  Target,
  Plus,
  X,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export default function MarketingPage() {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const {
    campaigns,
    isLoading,
    error,
    fetchCampaigns,
    createCampaign,
    deleteCampaign,
    sendCampaign,
    clearError,
  } = useCampaignStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('');

  // New campaign form state
  const [form, setForm] = useState({
    event_id: '',
    name: '',
    title: '',
    message: '',
    target_interests: [] as string[],
    target_roles: [] as string[],
  });

  useEffect(() => {
    if (user?.id) {
      fetchEvents(user.id);
      fetchCampaigns(user.id);
    }
  }, [user?.id, fetchEvents, fetchCampaigns]);

  // Stats computed from real data
  const campaignStats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === 'active').length;
    const completed = campaigns.filter((c) => c.status === 'completed').length;
    const scheduled = campaigns.filter((c) => c.status === 'scheduled').length;
    const draft = campaigns.filter((c) => c.status === 'draft').length;
    return { active, completed, scheduled, draft };
  }, [campaigns]);

  // Performance metrics from real data
  const performanceMetrics = useMemo(() => {
    const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + c.opened_count, 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + c.clicked_count, 0);
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0';
    return { totalSent, totalOpened, totalClicked, openRate, clickRate };
  }, [campaigns]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    if (!selectedEventFilter) return campaigns;
    return campaigns.filter((c) => c.event_id === selectedEventFilter);
  }, [campaigns, selectedEventFilter]);

  const handleCreateCampaign = async () => {
    if (!user?.id || !form.event_id || !form.name || !form.title || !form.message) return;

    const campaignData: CampaignInsert = {
      event_id: form.event_id,
      organizer_id: user.id,
      name: form.name,
      title: form.title,
      message: form.message,
      status: 'draft',
      target_interests: form.target_interests,
      target_ticket_types: [], // Hardcoded to empty as per requirement
      target_roles: form.target_roles,
    };

    const result = await createCampaign(campaignData);
    if (result) {
      setShowCreateModal(false);
      setForm({ event_id: '', name: '', title: '', message: '', target_interests: [], target_roles: [] });
      setSuccessMessage('Campaign created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    setSendingId(campaignId);
    const result = await sendCampaign(campaignId);
    setSendingId(null);
    if (result.success) {
      setSuccessMessage(`Campaign sent to ${result.sent_count} attendees!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      await deleteCampaign(campaignId);
    }
  };

  const getEventTitle = (eventId: string) => {
    return events.find((e) => e.id === eventId)?.title || 'Unknown Event';
  };

  const interestOptions = [
    "Technology",
    "Business",
    "Design",
    "Marketing",
    "Healthcare",
    "Education",
    "Finance",
    "Entertainment",
    "Sports",
    "Networking",
    "Startups",
    "AI/ML",
    "Sustainability",
    "Innovation",
  ];

  const roleOptions = ['attendee', 'vip', 'speaker', 'staff', 'organizer'];

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  return (
    <div className="marketing-page">
      <div className="page-header">
        <div className="page-header-content">
          <h2>Marketing Campaigns</h2>
          <p>Create targeted campaigns for your event attendees based on their preferences</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          Create New Campaign
        </button>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="alert alert-success" style={{ margin: '0 0 16px', padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ margin: '0 0 16px', padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
          <button onClick={clearError} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Campaign Summary Cards */}
      <div className="campaign-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="summary-card priority">
          <div className="summary-icon"><Rocket size={24} /></div>
          <div className="summary-value">{campaignStats.draft}</div>
          <div className="summary-label">Draft</div>
          <div className="summary-sub">Ready to send</div>
        </div>
        <div className="summary-card active">
          <div className="summary-icon"><Send size={24} /></div>
          <div className="summary-value">{campaignStats.active}</div>
          <div className="summary-label">Active</div>
          <div className="summary-sub">Currently sent</div>
        </div>
        <div className="summary-card completed">
          <div className="summary-icon"><CheckCircle size={24} /></div>
          <div className="summary-value">{campaignStats.completed}</div>
          <div className="summary-label">Completed</div>
          <div className="summary-sub">Finished</div>
        </div>
        <div className="summary-card scheduled">
          <div className="summary-icon"><Clock size={24} /></div>
          <div className="summary-value">{campaignStats.scheduled}</div>
          <div className="summary-label">Scheduled</div>
          <div className="summary-sub">Awaiting launch</div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="performance-section" style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 16px' }}>Performance Overview</h3>
        <div className="performance-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
            <Send size={20} style={{ color: '#4B3F91', marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{performanceMetrics.totalSent.toLocaleString()}</div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Sent</div>
          </div>
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
            <Eye size={20} style={{ color: '#8B5CF6', marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{performanceMetrics.openRate}%</div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Open Rate</div>
          </div>
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
            <Target size={20} style={{ color: '#10b981', marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{performanceMetrics.clickRate}%</div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Click-Through Rate</div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="campaigns-section" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Campaigns</h3>
          <select
            value={selectedEventFilter}
            onChange={(e) => setSelectedEventFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            title="Filter by event"
          >
            <option value="">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>

        {isLoading && campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading campaigns...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            <Mail size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p>No campaigns yet. Create your first campaign to reach your attendees!</p>
          </div>
        ) : (
          <div className="campaigns-table-container">
            <table className="campaigns-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>Campaign</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>Event</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>Sent</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>Opened</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>Clicked</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: '600' }}>{campaign.name}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{campaign.title}</div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px', color: '#6b7280' }}>
                      {getEventTitle(campaign.event_id)}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: campaign.status === 'active' ? '#dcfce7' : campaign.status === 'draft' ? '#f3f4f6' : campaign.status === 'completed' ? '#dbeafe' : campaign.status === 'scheduled' ? '#fef9c3' : '#fef2f2',
                        color: campaign.status === 'active' ? '#166534' : campaign.status === 'draft' ? '#374151' : campaign.status === 'completed' ? '#1e40af' : campaign.status === 'scheduled' ? '#854d0e' : '#991b1b',
                      }}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>{campaign.sent_count.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>{campaign.opened_count.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>{campaign.clicked_count.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {campaign.status === 'draft' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSendCampaign(campaign.id)}
                            disabled={sendingId === campaign.id}
                            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Send size={14} />
                            {sendingId === campaign.id ? 'Sending...' : 'Send'}
                          </button>
                        )}
                        {(campaign.status === 'draft' || campaign.status === 'cancelled') && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            style={{ padding: '6px 8px', fontSize: '12px', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>Create Campaign</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Event Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>Event *</label>
                <select
                  value={form.event_id}
                  onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  title="Select event"
                >
                  <option value="">Select an event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>

              {/* Campaign Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>Campaign Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Early Bird Promotion"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Notification Title */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>Notification Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Title attendees will see"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Campaign message for attendees..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Targeting: Interests */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>Target Interests (Mobile App Notifications)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {interestOptions.map((interest) => (
                    <label key={interest} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.target_interests.includes(interest)}
                        onChange={() => setForm({ ...form, target_interests: toggleArrayItem(form.target_interests, interest) })}
                      />
                      {interest}
                    </label>
                  ))}
                </div>
                <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#2563eb' }}>
                  Select interests to notify mobile app users who chose these topics. Leave empty to target all attendees.
                </span>
              </div>

              {/* Targeting: Roles */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>Target Roles</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {roleOptions.map((r) => (
                    <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.target_roles.includes(r)}
                        onChange={() => setForm({ ...form, target_roles: toggleArrayItem(form.target_roles, r) })}
                      />
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </label>
                  ))}
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Leave unchecked to target all roles.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateCampaign}
                disabled={!form.event_id || !form.name || !form.title || !form.message || isLoading}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                {isLoading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
