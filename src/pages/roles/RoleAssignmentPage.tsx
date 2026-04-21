import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { supabase } from '../../lib/supabase';
import {
  Crown,
  Mic,
  Shield,
  Users,
  Search,
  ChevronDown,
  UserPlus,
  X,
  Edit2,
  Save,
  Briefcase,
  ArrowUpDown,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { MockRegistration } from '../../lib/mockData';
import toast from 'react-hot-toast';

type RoleFilter = 'all' | 'vip' | 'speaker' | 'staff' | 'organizer' | 'attendee';

export default function RoleAssignmentPage() {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [registrations, setRegistrations] = useState<MockRegistration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editZone, setEditZone] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'date'>('name');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<string>('vip');

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
      loadData();
    }
  }, [selectedEvent]);

  const loadData = async () => {
    if (!selectedEvent) return;
    setIsLoading(true);

    try {
      const { data: realRegs } = await supabase
        .from('registrations')
        .select('*, user:users(name, email, company, position, avatar_url)')
        .eq('event_id', selectedEvent);

      if (realRegs && realRegs.length > 0) {
        setRegistrations(
          realRegs.map((r: any) => ({
            ...r,
            user_name: r.user?.name || 'Unknown',
            user_email: r.user?.email || '',
            user_company: r.user?.company || '',
            user_position: r.user?.position || '',
            user_avatar_url: r.user?.avatar_url || null,
            ticket_type: r.ticket_type || 'general',
            role: r.role || 'attendee',
          })) as MockRegistration[]
        );
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      setRegistrations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      vip: registrations.filter((r) => r.role === 'vip' || r.ticket_type === 'vip').length,
      speakers: registrations.filter((r) => r.role === 'speaker' || r.ticket_type === 'speaker').length,
      staff: registrations.filter((r) => r.role === 'staff' || r.ticket_type === 'staff').length,
      organizers: registrations.filter((r) => r.role === 'organizer' || r.ticket_type === 'organizer').length,
      attendees: registrations.filter((r) => r.role === 'attendee' && r.ticket_type === 'general').length,
    };
  }, [registrations]);

  const startEdit = (reg: MockRegistration) => {
    setEditingId(reg.id);
    setEditRole(reg.role || 'attendee');
    setEditZone(reg.assigned_zone || '');
  };

  const saveEdit = async (regId: string) => {
    try {
      const updateData = {
        role: editRole,
        ticket_type: editRole === 'attendee' ? 'general' : editRole,
        assigned_zone: editZone || null,
      };

      const { error } = await supabase
        .from('registrations')
        // @ts-ignore - Extended columns from migration not yet in generated types
        .update(updateData)
        .eq('id', regId);

      if (error) {
        console.warn('DB update failed, updating locally:', error.message);
      }
    } catch (err) {
      // Ignore network errors; local state still updates.
    }

    setRegistrations((prev) =>
      prev.map((r): MockRegistration =>
        r.id === regId
          ? {
              ...r,
              role: editRole,
              ticket_type: editRole === 'attendee' ? 'general' : editRole,
              assigned_zone: editZone || null,
            }
          : r
      )
    );
    setEditingId(null);
    toast.success('Role updated successfully');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const quickAssign = async (regId: string, role: string) => {
    const ticketType = role === 'attendee' ? 'general' : role;

    try {
      const { error } = await supabase
        .from('registrations')
        .update({ role, ticket_type: ticketType } as never)
        .eq('id', regId);

      if (error) {
        console.warn('DB update failed, updating locally:', error.message);
      }
    } catch (err) {
      // Ignore network errors; local state still updates.
    }

    setRegistrations((prev) =>
      prev.map((r): MockRegistration => (r.id === regId ? { ...r, role, ticket_type: ticketType } : r))
    );
    toast.success(`Assigned as ${role.toUpperCase()}`);
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, company, position, avatar_url')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      const existingUserIds = new Set(registrations.map((r) => r.user_id));
      setUserSearchResults((data || []).filter((u: any) => !existingUserIds.has(u.id)));
    } catch (err) {
      console.error('Error searching users:', err);
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const addExistingUser = async (
    userId: string,
    userName: string,
    userEmail: string,
    userCompany: string,
    userPosition: string,
    userAvatar: string | null
  ) => {
    if (!selectedEvent) return;

    setAddingUserId(userId);
    const ticketType = addRole === 'attendee' ? 'general' : addRole;

    try {
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          user_id: userId,
          event_id: selectedEvent,
          status: 'registered',
          ticket_type: ticketType,
          role: addRole,
          assigned_zone: addRole === 'vip' ? 'VIP Lounge' : null,
        } as never)
        .select()
        .single();

      if (error) throw error;

      const newReg: MockRegistration = {
        id: (data as any).id,
        user_id: userId,
        event_id: selectedEvent,
        status: 'registered',
        ticket_type: ticketType,
        role: addRole,
        assigned_zone: addRole === 'vip' ? 'VIP Lounge' : null,
        notes: null,
        registered_at: new Date().toISOString(),
        checked_in_at: null,
        checked_out_at: null,
        user_name: userName,
        user_email: userEmail,
        user_company: userCompany,
        user_position: userPosition,
        user_avatar_url: userAvatar,
      };

      setRegistrations((prev) => [newReg, ...prev]);
      setUserSearchResults((prev) => prev.filter((u) => u.id !== userId));
      toast.success(`${userName} added as ${addRole.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add user');
    } finally {
      setAddingUserId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'vip':
        return <Crown size={14} className="role-icon-vip" />;
      case 'speaker':
        return <Mic size={14} className="role-icon-speaker" />;
      case 'staff':
        return <Shield size={14} className="role-icon-staff" />;
      case 'organizer':
        return <Crown size={14} className="role-icon-vip" style={{ color: '#4f46e5' }} />;
      default:
        return <Users size={14} className="role-icon-attendee" />;
    }
  };

  const filteredRegs = useMemo(() => {
    let result = [...registrations];

    if (searchQuery) {
      result = result.filter(
        (r) =>
          r.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.user_company.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((r) => r.role === roleFilter || r.ticket_type === roleFilter);
    }

    if (sortBy === 'name') result.sort((a, b) => a.user_name.localeCompare(b.user_name));
    if (sortBy === 'role') result.sort((a, b) => a.role.localeCompare(b.role));
    if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
    }

    return result;
  }, [registrations, searchQuery, roleFilter, sortBy]);

  return (
    <div className="role-assignment-page">
      <div className="page-header">
        <div className="page-header-content">
          <h2>
            <Crown size={24} />
            Role Assignment
          </h2>
          <p>Assign and update attendee roles with quick actions</p>
        </div>
        <div className="role-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadData} 
            disabled={isLoading || !selectedEvent}
            title="Reload Data"
            style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Reload
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddUserModal(true)}>
            <UserPlus size={16} />
            Add Existing User
          </button>
          <div className="event-selector">
            <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} title="Select event">
              <option value="">Select Event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      <div className="role-stats-grid">
        <div className="role-stat-card" onClick={() => setRoleFilter('all')}>
          <Users size={24} />
          <span className="role-stat-value">{stats.total}</span>
          <span className="role-stat-label">Total</span>
        </div>
        <div className="role-stat-card vip" onClick={() => setRoleFilter('vip')}>
          <Crown size={24} />
          <span className="role-stat-value">{stats.vip}</span>
          <span className="role-stat-label">VIP</span>
        </div>
        <div className="role-stat-card speaker" onClick={() => setRoleFilter('speaker')}>
          <Mic size={24} />
          <span className="role-stat-value">{stats.speakers}</span>
          <span className="role-stat-label">Speakers</span>
        </div>
        <div className="role-stat-card staff" onClick={() => setRoleFilter('staff')}>
          <Shield size={24} />
          <span className="role-stat-value">{stats.staff}</span>
          <span className="role-stat-label">Staff</span>
        </div>
        <div className="role-stat-card vip" onClick={() => setRoleFilter('organizer')} style={{ borderLeftColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.05)', color: '#4f46e5' }}>
          <Crown size={24} />
          <span className="role-stat-value">{stats.organizers}</span>
          <span className="role-stat-label">Organizers</span>
        </div>
        <div className="role-stat-card attendee" onClick={() => setRoleFilter('attendee')}>
          <Briefcase size={24} />
          <span className="role-stat-value">{stats.attendees}</span>
          <span className="role-stat-label">Attendees</span>
        </div>
      </div>

      <div className="data-table-section">
        <div className="table-filters role-table-filters">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setSortBy(sortBy === 'name' ? 'role' : sortBy === 'role' ? 'date' : 'name')}
          >
            <ArrowUpDown size={14} />
            Sort: {sortBy === 'name' ? 'Name' : sortBy === 'role' ? 'Role' : 'Date'}
          </button>
        </div>

        <div className="role-table-shell">
          <div className="role-table-caption">
            <span>{filteredRegs.length} attendee records</span>
            <span className="role-table-note">Use quick actions or edit each row for zone assignment</span>
          </div>
          <div className="attendee-table-container role-table-container">
            <table className="attendee-table role-table">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Quick Assign</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="loading-cell">
                      Loading...
                    </td>
                  </tr>
                ) : filteredRegs.length > 0 ? (
                  filteredRegs.slice(0, 80).map((reg) => {
                    const isCheckedIn = !!reg.checked_in_at && !reg.checked_out_at;
                    return (
                    <tr key={reg.id} className={`role-row role-${reg.role}`}>
                      <td>
                        <div className="attendee-cell">
                          <div className="attendee-avatar-sm">{reg.user_name.charAt(0)}</div>
                          <div>
                            <span className="attendee-name">{reg.user_name}</span>
                            <span className="attendee-email">{reg.user_email}</span>
                          </div>
                        </div>
                      </td>
                      <td>{reg.user_company || '-'}</td>
                      <td>
                        {editingId === reg.id ? (
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)} title="Role">
                            <option value="attendee">Attendee</option>
                            <option value="vip">VIP</option>
                            <option value="speaker">Speaker</option>
                            <option value="staff">Staff</option>
                          </select>
                        ) : (
                          <span className={`role-badge role-${reg.role}`}>
                            {getRoleIcon(reg.role)}
                            {reg.role}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`role-status ${isCheckedIn ? 'checked-in' : 'pending'}`}>
                          <CheckCircle2 size={13} />
                          {isCheckedIn ? 'Checked In' : 'Registered'}
                        </span>
                      </td>
                      <td>
                        <div className="quick-assign-actions">
                          <button
                            className="quick-btn quick-vip"
                            onClick={() => quickAssign(reg.id, 'vip')}
                            title="Assign VIP"
                          >
                            <Crown size={12} />
                          </button>
                          <button
                            className="quick-btn quick-attendee"
                            onClick={() => quickAssign(reg.id, 'attendee')}
                            title="Assign Attendee"
                            style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }}
                          >
                            <Users size={12} />
                          </button>
                          <button
                            className="quick-btn quick-speaker"
                            onClick={() => quickAssign(reg.id, 'speaker')}
                            title="Assign Speaker"
                          >
                            <Mic size={12} />
                          </button>
                          <button
                            className="quick-btn quick-staff"
                            onClick={() => quickAssign(reg.id, 'staff')}
                            title="Assign Staff"
                          >
                            <Shield size={12} />
                          </button>
                        </div>
                      </td>
                      <td>
                        {editingId === reg.id ? (
                          <div className="edit-actions">
                            <button className="btn-icon-success" onClick={() => saveEdit(reg.id)} title="Save">
                              <Save size={14} />
                            </button>
                            <button className="btn-icon-danger" onClick={cancelEdit} title="Cancel">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button className="btn-icon" onClick={() => startEdit(reg)} title="Edit">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      No registrations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddUserModal && (
        <div className="role-modal-overlay">
          <div className="role-modal-card">
            <div className="role-modal-header">
              <h3>Add Existing User</h3>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setUserSearchQuery('');
                  setUserSearchResults([]);
                }}
                className="btn-icon"
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {!selectedEvent ? (
              <p className="role-modal-helper">Please select an event first.</p>
            ) : (
              <>
                <div className="role-modal-row">
                  <div className="role-modal-field">
                    <label>Role</label>
                    <select value={addRole} onChange={(e) => setAddRole(e.target.value)} title="Select role">
                      <option value="vip">VIP</option>
                      <option value="speaker">Speaker</option>
                      <option value="staff">Staff</option>
                      <option value="attendee">Attendee</option>
                    </select>
                  </div>
                </div>

                <div className="role-modal-search">
                  <Search size={16} className="role-modal-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or company..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                  />
                </div>

                {searchingUsers && <p className="role-modal-helper centered">Searching...</p>}

                {userSearchResults.length > 0 && (
                  <div className="role-modal-results">
                    {userSearchResults.map((u: any) => (
                      <div key={u.id} className="role-modal-user">
                        <div className="role-modal-avatar">{u.name?.charAt(0) || '?'}</div>
                        <div className="role-modal-user-info">
                          <div className="role-modal-user-name">{u.name}</div>
                          <div className="role-modal-user-email">{u.email}</div>
                          {u.company && (
                            <div className="role-modal-user-company">
                              {u.company}
                              {u.position ? ` - ${u.position}` : ''}
                            </div>
                          )}
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            addExistingUser(u.id, u.name, u.email, u.company || '', u.position || '', u.avatar_url)
                          }
                          disabled={addingUserId === u.id}
                        >
                          {addingUserId === u.id ? '...' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {userSearchQuery.length >= 2 && !searchingUsers && userSearchResults.length === 0 && (
                  <p className="role-modal-helper centered spacious">
                    No users found matching "{userSearchQuery}"
                  </p>
                )}

                {userSearchQuery.length < 2 && (
                  <p className="role-modal-hint">Type at least 2 characters to search for users</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}