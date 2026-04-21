import { supabase } from "./supabase";

export const chatService = {
  async fetchRecentContacts(organizerId: string) {
    const { data: messages, error } = await (supabase as any)
      .from("messages")
      .select("id, created_at, content, sender_id, receiver_id, read, sender:users!messages_sender_id_fkey(id, name, avatar_url, company, position), receiver:users!messages_receiver_id_fkey(id, name, avatar_url, company, position)")
      .or(`sender_id.eq.${organizerId},receiver_id.eq.${organizerId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const contactsMap = new Map();
    
    messages?.forEach((msg: any) => {
      const isOrganizerSender = msg.sender_id === organizerId;
      const otherUser = isOrganizerSender ? msg.receiver : msg.sender;
      
      if (!otherUser) return;

      if (!contactsMap.has(otherUser.id)) {
        contactsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.content,
          lastMessageTime: msg.created_at,
          unreadCount: (!isOrganizerSender && !msg.read) ? 1 : 0
        });
      } else if (!isOrganizerSender && !msg.read) {
        const contact = contactsMap.get(otherUser.id);
        contact.unreadCount += 1;
      }
    });

    return Array.from(contactsMap.values());
  },

  async fetchConversation(organizerId: string, attendeeId: string) {
    const { data, error } = await (supabase as any)
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${organizerId},receiver_id.eq.${attendeeId}),and(sender_id.eq.${attendeeId},receiver_id.eq.${organizerId})`)
      .order("created_at", { ascending: true });

    if (error) throw error;
    
    const unreadIds = (data || [])
      .filter((m: any) => m.receiver_id === organizerId && !m.read)
      .map((m: any) => m.id);

    if (unreadIds.length > 0) {
      await this.markAsRead(unreadIds);
    }

    return data;
  },

  async sendMessage(senderId: string, receiverId: string, content: string) {
    const { data, error } = await (supabase as any)
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content.trim(),
        read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsRead(messageIds: string[]) {
    const { error } = await (supabase as any)
      .from("messages")
      .update({ read: true })
      .in("id", messageIds);
      
    if (error) console.error("Failed to mark messages read:", error);
  },

  subscribeToMessages(organizerId: string, onNewMessage: (msg: any) => void) {
    return supabase
      .channel(`organizer_messages_${organizerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${organizerId}`,
        },
        (payload) => {
          onNewMessage(payload.new);
        }
      )
      .subscribe();
  }
};
