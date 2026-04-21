import { supabase } from './supabase';

export const socialService = {
  /**
   * Fetch all connections for the organizer (Pending & Accepted)
   */
  async fetchConnections(organizerId: string) {
    const { data, error } = await (supabase as any)
      .from('friendships')
      .select(`
        id, status, requester_id, addressee_id, created_at,
        requester:users!friendships_requester_id_fkey(id, name, avatar_url, company, position),
        addressee:users!friendships_addressee_id_fkey(id, name, avatar_url, company, position)
      `)
      .or(`requester_id.eq.${organizerId},addressee_id.eq.${organizerId}`);

    if (error) throw error;
    
    // Format the response so we just deal with "friend" and "status"
    return (data || []).map((f: any) => {
      const isRequester = f.requester_id === organizerId;
      return {
        id: f.id,
        status: f.status,
        createdAt: f.created_at,
        isIncoming: !isRequester && f.status === 'pending', // Someone requesting to connect with the organizer
        friend: isRequester ? f.addressee : f.requester
      };
    });
  },

  /**
   * Send a new friend/connection request to an attendee
   */
  async sendConnectionRequest(organizerId: string, attendeeId: string) {
    // 1. Check if a relationship already exists
    const { data, error: checkError } = await (supabase as any)
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${organizerId},addressee_id.eq.${attendeeId}),and(requester_id.eq.${attendeeId},addressee_id.eq.${organizerId})`)
      .maybeSingle();
      
    if (checkError) throw checkError;
    const existing = data as any;
    
    // If rejected/cancelled before, we could update it, or just return existing if pending/accepted
    if (existing) {
      if (existing.status === 'accepted' || existing.status === 'pending') {
        return { success: false, message: `Request already ${existing.status}` };
      }
      
      // Update from rejected back to pending
      const { data: updateData, error } = await (supabase as any)
        .from('friendships')
        .update({ status: 'pending', requester_id: organizerId, addressee_id: attendeeId, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, data: updateData };
    }

    // 2. Insert new request
    const { data: insertData, error } = await (supabase as any)
      .from('friendships')
      .insert({
        requester_id: organizerId,
        addressee_id: attendeeId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: insertData };
  },

  /**
   * Accept an incoming connection request
   */
  async acceptRequest(friendshipId: string) {
    const { data, error } = await (supabase as any)
      .from('friendships')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Reject an incoming connection request or Remove an existing connection
   */
  async removeConnection(friendshipId: string) {
    const { error } = await (supabase as any)
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    return true;
  }
};
