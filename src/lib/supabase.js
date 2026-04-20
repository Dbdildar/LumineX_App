// src/lib/supabase.js
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your actual URL
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ── In-memory cache ────────────────────────────────────────────────────────
const CACHE = new Map();
const TTL = { short: 30000, medium: 60000, long: 300000 };

export const cache = {
  get: k => {
    const e = CACHE.get(k);
    if (!e) return null;
    if (Date.now() - e.ts > e.ttl) { CACHE.delete(k); return null; }
    return e.data;
  },
  set: (k, data, ttl = TTL.medium) => { CACHE.set(k, { data, ts: Date.now(), ttl }); return data; },
  del: k => CACHE.delete(k),
  bust: pat => { for (const k of CACHE.keys()) if (k.includes(pat)) CACHE.delete(k); },
  clear: () => CACHE.clear(),
};

// ── Auth API ───────────────────────────────────────────────────────────────
export const authAPI = {
  async signUp({ email, password, username, displayName, avatarId }) {
    const taken = await profileAPI.checkUsername(username);
    if (taken) throw new Error('Username is already taken');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().trim(),
          display_name: displayName,
          avatar_id: avatarId,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    cache.clear();
    return supabase.auth.signOut();
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'luminex://reset-password',
    });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  getSession: async () => (await supabase.auth.getSession()).data.session,
};

// ── Profile API ────────────────────────────────────────────────────────────
export const profileAPI = {
  async getById(id) {
    const cached = cache.get(`profile:${id}`);
    if (cached) return cached;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return cache.set(`profile:${id}`, data);
  },

  async getByUsername(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async checkUsername(username) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    return !!data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    cache.bust(`profile:${id}`);
    return data;
  },

  async search(q) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  async getPaginated({ page = 0, limit = 20 } = {}) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count,following_count,bio')
      .order('followers_count', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (error) throw error;
    return data || [];
  },
};

// ── Follow API ─────────────────────────────────────────────────────────────
export const followAPI = {
  async isFollowing(followerId, followingId) {
    if (!followerId) return false;
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    return !!data;
  },

  async follow(followerId, followingId) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
    cache.bust(`follow:${followerId}`);
    cache.bust(`profile:${followerId}`);
    cache.bust(`profile:${followingId}`);
    await notifAPI.create({ userId: followingId, actorId: followerId, type: 'follow' }).catch(() => {});
  },

  async unfollow(followerId, followingId) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw error;
    cache.bust(`follow:${followerId}`);
  },

  async getFollowers(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select('profiles!follows_follower_id_fkey(id,username,display_name,avatar_url,avatar_emoji,is_verified,followers_count)')
      .eq('following_id', userId);
    if (error) throw error;
    return (data || []).map(d => d.profiles).filter(Boolean);
  },

  async getFollowing(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select('profiles!follows_following_id_fkey(id,username,display_name,avatar_url,avatar_emoji,is_verified,followers_count)')
      .eq('follower_id', userId);
    if (error) throw error;
    return (data || []).map(d => d.profiles).filter(Boolean);
  },

  async getFollowingIds(userId) {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    return (data || []).map(d => d.following_id);
  },

  async getRandomCreators(limit = 20) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count,following_count')
      .limit(60);
    if (error) throw error;
    return (data || []).sort(() => 0.5 - Math.random()).slice(0, limit);
  },
};

// ── Video API ──────────────────────────────────────────────────────────────
export const videoAPI = {
  async getFeed({ page = 0, limit = 12, category = null, userId = null } = {}) {
    let q = supabase
      .from('videos')
      .select('*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count)')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (category) q = q.contains('categories', [category]);
    if (userId) q = q.eq('user_id', userId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async getTrending(limit = 12) {
    const { data, error } = await supabase
      .from('videos')
      .select('*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified)')
      .order('views', { ascending: false })
      .order('likes_count', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async getCategories() {
    const cacheKey = 'video:categories';
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const { data, error } = await supabase.rpc('get_unique_categories');
    if (!error && data?.length) {
      return cache.set(cacheKey, data.map(r => r.category).filter(Boolean).sort(), TTL.long);
    }
    const { data: fallback } = await supabase
      .from('videos')
      .select('category')
      .not('category', 'is', null)
      .limit(500);
    const unique = [...new Set((fallback || []).map(r => r.category).filter(Boolean))].sort();
    return cache.set(cacheKey, unique, TTL.long);
  },

  async search(q) {
    const { data, error } = await supabase
      .from('videos')
      .select('*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg)')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  async incrementViews(id) {
    const { data, error } = await supabase.rpc('increment_views', { vid: id });
    if (error) throw error;
    cache.del(`video:${id}`);
    return data;
  },

  async delete(videoId) {
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (error) throw error;
    cache.bust('feed:');
  },
};

// ── Like API ───────────────────────────────────────────────────────────────
export const likeAPI = {
  async isLiked(userId, videoId) {
    if (!userId) return false;
    const { data } = await supabase
      .from('video_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle();
    return !!data;
  },

  async toggle(userId, videoId, isLiked) {
    if (isLiked) {
      await supabase.from('video_likes').delete().eq('user_id', userId).eq('video_id', videoId);
    } else {
      await supabase.from('video_likes').insert({ user_id: userId, video_id: videoId });
    }
    cache.del(`like:${userId}:${videoId}`);
  },

  async isSaved(userId, videoId) {
    if (!userId) return false;
    const { data } = await supabase
      .from('saved_videos')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle();
    return !!data;
  },

  async toggleSave(userId, videoId, isSaved) {
    if (isSaved) {
      await supabase.from('saved_videos').delete().eq('user_id', userId).eq('video_id', videoId);
    } else {
      await supabase.from('saved_videos').insert({ user_id: userId, video_id: videoId });
    }
    cache.del(`save:${userId}:${videoId}`);
  },

  async getSaved(userId) {
    const { data, error } = await supabase
      .from('saved_videos')
      .select('videos(*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(d => d.videos).filter(Boolean);
  },
};

// ── Comment API ────────────────────────────────────────────────────────────
export const commentAPI = {
  async getForVideo(videoId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles:user_id(id,username,display_name,avatar_url,avatar_emoji,avatar_bg)')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async add({ videoId, userId, body, parentId = null, reply_to_user = null }) {
    const { data, error } = await supabase
      .from('comments')
      .insert({ video_id: videoId, user_id: userId, body, parent_id: parentId, reply_to_user })
      .select('*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg)')
      .single();
    if (error) throw error;
    return data;
  },

  async deletecmnd(commentId, userId) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async toggleLike(userId, commentId, isLiked) {
    if (isLiked) {
      await supabase.from('comment_likes').delete().eq('user_id', userId).eq('comment_id', commentId);
    } else {
      await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId });
    }
  },

  async getLikedIds(userId, commentIds) {
    if (!userId || !commentIds.length) return [];
    const { data } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', commentIds);
    return (data || []).map(d => d.comment_id);
  },
};

// ── Notification API ───────────────────────────────────────────────────────
export const notifAPI = {
  async getForUser(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url,avatar_emoji), videos(id,title,thumbnail_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) throw error;
    return data || [];
  },

  async create({ userId, actorId, type, videoId = null, commentId = null }) {
    if (userId === actorId) return;
    await supabase.from('notifications').insert({
      user_id: userId,
      actor_id: actorId,
      type,
      video_id: videoId || null,
      comment_id: commentId || null,
    });
  },

  async markRead(userId) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  async getUnreadCount(userId) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return count || 0;
  },
};

// ── VIP API ────────────────────────────────────────────────────────────────
export const vipAPI = {
  async upgrade(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_vip: true })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    cache.bust(`profile:${userId}`);
    return data;
  },
};

// ── History API ────────────────────────────────────────────────────────────
export const historyAPI = {
  async addToHistory(userId, videoId) {
    if (!userId || !videoId) return;
    const { error } = await supabase.from('watch_history').upsert(
      { user_id: userId, video_id: videoId, watched_at: new Date().toISOString() },
      { onConflict: 'user_id,video_id' },
    );
    if (error) console.error('History error:', error.message);
  },

  async getHistory(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('watch_history')
      .select('id, watched_at, video:video_id(id,title,thumbnail_url,video_url,views,category,categories,duration,profiles(id,username,display_name,avatar_url))')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false });
    if (error) return [];
    return data.map(item => ({ ...item.video, watched_at: item.watched_at, historyId: item.id }));
  },

  async deleteItem(historyId) {
    return supabase.from('watch_history').delete().eq('id', historyId);
  },

  async clearAll(userId) {
    return supabase.from('watch_history').delete().eq('user_id', userId);
  },
};
