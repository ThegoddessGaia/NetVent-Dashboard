import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { supabase } from '../../lib/supabase';
import { feedsService } from '../../lib/feedsService';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Image,
  Send,
  Calendar,
  UserPlus,
  Users,
  User,
  X,
  UserCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '../../lib/chatService';
import { socialService } from '../../lib/socialService';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  position: string | null;
  interests: string[];
}

interface Post {
  id: string;
  user_id: string;
  event_id: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user?: UserProfile;
  event?: {
    id: string;
    title: string;
  };
  isLiked?: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: UserProfile;
}

function CreatePostBox({ organizerId, eventId, onPostCreated }: { organizerId: string, eventId: string | null, onPostCreated: (post: any) => void }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;

    setIsSubmitting(true);
    const result = await feedsService.createPost({
      userId: organizerId,
      eventId: eventId || undefined,
      content: content.trim(),
      imageFile: imageFile || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setContent('');
      clearImage();
      toast.success('Announcement posted successfully!');
      if (onPostCreated) onPostCreated(result.data);
    } else {
      toast.error('Failed to post announcement.');
      console.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post-box">
      <h3 className="create-post-title">Create Announcement</h3>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's happening? Share articles, updates, or photos..."
        className="create-post-textarea"
      />

      {imagePreview && (
        <div className="create-post-preview-container">
          <img src={imagePreview} alt="Preview" className="create-post-preview-img" />
          <button type="button" onClick={clearImage} className="create-post-clear-btn" title="Remove image">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="create-post-action-bar">
        <div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="create-post-photo-btn"
          >
            <Image size={20} />
            <span>Add Photo</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || (!content.trim() && !imageFile)}
          className="create-post-submit-btn"
        >
          {isSubmitting ? (
            <span>Posting...</span>
          ) : (
            <>
              <span>Post</span>
              <Send size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function OrganizerChat({ organizerId }: { organizerId: string }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!organizerId) return;
    loadContacts();

    const subscription = chatService.subscribeToMessages(organizerId, (newMsg: any) => {
      setActiveContact((currentActive: any) => {
        if (currentActive && newMsg.sender_id === currentActive.id) {
          setMessages((prev) => [...prev, newMsg]);
          chatService.markAsRead([newMsg.id]);
        } else {
          loadContacts();
        }
        return currentActive;
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [organizerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContact]);

  const loadContacts = async () => {
    try {
      const [recentContacts, connections] = await Promise.all([
        chatService.fetchRecentContacts(organizerId),
        socialService.fetchConnections(organizerId)
      ]);
      
      const recentIds = new Set(recentContacts.map((c: any) => c.user.id));
      
      const acceptedFriends = connections
        .filter((c: any) => c.status === 'accepted' && c.friend && !recentIds.has(c.friend.id))
        .map((c: any) => ({
          user: c.friend,
          lastMessage: 'Start a new conversation',
          unreadCount: 0
        }));

      setContacts([...recentContacts, ...acceptedFriends]);
    } catch (error) {
      console.error('Error loading contacts', error);
    }
  };

  const openConversation = async (contactUser: any) => {
    setActiveContact(contactUser);
    try {
      const history = await chatService.fetchConversation(organizerId, contactUser.id);
      setMessages(history);
      
      setContacts((prev) => 
        prev.map((c) => c.user.id === contactUser.id ? { ...c, unreadCount: 0 } : c)
      );
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    const tempContent = newMessage.trim();
    setNewMessage(''); 

    try {
      const sentMsg = await chatService.sendMessage(organizerId, activeContact.id, tempContent);
      setMessages((prev) => [...prev, sentMsg]);
      loadContacts(); 
    } catch (error) {
      alert('Failed to send message.');
      setNewMessage(tempContent); 
    }
  };

  return (
    <div className="org-chat-container">
      <div className="org-chat-sidebar">
        <div className="org-chat-sidebar-header">
          <h2 className="org-chat-sidebar-title">Attendee Chats</h2>
        </div>
        <div className="org-chat-contact-list">
          {contacts.map((contact) => (
            <button
              key={contact.user.id}
              onClick={() => openConversation(contact.user)}
                className="org-chat-contact-btn"
            >
              {contact.user.avatar_url ? (
                <img src={contact.user.avatar_url} alt="" className="org-chat-avatar" />
              ) : (
                <UserCircle size={48} className="org-chat-avatar" style={{ fill: '#4654A1', color: 'white' }} />
              )}
              <div className="org-chat-contact-info">
                <div className="org-chat-contact-name-row">
                  <h4 className="org-chat-contact-name">{contact.user.name}</h4>
                  {contact.unreadCount > 0 && (
                    <span className="org-chat-unread-badge">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
                <p className="org-chat-last-message">{contact.lastMessage}</p>
              </div>
            </button>
          ))}
          {contacts.length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
              No conversations yet. Attendees you match with or message will appear here.
            </div>
          )}
        </div>
      </div>

      <div className="org-chat-main">
        {activeContact ? (
          <>
            <div className="org-chat-header">
              {activeContact.avatar_url ? (
                <img src={activeContact.avatar_url} alt="" className="org-chat-avatar" style={{ width: '2.5rem', height: '2.5rem' }} />
              ) : (
                <UserCircle size={40} className="org-chat-avatar" style={{ width: '2.5rem', height: '2.5rem', fill: '#4654A1', color: 'white' }} />
              )}
              <div>
                <h3 className="org-chat-header-name">{activeContact.name}</h3>
                {activeContact.position && activeContact.company && (
                   <p className="org-chat-header-desc">
                     {activeContact.position} at {activeContact.company}
                   </p>
                )}
              </div>
            </div>

            <div className="org-chat-messages">
              {messages.map((msg) => {
                const isMe = msg.sender_id === organizerId;
                return (
                  <div key={msg.id} className={`org-chat-bubble-row ${isMe ? 'me' : ''}`}>
                    <div className={`org-chat-bubble ${isMe ? 'me' : ''}`}>
                      <p>{msg.content}</p>
                      <span className="org-chat-time">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="org-chat-input-area">
              <div className="org-chat-input-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message attendee..."
                  className="org-chat-input"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="org-chat-submit"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="org-chat-empty">
            Select an attendee from the sidebar to view your conversation.
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionsManager({ organizerId }: { organizerId: string }) {
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Group connections
  const incomingRequests = connections.filter(c => c.isIncoming);
  const acceptedFriends = connections.filter(c => c.status === 'accepted');
  const pendingSent = connections.filter(c => c.status === 'pending' && !c.isIncoming);

  useEffect(() => {
    loadConnections();
  }, [organizerId]);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const data = await socialService.fetchConnections(organizerId);
      setConnections(data);
    } catch (error) {
      console.error("Failed to load connections", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await socialService.acceptRequest(id);
      toast.success("Request accepted!");
      loadConnections(); 
    } catch (error) {
      toast.error("Failed to accept request");
    }
  };

  const handleRemove = async (id: string, isReject = false) => {
    if (!isReject && !window.confirm("Are you sure you want to remove this connection?")) return;
    try {
      await socialService.removeConnection(id);
      toast.success(isReject ? "Request ignored" : "Connection removed");
      loadConnections();
    } catch (error) {
      toast.error(isReject ? "Failed to ignore request" : "Failed to update connection");
    }
  };

  if (isLoading) return <div className="org-connections-empty" style={{padding: '1rem'}}>Loading connections...</div>;

  return (
    <div className="org-connections-container">
      <h2 className="org-connections-header">
        <UserPlus size={24} />
        Network Connections
      </h2>

      {/* Incoming Requests Section */}
      {incomingRequests.length > 0 && (
        <div className="org-connections-section">
          <h3 className="org-connections-section-title">
            Incoming Requests ({incomingRequests.length})
          </h3>
          <div className="org-connections-list">
            {incomingRequests.map((req) => (
              <div key={req.id} className="org-connection-card">
                <div className="org-connection-user">
                  {req.friend?.avatar_url ? (
                    <img src={req.friend.avatar_url} alt="" className="org-connection-avatar" />
                  ) : (
                    <UserCircle size={48} className="org-connection-avatar" style={{ fill: '#4654A1', color: 'white' }} />
                  )}
                  <div className="org-connection-info">
                    <p className="org-connection-name">{req.friend?.name || "Unknown User"}</p>
                    <p className="org-connection-desc">
                      {req.friend?.position} {req.friend?.company && `at ${req.friend.company}`}
                    </p>
                  </div>
                </div>
                <div className="org-connection-actions">
                  <button 
                    onClick={() => handleAccept(req.id)}
                    className="org-btn-accept"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleRemove(req.id, true)}
                    className="org-btn-ignore"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Friends Section */}
      <div className="org-connections-section">
        <h3 className="org-connections-section-title">
          My Connections ({acceptedFriends.length})
        </h3>
        {acceptedFriends.length === 0 ? (
          <p className="org-connections-empty">No established connections yet.</p>
        ) : (
          <div className="org-connections-grid">
            {acceptedFriends.map((conn) => (
              <div key={conn.id} className="org-connection-card">
                <div className="org-connection-user">
                  {conn.friend?.avatar_url ? (
                    <img src={conn.friend.avatar_url} alt="" className="org-connection-avatar" />
                  ) : (
                    <UserCircle size={48} className="org-connection-avatar" style={{ fill: '#4654A1', color: 'white' }} />
                  )}
                  <div className="org-connection-info">
                    <p className="org-connection-name">{conn.friend?.name || "Unknown User"}</p>
                    <p className="org-connection-desc">
                      {conn.friend?.position} {conn.friend?.company && `at ${conn.friend.company}`}
                    </p>
                  </div>
                </div>
                <div className="org-connection-actions">
                  <button 
                    onClick={() => handleRemove(conn.id)}
                    className="org-btn-remove"
                    title="Remove Connection"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Sent/Pending Requests Preview */}
      {pendingSent.length > 0 && (
        <div className="org-connections-footer">
          <p>
            You have <strong>{pendingSent.length}</strong> outgoing connection request(s) awaiting approval.
          </p>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuthStore();
  const { currentEvent } = useEventStore();
  const [activeTab, setActiveTab] = useState<'feed' | 'connections' | 'chat'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPosts();
    fetchAllUsers();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:users(*),
          event:events(id, title)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      // Check which posts the current user has liked
      if (user && data) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set((likes as any[])?.map(l => l.post_id) || []);
        
        const postsWithLikes = (data as any[]).map(post => ({
          ...post,
          isLiked: likedPostIds.has(post.id)
        }));
        
        setPosts(postsWithLikes as Post[]);
      } else {
        setPosts(data as Post[]);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Filter out current user from suggestions
      const filteredUsers = user 
        ? (data || []).filter((u: UserProfile) => u.id !== user.id)
        : (data || []);
      
      setSuggestedUsers(filteredUsers as UserProfile[]);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleLikePost = async (postId: string, isCurrentlyLiked: boolean) => {
    if (!user) return;

    try {
      if (isCurrentlyLiked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        await (supabase
          .from('posts') as any)
          .update({ likes_count: posts.find(p => p.id === postId)!.likes_count - 1 })
          .eq('id', postId);
      } else {
        // Like
        await (supabase
          .from('post_likes') as any)
          .insert({ post_id: postId, user_id: user.id });
        
        await (supabase
          .from('posts') as any)
          .update({ likes_count: posts.find(p => p.id === postId)!.likes_count + 1 })
          .eq('id', postId);
      }

      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, isLiked: !isCurrentlyLiked, likes_count: p.likes_count + (isCurrentlyLiked ? -1 : 1) }
          : p
      ));
    } catch (err) {
      console.error('Failed to like/unlike post:', err);
    }
  };

  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments);
    
    if (expandedComments.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      // Fetch comments if not already loaded
      if (!postComments[postId]) {
        const { data } = await supabase
          .from('comments')
          .select('*, user:users(*)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        
        setPostComments(prev => ({ ...prev, [postId]: data as Comment[] || [] }));
      }
    }
    
    setExpandedComments(newExpanded);
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !commentInputs[postId]?.trim()) return;

    try {
      const { error } = await (supabase
        .from('comments') as any)
        .insert({
          post_id: postId,
          user_id: user.id,
          content: commentInputs[postId].trim(),
        });

      if (error) throw error;

      // Update comments count
      await (supabase
        .from('posts') as any)
        .update({ comments_count: posts.find(p => p.id === postId)!.comments_count + 1 })
        .eq('id', postId);

      // Refresh comments
      const { data } = await supabase
        .from('comments')
        .select('*, user:users(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      setPostComments(prev => ({ ...prev, [postId]: data as Comment[] || [] }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      
      // Update post comments count locally
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));

      toast.success('Comment added!');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to add comment');
    }
  };

  const handleConnect = async (targetUserId: string) => {
    if (!user) return;

    try {
      const response = await socialService.sendConnectionRequest(user.id, targetUserId);
      
      if (!response.success) {
        toast.error(response.message || 'Already connected');
        return;
      }

      toast.success('Connection request sent!');
      // Remove from suggestions since it's pending now
      setSuggestedUsers(prev => prev.filter(u => u.id !== targetUserId));
    } catch (err) {
      console.error('Failed to send connection request:', err);
      toast.error('Failed to send connection request');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="feed-page">
      <div className="feed-header">
        <div className="page-header-content">
          <h2>Communication</h2>
          <p>Manage community feeds, announcements, and direct messages</p>
        </div>
      </div>

      <div className="feed-tabs-container">
        <button 
          className={`feed-tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          Feeds & Announcements
        </button>
        <button 
          className={`feed-tab ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          Connections
        </button>
        <button 
          className={`feed-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Direct Messages
        </button>
      </div>

      {activeTab === 'feed' ? (
        <div className="feed-layout">
        {/* Main Feed */}
        <div className="feed-main">
          {/* Create Post */}
          {user && (
            <CreatePostBox 
              organizerId={user.id} 
              eventId={currentEvent?.id || null} 
              onPostCreated={() => fetchPosts()} 
            />
          )}

          {/* Posts List */}
          {loading ? (
            <div className="loading-posts">
              {[1, 2, 3].map(i => (
                <div key={i} className="post-skeleton">
                  <div className="skeleton-header">
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-info">
                      <div className="skeleton-name"></div>
                      <div className="skeleton-time"></div>
                    </div>
                  </div>
                  <div className="skeleton-content"></div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-feed">
              <Users size={48} />
              <h3>No posts yet</h3>
              <p>Be the first to share something with your network!</p>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="post-author">
                      <div className="author-avatar">
                        {post.user?.avatar_url ? (
                          <img src={post.user.avatar_url} alt={post.user.name} />
                        ) : (
                          <span>{post.user?.name?.charAt(0).toUpperCase() || '?'}</span>
                        )}
                      </div>
                      <div className="author-info">
                        <span className="author-name">{post.user?.name || 'Unknown User'}</span>
                        {post.user?.position && post.user?.company && (
                          <span className="author-title">{post.user.position} at {post.user.company}</span>
                        )}
                        <span className="post-time">{formatTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                    <button className="post-menu" title="More options">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  <div className="post-content">
                    <p>{post.content}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="Post" className="post-image" />
                    )}
                    {post.event && (
                      <div className="post-event-tag">
                        <Calendar size={14} />
                        {post.event.title}
                      </div>
                    )}
                  </div>

                  <div className="post-stats">
                    <span>{post.likes_count} likes</span>
                    <span>{post.comments_count} comments</span>
                  </div>

                  <div className="post-actions">
                    <button 
                      className={`post-action ${post.isLiked ? 'liked' : ''}`}
                      onClick={() => handleLikePost(post.id, post.isLiked || false)}
                    >
                      <Heart size={18} fill={post.isLiked ? '#EF4444' : 'none'} />
                      Like
                    </button>
                    <button 
                      className="post-action"
                      onClick={() => toggleComments(post.id)}
                    >
                      <MessageCircle size={18} />
                      Comment
                    </button>
                    <button className="post-action">
                      <Share2 size={18} />
                      Share
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments.has(post.id) && (
                    <div className="comments-section">
                      <div className="comments-list">
                        {postComments[post.id]?.map((comment) => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-avatar">
                              {comment.user?.avatar_url ? (
                                <img src={comment.user.avatar_url} alt={comment.user.name} />
                              ) : (
                                <span>{comment.user?.name?.charAt(0).toUpperCase() || '?'}</span>
                              )}
                            </div>
                            <div className="comment-content">
                              <span className="comment-author">{comment.user?.name || 'Unknown'}</span>
                              <p>{comment.content}</p>
                              <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="add-comment">
                        <div className="comment-avatar">
                          {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} />
                          ) : (
                            <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        />
                        <button 
                          className="send-comment"
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          title="Send comment"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Suggested Friends */}
        <div className="feed-sidebar">
          <div className="suggested-friends-card">
            <div className="card-header">
              <h3>
                <UserPlus size={18} />
                Suggested Friends
              </h3>
            </div>
            <div className="suggested-list">
              {suggestedUsers.length === 0 ? (
                <div className="no-suggestions">
                  <User size={32} />
                  <p>No suggestions available</p>
                </div>
              ) : (
                suggestedUsers.map((suggestedUser) => (
                  <div key={suggestedUser.id} className="suggested-user">
                    <div className="suggested-user-avatar">
                      {suggestedUser.avatar_url ? (
                        <img src={suggestedUser.avatar_url} alt={suggestedUser.name} />
                      ) : (
                        <span>{suggestedUser.name?.charAt(0).toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="suggested-user-info">
                      <span className="user-name">{suggestedUser.name}</span>
                      {suggestedUser.position && (
                        <span className="user-title">{suggestedUser.position}</span>
                      )}
                      {suggestedUser.company && (
                        <span className="user-company">{suggestedUser.company}</span>
                      )}
                      {suggestedUser.interests && suggestedUser.interests.length > 0 && (
                        <div className="user-interests">
                          {suggestedUser.interests.slice(0, 3).map((interest, i) => (
                            <span key={i} className="interest-tag">{interest}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button 
                      className="connect-btn"
                      onClick={() => handleConnect(suggestedUser.id)}
                      title="Connect"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="feed-stats-card">
            <h3>Your Network</h3>
            <div className="network-stats">
              <div className="stat-item">
                <span className="stat-value">{suggestedUsers.length}</span>
                <span className="stat-label">People to Connect</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{posts.length}</span>
                <span className="stat-label">Posts in Feed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : activeTab === 'connections' ? (
        <div style={{ padding: '0 1rem' }}>
          {user && <ConnectionsManager organizerId={user.id} />}
        </div>
      ) : (
        <div style={{ padding: '0 1rem' }}>
          {user && <OrganizerChat organizerId={user.id} />}
        </div>
      )}
    </div>
  );
}


