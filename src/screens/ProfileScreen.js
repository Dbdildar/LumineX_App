// src/screens/ProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Dimensions, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useApp } from '../context/AppContext';
import { profileAPI, videoAPI, likeAPI, followAPI } from '../lib/supabase';
import { Avatar, VipBadge, VerifiedBadge, Skeleton, Btn, EmptyState, Spinner } from '../components/ui';
import { fmtNum } from '../data/theme';
import VideoCard from '../components/cards/VideoCard';

const { width: SW } = Dimensions.get('window');
const COL_W = (SW - 36) / 2;

export default function ProfileScreen({ navigation, route }) {
  const { session, profile: myProfile, playVideo, signOut, theme, toggleTheme, isDark, setAuthModal } = useApp();
  const passedUserId = route.params?.userId;
  const passedData   = route.params?.userData;

  // Determine which user to show
  const userId = passedUserId || session?.user?.id;
  const isOwn  = !passedUserId || passedUserId === session?.user?.id;

  const [profile, setProfile]   = useState(passedData || (isOwn ? myProfile : null));
  const [videos, setVideos]     = useState([]);
  const [savedVids, setSavedVids] = useState([]);
  const [activeTab, setActiveTab] = useState('videos');
  const [loading, setLoading]   = useState(!profile);
  const [vLoading, setVLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load profile
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    if (profile) { setLoading(false); return; }
    profileAPI.getById(userId).then(p => { setProfile(p); setLoading(false); }).catch(() => setLoading(false));
  }, [userId]);

  // Check follow status
  useEffect(() => {
    if (!isOwn && session?.user?.id && userId) {
      followAPI.isFollowing(session.user.id, userId).then(setFollowing).catch(() => {});
    }
  }, [isOwn, session, userId]);

  // Load videos
  useEffect(() => {
    if (!profile?.id) return;
    setVLoading(true);
    const fetch = activeTab === 'saved' && isOwn
      ? likeAPI.getSaved(profile.id)
      : videoAPI.getFeed({ userId: profile.id, limit: 24 });
    fetch
      .then(data => { if (activeTab === 'saved') setSavedVids(data || []); else setVideos(data || []); })
      .catch(() => {})
      .finally(() => setVLoading(false));
  }, [activeTab, profile?.id, isOwn]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      const [p, v] = await Promise.all([
        profileAPI.getById(userId).catch(() => null),
        videoAPI.getFeed({ userId, limit: 24 }).catch(() => []),
      ]);
      if (p) setProfile(p);
      setVideos(v);
    }
    setRefreshing(false);
  }, [userId]);

  const handleFollow = async () => {
    if (!session) { setAuthModal('login'); return; }
    const next = !following;
    setFollowing(next);
    try {
      if (next) await followAPI.follow(session.user.id, userId);
      else await followAPI.unfollow(session.user.id, userId);
    } catch { setFollowing(!next); }
  };

  if (!session && isOwn) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { backgroundColor: theme.bg2, borderBottomColor: theme.border, paddingTop: 50 }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        </View>
        <View style={styles.guestWrap}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>👤</Text>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 6 }}>Sign in to LumineX</Text>
          <Text style={{ color: theme.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Create an account to follow creators, save videos, and more.
          </Text>
          <Btn onPress={() => setAuthModal('signup')} style={{ marginBottom: 10, alignSelf: 'stretch' }}>Create Account 🚀</Btn>
          <Btn onPress={() => setAuthModal('login')} variant="secondary" style={{ alignSelf: 'stretch' }}>Sign In</Btn>
        </View>
      </View>
    );
  }

  if (loading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { backgroundColor: theme.bg2, borderBottomColor: theme.border, paddingTop: 50 }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        </View>
        <View style={{ alignItems: 'center', padding: 60 }}><Spinner size={36} /></View>
      </View>
    );
  }

  const displayedVideos = activeTab === 'saved' ? savedVids : videos;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* Profile header card */}
        <LinearGradient colors={[theme.bg2, theme.bg3]} style={[styles.profileHeader, { borderBottomColor: theme.border }]}>
          {/* Decorative blob */}
          <View style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: theme.accent + '12' }} />

          {/* Back / close button */}
          {!isOwn && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: theme.border }]}>
              <Text style={{ color: '#fff', fontSize: 16 }}>←</Text>
            </TouchableOpacity>
          )}

          {/* Settings for own profile */}
          {isOwn && (
            <View style={styles.settingsRow}>
              <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
                <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={[styles.iconBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
                <Text style={{ fontSize: 16 }}>🔔</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <LinearGradient colors={[theme.accent, theme.accent2, theme.accent3]} style={styles.avatarRing}>
              <Avatar profile={profile} size={isOwn ? 90 : 80} />
            </LinearGradient>
            <View style={styles.nameSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={[styles.displayName, { color: theme.text }]}>{profile.display_name || profile.username}</Text>
                {profile.is_verified && <VerifiedBadge size={16} />}
                {profile.is_vip && <VipBadge />}
              </View>
              <Text style={{ color: theme.muted, fontSize: 13 }}>@{profile.username}</Text>
              {profile.bio ? (
                <Text style={{ color: theme.textSub || theme.muted, fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: SW - 160 }} numberOfLines={2}>
                  {profile.bio}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Stats row */}
          <View style={[styles.statsRow, { borderColor: theme.border }]}>
            {[
              { label: 'Followers', value: fmtNum(profile.followers_count || 0) },
              { label: 'Following', value: fmtNum(profile.following_count || 0) },
              { label: 'Videos', value: fmtNum(profile.videos_count || videos.length || 0) },
              ...(isOwn ? [{ label: 'Revenue', value: `$${(profile.earnings_balance || 0).toFixed(2)}`, color: theme.green }] : []),
            ].map((stat, i) => (
              <View key={stat.label} style={[styles.statItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
                <Text style={[styles.statNum, { color: stat.color || theme.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {isOwn ? (
              <>
                <Btn variant="secondary" size="sm" onPress={() => {}} style={{ flex: 1, marginRight: 8 }}>✏️ Edit Profile</Btn>
                <Btn variant="ghost" size="sm" onPress={signOut} style={{ flex: 1 }}>🚪 Sign Out</Btn>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleFollow}
                style={[
                  styles.followBtn,
                  following
                    ? { backgroundColor: theme.bg3, borderWidth: 1, borderColor: theme.border }
                    : { backgroundColor: theme.accent },
                ]}
              >
                <Text style={{ color: following ? theme.text : '#fff', fontWeight: '700', fontSize: 14 }}>
                  {following ? '✓ Following' : '+ Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={[styles.tabsRow, { borderBottomColor: theme.border }]}>
          {[
            { id: 'videos', label: '🎬 Videos' },
            ...(isOwn ? [{ id: 'saved', label: '🔖 Saved' }] : []),
          ].map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id)}
              style={[styles.tab, activeTab === t.id && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            >
              <Text style={{ color: activeTab === t.id ? theme.accent : theme.muted, fontWeight: '700', fontSize: 13 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Videos grid */}
        <View style={{ padding: 12 }}>
          {vLoading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} width={COL_W} height={COL_W * 9 / 16 + 60} style={{ borderRadius: 14 }} />)}
            </View>
          ) : displayedVideos.length === 0 ? (
            <EmptyState
              emoji={activeTab === 'saved' ? '🔖' : '🎬'}
              title={activeTab === 'saved' ? 'No saved videos' : 'No uploads yet'}
              subtitle={isOwn ? 'Items you interact with will appear here.' : 'This gallery is currently empty.'}
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {displayedVideos.map(v => (
                <VideoCard key={v.id} video={v} cardWidth={COL_W} style={{ marginBottom: 12 }} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  guestWrap: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  profileHeader: { padding: 20, paddingTop: 54, borderBottomWidth: 1, position: 'relative', overflow: 'hidden' },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  settingsRow: { position: 'absolute', top: 50, right: 16, flexDirection: 'row', gap: 8, zIndex: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  avatarRing: { padding: 3, borderRadius: 99 },
  nameSection: { flex: 1 },
  displayName: { fontSize: 22, fontWeight: '900', lineHeight: 28 },
  statsRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statNum: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  statLabel: { fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
  actionRow: { flexDirection: 'row' },
  followBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 13 },
});
