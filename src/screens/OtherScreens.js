// src/screens/OtherScreens.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Image, ScrollView, TextInput, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useApp } from '../context/AppContext';
import {
  videoAPI, followAPI, profileAPI, likeAPI,
  historyAPI, notifAPI, vipAPI,
} from '../lib/supabase';
import {
  Avatar, VipBadge, VerifiedBadge, Spinner,
  Skeleton, Btn, EmptyState,
} from '../components/ui';
import { fmtNum, catIcon, catColor, timeAgo } from '../data/theme';
import VideoCard from '../components/cards/VideoCard';

const { width: SW } = Dimensions.get('window');

// ══════════════════════════════════════════════════════
// CATEGORIES SCREEN
// ══════════════════════════════════════════════════════
export function CategoriesScreen({ navigation }) {
  const { theme } = useApp();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const COL = 3;
  const CARD_W = (SW - 56) / COL;

  useEffect(() => {
    videoAPI.getCategories()
      .then(cats => setCategories(cats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg2, theme.bg2]} style={[s.header, { borderBottomColor: theme.border, paddingTop: 50 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={{ color: theme.accent, fontSize: 16, marginRight: 12 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>🏷 Browse Categories</Text>
      </LinearGradient>

      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 12 }}>
          {Array(12).fill(0).map((_, i) => (
            <Skeleton key={i} width={CARD_W} height={100} style={{ borderRadius: 16 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={item => item}
          numColumns={COL}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: name }) => {
            const color = catColor(name);
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('Main', { screen: 'Home', params: { catFilter: name } })}
                activeOpacity={0.8}
                style={[s.catCard, { backgroundColor: color + '25', borderColor: color + '60', width: CARD_W }]}
              >
                <Text style={{ fontSize: 30, marginBottom: 6 }}>{catIcon(name)}</Text>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center' }} numberOfLines={1}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════
// CHANNELS SCREEN
// ══════════════════════════════════════════════════════
export function ChannelsScreen({ navigation }) {
  const { theme, session, setAuthModal } = useApp();
  const [users, setUsers]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [hasMore, setHasMore]             = useState(true);
  const [page, setPage]                   = useState(0);
  const [followingSet, setFollowingSet]   = useState(new Set());
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);
  const LIMIT = 20;

  useEffect(() => {
    (async () => {
      try {
        const [creators, followingIds] = await Promise.all([
          profileAPI.getPaginated({ page: 0, limit: LIMIT }),
          session?.user?.id ? followAPI.getFollowingIds(session.user.id) : Promise.resolve([]),
        ]);
        setUsers(creators.filter(u => u.id !== session?.user?.id));
        setFollowingSet(new Set(followingIds));
        setHasMore(creators.length === LIMIT);
        setPage(1);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [session?.user?.id]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || searchResults !== null) return;
    setLoadingMore(true);
    try {
      const next = await profileAPI.getPaginated({ page, limit: LIMIT });
      setUsers(prev => [...prev, ...next.filter(u => u.id !== session?.user?.id)]);
      setHasMore(next.length === LIMIT);
      setPage(p => p + 1);
    } finally { setLoadingMore(false); }
  }, [page, hasMore, loadingMore, searchResults, session?.user?.id]);

  const handleSearch = useCallback(text => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(() => {
      profileAPI.search(text)
        .then(r => setSearchResults(r.filter(u => u.id !== session?.user?.id)))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 380);
  }, [session?.user?.id]);

  const toggleFollow = useCallback(async (user) => {
    if (!session) { setAuthModal('login'); return; }
    const isF = followingSet.has(user.id);
    setFollowingSet(prev => { const s = new Set(prev); isF ? s.delete(user.id) : s.add(user.id); return s; });
    try {
      if (isF) await followAPI.unfollow(session.user.id, user.id);
      else await followAPI.follow(session.user.id, user.id);
    } catch {
      setFollowingSet(prev => { const s = new Set(prev); isF ? s.add(user.id) : s.delete(user.id); return s; });
    }
  }, [session, followingSet, setAuthModal]);

  const displayList = searchResults !== null ? searchResults : users;
  const cardW = (SW - 40) / 2;

  const renderCreator = ({ item: user }) => {
    const username = user.username || 'anon';
    const coverColor = `hsl(${(username.length * 55) % 360}, 55%, 25%)`;
    const isF = followingSet.has(user.id);
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('UserProfile', { userId: user.id, userData: user })}
        activeOpacity={0.85}
        style={[s.channelCard, { backgroundColor: theme.bg2, borderColor: theme.border, width: cardW }]}
      >
        <LinearGradient colors={[coverColor, theme.bg3]} style={{ height: 46 }} />
        <View style={{ padding: 10, alignItems: 'center', marginTop: -28 }}>
          <Avatar profile={user} size={58} />
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13, marginTop: 7, textAlign: 'center' }} numberOfLines={1}>
            {user.display_name || username}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text style={{ color: theme.muted, fontSize: 10 }}>@{username}</Text>
            {user.is_verified && <VerifiedBadge size={11} />}
          </View>
          <View style={[s.miniStats, { borderColor: theme.border }]}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '800' }}>{fmtNum(user.followers_count || 0)}</Text>
              <Text style={{ color: theme.muted, fontSize: 8, textTransform: 'uppercase' }}>Fans</Text>
            </View>
            <View style={{ width: 1, backgroundColor: theme.border }} />
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '800' }}>{fmtNum(user.following_count || 0)}</Text>
              <Text style={{ color: theme.muted, fontSize: 8, textTransform: 'uppercase' }}>Following</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={e => { e.stopPropagation && e.stopPropagation(); toggleFollow(user); }}
            style={[s.followBtn, isF ? { backgroundColor: theme.bg3, borderWidth: 1, borderColor: theme.border } : { backgroundColor: theme.accent }]}
          >
            <Text style={{ color: isF ? theme.text : '#fff', fontSize: 11, fontWeight: '800' }}>
              {isF ? '✓ Following' : '+ Follow'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg2, theme.bg2]} style={[s.header, { borderBottomColor: theme.border, paddingTop: 50 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={{ color: theme.accent, fontSize: 16, marginRight: 10 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: theme.text }]}>🌟 Creator Universe</Text>
          <Text style={{ color: theme.muted, fontSize: 11 }}>Connect with the world's top talent</Text>
        </View>
      </LinearGradient>

      <View style={[s.searchBar, { backgroundColor: theme.bg3, borderColor: theme.border, margin: 12 }]}>
        <Text style={{ fontSize: 14, color: theme.muted, marginRight: 8 }}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder="Search creators..."
          placeholderTextColor={theme.muted}
          style={{ flex: 1, color: theme.text, fontSize: 14, paddingVertical: 8 }}
          autoCapitalize="none"
        />
        {searchLoading && <Spinner size={14} />}
        {search.length > 0 && !searchLoading && (
          <TouchableOpacity onPress={() => { setSearch(''); setSearchResults(null); }}>
            <Text style={{ color: theme.muted, fontSize: 14, marginLeft: 8 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 }}>
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} width={cardW} height={200} style={{ borderRadius: 18 }} />)}
        </View>
      ) : displayList.length === 0 ? (
        <EmptyState emoji="🔍" title="No creators found" />
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={u => u.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 12, gap: 12, marginBottom: 14 }}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderCreator}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <View style={{ padding: 16, alignItems: 'center' }}><Spinner /></View> : null}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════
// VIP SCREEN
// ══════════════════════════════════════════════════════
const VIP_PLANS = [
  { id: 'monthly',  label: 'Monthly',  price: '$0.50', period: '/month', badge: null,           savings: null },
  { id: 'yearly',   label: 'Yearly',   price: '$4.99', period: '/year',  badge: 'Most Popular', savings: 'Save 17%' },
  { id: 'lifetime', label: 'Lifetime', price: '$19.99',period: 'once',   badge: 'Best Value',   savings: 'Forever' },
];
const VIP_FEATURES = [
  { icon: '🎬', title: 'VIP-Exclusive Videos',  desc: 'Watch premium content unavailable to regular users' },
  { icon: '🚫', title: 'Zero Advertisements',   desc: 'Completely uninterrupted viewing, forever' },
  { icon: '📥', title: 'Download Offline',      desc: 'Save any video to watch without internet' },
  { icon: '🔥', title: 'Priority HD & 4K',      desc: 'First in line for the highest quality streams' },
  { icon: '⚡', title: 'Early Access',           desc: 'Watch new content before public release' },
  { icon: '👑', title: 'VIP Profile Badge',     desc: 'Stand out with an exclusive gold VIP badge' },
  { icon: '🎯', title: 'Priority Support',      desc: 'Get help faster with dedicated VIP support' },
  { icon: '📺', title: 'VIP-Only Channels',     desc: 'Access channels exclusively for VIP members' },
];

export function VIPScreen({ navigation }) {
  const { theme, session, profile, showToast, refreshProfile } = useApp();
  const [selected, setSelected] = useState('yearly');
  const [loading, setLoading]   = useState(false);
  const [step, setStep]         = useState(1);
  const plan = VIP_PLANS.find(p => p.id === selected);

  const handleSubscribe = async () => {
    if (!session) { navigation.navigate('Auth', { mode: 'login' }); return; }
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      await vipAPI.upgrade(session.user.id);
      refreshProfile();
      setStep(3);
    } catch (err) {
      showToast(err.message || 'Payment failed', 'error');
    } finally { setLoading(false); }
  };

  if (step === 3) {
    return (
      <LinearGradient colors={[theme.bg, theme.bg2]} style={[s.container, { alignItems: 'center', justifyContent: 'center', padding: 36 }]}>
        <Text style={{ fontSize: 72, marginBottom: 20 }}>🎉</Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#fbbf24', marginBottom: 10, textAlign: 'center' }}>Welcome to VIP!</Text>
        <Text style={{ color: theme.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 36 }}>
          You now have full access to all premium content. Enjoy the full LumineX experience 👑
        </Text>
        <Btn onPress={() => { setStep(1); navigation.goBack(); }} size="lg" style={{ width: '100%' }}>Start Watching →</Btn>
      </LinearGradient>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[theme.bg2, theme.bg]} style={{ paddingHorizontal: 20, paddingTop: 54, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.accent, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 54, marginBottom: 8 }}>👑</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#fbbf24', marginBottom: 4 }}>Unlock VIP</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>Access all premium content and exclusive features</Text>
          {profile?.is_vip && (
            <View style={[s.vipActiveBanner, { backgroundColor: '#fbbf2420', borderColor: '#fbbf2444' }]}>
              <Text style={{ color: '#fbbf24', fontWeight: '700', fontSize: 13 }}>👑 You're already a VIP member!</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={{ padding: 16 }}>
        {/* Progress */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {[1, 2].map(st => (
            <LinearGradient
              key={st}
              colors={step >= st ? ['#fbbf24', '#f97316'] : [theme.border, theme.border]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flex: 1, height: 3, borderRadius: 3 }}
            />
          ))}
        </View>

        {step === 1 && (
          <>
            {VIP_PLANS.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelected(p.id)}
                activeOpacity={0.85}
                style={[s.planCard, { borderColor: selected === p.id ? '#fbbf24' : theme.border, backgroundColor: selected === p.id ? '#fbbf2410' : theme.bg3 }]}
              >
                {p.badge && (
                  <LinearGradient colors={['#fbbf24', '#f97316']} style={s.planBadge}>
                    <Text style={{ color: '#000', fontSize: 9, fontWeight: '800' }}>{p.badge}</Text>
                  </LinearGradient>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{p.label}</Text>
                    {p.savings && <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '600', marginTop: 2 }}>{p.savings}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: selected === p.id ? '#fbbf24' : theme.text, fontSize: 24, fontWeight: '900' }}>{p.price}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>{p.period}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <View style={[s.featuresBox, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>Everything included ✨</Text>
              {VIP_FEATURES.map(f => (
                <View key={f.title} style={s.featureRow}>
                  <Text style={{ fontSize: 22, marginRight: 12, width: 30 }}>{f.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{f.title}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11, marginTop: 1 }}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <View style={[s.paymentBox, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
            <View style={[s.paymentSummary, { backgroundColor: '#fbbf2420', borderColor: '#fbbf2433' }]}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>👑 VIP {plan?.label}</Text>
              <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: '900' }}>{plan?.price}</Text>
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>🔒 Secure payment · Cancel anytime · Instant access</Text>
            {[
              { label: 'Card Number',    placeholder: '1234 5678 9012 3456', icon: '💳', keyboardType: 'number-pad' },
              { label: 'Expiry Date',    placeholder: 'MM / YY',             icon: '📅', keyboardType: 'number-pad' },
              { label: 'CVV',            placeholder: '123',                  icon: '🔒', keyboardType: 'number-pad', secure: true },
              { label: 'Cardholder Name',placeholder: 'Full name on card',   icon: '👤', keyboardType: 'default' },
            ].map(field => (
              <View key={field.label} style={{ marginBottom: 14 }}>
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>{field.label}</Text>
                <View style={[s.cardField, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                  <Text style={{ marginRight: 8 }}>{field.icon}</Text>
                  <TextInput
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.muted}
                    style={{ flex: 1, color: theme.text, fontSize: 14, paddingVertical: 10 }}
                    keyboardType={field.keyboardType}
                    secureTextEntry={field.secure}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {!profile?.is_vip && (
          <>
            <TouchableOpacity onPress={handleSubscribe} disabled={loading} activeOpacity={0.88}>
              <LinearGradient colors={['#fbbf24', '#f97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.subscribeBtn}>
                {loading ? <Spinner color="#fff" /> : (
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                    {step === 1 ? `👑 Get ${plan?.label} VIP — ${plan?.price}` : `Pay ${plan?.price} →`}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            {step === 2 && (
              <TouchableOpacity onPress={() => setStep(1)} style={{ alignItems: 'center', marginTop: 10 }}>
                <Text style={{ color: theme.muted, fontSize: 13 }}>← Change plan</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════
// SAVED SCREEN
// ══════════════════════════════════════════════════════
export function SavedScreen({ navigation }) {
  const { theme, session, setAuthModal } = useApp();
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const COL_W = (SW - 36) / 2;

  const load = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    try { const data = await likeAPI.getSaved(session.user.id); setVideos(data || []); }
    catch { setVideos([]); }
    finally { setLoading(false); }
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg2, theme.bg2]} style={[s.header, { borderBottomColor: theme.border, paddingTop: 50 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: theme.accent, fontSize: 16, marginRight: 10 }}>← Back</Text></TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>❤️ Saved Videos</Text>
      </LinearGradient>
      {!session ? (
        <View style={s.centeredBox}>
          <Text style={{ fontSize: 44, marginBottom: 14 }}>🔖</Text>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 10 }}>Sign in to see saved videos</Text>
          <Btn onPress={() => setAuthModal('login')} size="sm">Sign In</Btn>
        </View>
      ) : loading ? (
        <View style={s.centeredBox}><Spinner size={36} /></View>
      ) : videos.length === 0 ? (
        <EmptyState emoji="💔" title="No saved videos yet" subtitle="Save videos to watch them later" />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={v => v.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 12, gap: 12, marginBottom: 12 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.accent} />}
          renderItem={({ item }) => <VideoCard video={item} cardWidth={COL_W} />}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════
// HISTORY SCREEN
// ══════════════════════════════════════════════════════
export function HistoryScreen({ navigation }) {
  const { theme, session } = useApp();
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const COL_W = (SW - 36) / 2;

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return; }
    historyAPI.getHistory(session.user.id)
      .then(v => setVideos(v || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg2, theme.bg2]} style={[s.header, { borderBottomColor: theme.border, paddingTop: 50 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: theme.accent, fontSize: 16, marginRight: 10 }}>← Back</Text></TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text, flex: 1 }]}>🕐 Watch History</Text>
        {videos.length > 0 && session && (
          <TouchableOpacity onPress={() => { historyAPI.clearAll(session.user.id); setVideos([]); }}>
            <Text style={{ color: theme.red, fontSize: 12, fontWeight: '600' }}>Clear All</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
      {loading ? (
        <View style={s.centeredBox}><Spinner size={36} /></View>
      ) : !session ? (
        <EmptyState emoji="🔒" title="Sign in to see history" />
      ) : videos.length === 0 ? (
        <EmptyState emoji="🕐" title="No watch history yet" subtitle="Videos you watch will appear here" />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={v => String(v.historyId || v.id)}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 12, gap: 12, marginBottom: 12 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: v }) => (
            <View style={{ width: COL_W, position: 'relative' }}>
              <VideoCard video={v} cardWidth={COL_W} />
              <TouchableOpacity
                onPress={() => { setVideos(prev => prev.filter(x => x.historyId !== v.historyId)); historyAPI.deleteItem(v.historyId).catch(() => {}); }}
                style={s.deleteHistoryBtn}
              >
                <Text style={{ color: '#fff', fontSize: 11 }}>✕</Text>
              </TouchableOpacity>
              {v.watched_at && (
                <Text style={{ color: theme.muted, fontSize: 9, paddingHorizontal: 4, marginTop: 2 }}>
                  Watched {timeAgo(v.watched_at)}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════
// UPLOAD SCREEN
// ══════════════════════════════════════════════════════
export function UploadScreen({ navigation }) {
  const { theme, session, setAuthModal } = useApp();

  if (!session) {
    return (
      <View style={[s.container, { backgroundColor: theme.bg }]}>
        <LinearGradient colors={[theme.bg2, theme.bg2]} style={[s.header, { borderBottomColor: theme.border, paddingTop: 50 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: theme.accent, fontSize: 16, marginRight: 10 }}>← Back</Text></TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }]}>📤 Upload</Text>
        </LinearGradient>
        <View style={s.centeredBox}>
          <Text style={{ fontSize: 44, marginBottom: 14 }}>🔒</Text>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 10 }}>Sign in to upload videos</Text>
          <Btn onPress={() => setAuthModal('login')} size="md">Sign In</Btn>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg2, theme.bg2]} style={[s.header, { borderBottomColor: theme.border, paddingTop: 50 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: theme.accent, fontSize: 16, marginRight: 10 }}>← Back</Text></TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>📤 Upload Video</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View style={[s.uploadDropzone, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
          <Text style={{ fontSize: 52, marginBottom: 14 }}>📤</Text>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 17, marginBottom: 6 }}>Select video to upload</Text>
          <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 24, textAlign: 'center' }}>MP4 or MOV up to 500MB</Text>
          <TouchableOpacity style={[s.uploadSelectBtn, { backgroundColor: theme.accent }]} activeOpacity={0.85}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>📁 Choose Video File</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.uploadInfoBox, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 12 }}>📋 Upload Requirements</Text>
          {['✅ MP4 or MOV format', '✅ Maximum file size: 500MB', '✅ Minimum resolution: 720p recommended', '✅ Add a thumbnail for better visibility', '✅ Choose relevant categories'].map(item => (
            <Text key={item} style={{ color: theme.muted, fontSize: 13, marginBottom: 6, lineHeight: 19 }}>{item}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════
// NOTIFICATIONS SCREEN
// ══════════════════════════════════════════════════════
export function NotificationsScreen({ navigation }) {
  const { theme, session, setNotifCount } = useApp();
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    try {
      const data = await notifAPI.getForUser(session.user.id);
      setNotifs(data || []);
      await notifAPI.markRead(session.user.id).catch(() => {});
      setNotifCount(0);
    } catch { setNotifs([]); }
    finally { setLoading(false); }
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  const getMsg = n => {
    const name = n.actor?.display_name || n.actor?.username || 'Someone';
    const msgs = { follow: `${name} started following you`, like: `${name} liked your video`, comment: `${name} commented on your video`, reply: `${name} replied to your comment`, video: `${name} uploaded a new video` };
    return msgs[n.type] || `${name} sent you a notification`;
  };

  const icons = { follow: '👤', like: '❤️', comment: '💬', reply: '💬', video: '🎬' };

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg2, theme.bg2]} style={[s.header, { borderBottomColor: theme.border, paddingTop: 50 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: theme.accent, fontSize: 16, marginRight: 10 }}>← Back</Text></TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>🔔 Notifications</Text>
      </LinearGradient>
      {!session ? (
        <EmptyState emoji="🔒" title="Sign in to see notifications" />
      ) : loading ? (
        <View style={s.centeredBox}><Spinner size={36} /></View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={n => n.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.accent} />}
          ListEmptyComponent={<EmptyState emoji="🔔" title="No notifications yet" subtitle="When someone follows or likes your content, you'll see it here" />}
          renderItem={({ item: n }) => (
            <TouchableOpacity activeOpacity={0.8} style={[s.notifRow, { borderBottomColor: theme.border, backgroundColor: n.is_read ? 'transparent' : theme.accent + '08' }]}>
              <View style={{ marginRight: 12 }}>
                <Avatar profile={n.actor} size={46} />
                <View style={[s.notifIcon, { backgroundColor: theme.bg2, borderColor: theme.bg }]}>
                  <Text style={{ fontSize: 11 }}>{icons[n.type] || '🔔'}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>{getMsg(n)}</Text>
                {n.videos && <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>"{n.videos.title}"</Text>}
                <Text style={{ color: theme.muted, fontSize: 10, marginTop: 3 }}>{timeAgo(n.created_at)}</Text>
              </View>
              {n.videos?.thumbnail_url && (
                <Image source={{ uri: n.videos.thumbnail_url }} style={{ width: 52, aspectRatio: 16 / 9, borderRadius: 6 }} resizeMode="cover" />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════
// SETTINGS SCREEN
// ══════════════════════════════════════════════════════
export function SettingsScreen({ navigation }) {
  const { theme, isDark, toggleTheme, session, signOut, profile } = useApp();

  const groups = [
    { title: 'Preferences', items: [
      { icon: isDark ? '☀️' : '🌙', label: isDark ? 'Light Mode' : 'Dark Mode', onPress: toggleTheme },
      { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    ]},
    { title: 'Content', items: [
      { icon: '💎', label: 'VIP Plans',       onPress: () => navigation.navigate('VIP') },
      { icon: '❤️', label: 'Saved Videos',    onPress: () => navigation.navigate('Saved') },
      { icon: '🕐', label: 'Watch History',   onPress: () => navigation.navigate('History') },
      { icon: '🌟', label: 'Creators',        onPress: () => navigation.navigate('Channels') },
      { icon: '🏷',  label: 'Categories',     onPress: () => navigation.navigate('Categories') },
    ]},
    ...(session ? [{ title: 'Account', items: [
      { icon: '🚪', label: 'Sign Out', onPress: signOut, danger: true },
    ]}] : []),
  ];

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg2, theme.bg2]} style={[s.header, { borderBottomColor: theme.border, paddingTop: 50 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: theme.accent, fontSize: 16, marginRight: 10 }}>← Back</Text></TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>⚙️ Settings</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {profile && (
          <View style={[s.profileCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <Avatar profile={profile} size={52} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{profile.display_name || profile.username}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>@{profile.username}</Text>
              {profile.is_vip && <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}><VipBadge small /><Text style={{ color: '#fbbf24', fontSize: 10, marginLeft: 5 }}>VIP Member</Text></View>}
            </View>
          </View>
        )}
        {groups.map(group => (
          <View key={group.title} style={{ marginBottom: 20 }}>
            <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>{group.title}</Text>
            <View style={[s.settingsGroup, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              {group.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                  style={[s.settingRow, idx < group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                >
                  <Text style={{ fontSize: 20, marginRight: 14, width: 28 }}>{item.icon}</Text>
                  <Text style={{ color: item.danger ? theme.red : theme.text, fontSize: 14, fontWeight: '500', flex: 1 }}>{item.label}</Text>
                  {!item.danger && <Text style={{ color: theme.muted, fontSize: 18 }}>›</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>Lumine<Text style={{ color: theme.text }}>X</Text></Text>
          <Text style={{ color: theme.muted + '88', fontSize: 10, marginTop: 4 }}>v1.0.0 · Streaming Reimagined</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════
// SHARED STYLES
// ══════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  centeredBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  catCard: { borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1 },
  channelCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  miniStats: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: 8, marginBottom: 10, width: '100%' },
  followBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', width: '100%' },
  vipActiveBanner: { marginTop: 14, borderRadius: 12, padding: 12, borderWidth: 1, alignSelf: 'stretch', alignItems: 'center' },
  planCard: { borderRadius: 16, padding: 18, borderWidth: 2, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  planBadge: { position: 'absolute', top: -10, right: 14, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  featuresBox: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  paymentBox: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 20 },
  paymentSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 20 },
  cardField: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14 },
  subscribeBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  uploadDropzone: { borderRadius: 20, padding: 40, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', marginBottom: 20 },
  uploadSelectBtn: { borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  uploadInfoBox: { borderRadius: 16, padding: 18, borderWidth: 1 },
  deleteHistoryBtn: { position: 'absolute', top: 6, left: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderBottomWidth: 1 },
  notifIcon: { position: 'absolute', bottom: -3, right: -3, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24 },
  settingsGroup: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
});
