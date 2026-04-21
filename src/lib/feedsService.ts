import { supabase } from "./supabase";

export interface CreatePostPayload {
  userId: string;
  eventId?: string;
  content: string;
  imageFile?: File;
}

export const feedsService = {
  async uploadPostImage(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("posts")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw new Error("Image upload failed: " + error.message);

    const { data: publicUrlData } = supabase.storage
      .from("posts")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  },

  async createPost({ userId, eventId, content, imageFile }: CreatePostPayload) {
    try {
      let imageUrl = null;

      if (imageFile) {
        imageUrl = await this.uploadPostImage(userId, imageFile);
      }

      const { data, error } = await (supabase
        .from("posts") as any)
        .insert({
          user_id: userId,
          event_id: eventId || null,
          content: content,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error creating post:", error);
      return { success: false, error: error.message };
    }
  },

  async fetchEventPosts(eventId?: string) {
    let query = supabase
      .from("posts")
      .select("*, user:users(id, name, avatar_url)")
      .order("created_at", { ascending: false });
      
    if (eventId) {
       query = query.eq("event_id", eventId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },
};
