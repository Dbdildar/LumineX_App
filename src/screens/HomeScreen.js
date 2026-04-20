// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Dimensions, Image, RefreshControl, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useApp } from '../context/AppContext';
import { videoAPI, followAPI } from '../lib/supabase';
import { DEMO_VIDEOS, catIcon, catColor, fmtNum, timeAgo } from '../data/theme';
import { Avatar, VipBadge, VerifiedBadge, Skeleton, SectionHeader, FilterChip, EmptyState } from '../components/ui';
import VideoCard from '../components/cards/VideoCard';

const { width: SW } = Dimensions.get('window');
const COL_W = (SW - 36) / 2;

// ── Hero Banner ─────────────────────────────────────────────────────────────
function HeroBanner({ items, theme, onPlay }) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!items?.length) return;
    const t = setInterval(() => {
      const next = (idx + 1) % items.length;
      setIdx(next);
      scrollRef.current?.scrollTo({ x: next * SW, animated: true });
    }, 5000);
    return () => clearInterval(t);
  }, [idx, items?.length]);

  if (!items?.length) {
    return <Skeleton width={SW} height={SW * 9 / 16} style={{ borderRadius: 0 }} />;
  }

  return (
    <View style={{ height: SW * 9 / 16 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / SW))}
      >
        {items.map((item, i) => (
          <View key={item.id} style={{ width: SW, height: SW * 9 / 16 }}>
            <Image
              source={{ uri: item.thumbnail_url }}
              style={[StyleSheet.absoluteFill, { width: SW }]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(3,3,8,0.9)', 'rgba(3,3,8,0.4)', 'transparent']}
              start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 }}>🔥 FEATURED</Text>
              <Text style={[styles.heroTitle, { color: '#fff' }]} numberOfLines={2}>{item.title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 12 }}>
                {item.profiles?.display_name || item.channel} · {fmtNum(item.views)} views
              </Text>
              <TouchableOpacity onPress={() => onPlay(item)} style={[styles.heroBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>▶ Watch Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      {/* Dots */}
      <View style={styles.heroDots}>
        {items.map((_, i) => (
          <View key={i} style={[styles.heroDot, { backgroundColor: i === idx ? theme.accent : 'rgba(255,255,255,0.3)', width: i === idx ? 20 : 6 }]} />
        ))}
      </View>
    </View>
  );
}

// ── Category Card ────────────────────────────────────────────────────────────
function CategoryCard({ name, onPress, theme }) {
  const color = catColor(name);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.catCard, { backgroundColor: color + '25', borderColor: color + '60' }]}>
      <Text style={{ fontSize: 26, marginBottom: 6 }}>{catIcon(name)}</Text>
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{name}</Text>
    </TouchableOpacity>
  );
}

// ── Creator Card ─────────────────────────────────────────────────────────────
function CreatorCard({ user, theme }) {
  const { setTab, setActiveProfile } = useApp();
  const username = user.username || 'anon';
  const displayName = user.display_name || username;
  const coverColor = `hsl(${(username.length * 55) % 360}, 60%, 25%)`;

  return (
    <TouchableOpacity
      onPress={() => { setActiveProfile(user); }}
      activeOpacity={0.85}
      style={[styles.creatorCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}
    >
      <LinearGradient colors={[coverColor, theme.bg3]} style={styles.creatorCover} />
      <View style={styles.creatorBody}>
        <Avatar profile={user} size={52} />
        <Text style={[styles.creatorName, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
        <Text style={{ color: theme.muted, fontSize: 10 }}>@{username}</Text>
        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
          {fmtNum(user.followers_count || 0)} fans
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Video Grid ────────────────────────────────────────────────────────────────
function VideoGrid({ videos, loading, onPlay, theme }) {
  const pairs = [];
  for (let i = 0; i < videos.length; i += 2) {
    pairs.push([videos[i], videos[i + 1]]);
  }
  if (loading && !videos.length) {
    return (
      <View>
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.gridRow}>
            <Skeleton width={COL_W} height={COL_W * 9 / 16 + 70} style={{ borderRadius: 14, marginBottom: 12 }} />
            <Skeleton width={COL_W} height={COL_W * 9 / 16 + 70} style={{ borderRadius: 14, marginBottom: 12 }} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View>
      {pairs.map((pair, i) => (
        <View key={i} style={styles.gridRow}>
          {pair[0] ? <VideoCard video={pair[0]} cardWidth={COL_W} /> : null}
          {pair[1] ? <VideoCard video={pair[1]} cardWidth={COL_W} /> : null}
        </View>
      ))}
    </View>
  );
}

// ── Main HomeScreen ──────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🔥 Hot', value: 'hot' },
  { label: '✨ New', value: 'new' },
  { label: '👑 VIP', value: 'vip' },
  { label: 'Free', value: 'free' },
];

export default function HomeScreen({ navigation }) {
  const { theme, playVideo } = useApp();
  const [videos, setVideos]       = useState([]);
  const [trending, setTrending]   = useState([]);
  const [creators, setCreators]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter]       = useState('all');
  const [catFilter, setCatFilter] = useState(null);
  const [page, setPage]           = useState(0);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const LIMIT = 20;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [vids, trend, cats, creat] = await Promise.all([
        videoAPI.getFeed({ page: 0, limit: LIMIT }).catch(() => DEMO_VIDEOS),
        videoAPI.getTrending(8).catch(() => []),
        videoAPI.getCategories().catch(() => []),
        followAPI.getRandomCreators(10).catch(() => []),
      ]);
      setVideos(vids);
      setTrending(trend.length ? trend : DEMO_VIDEOS.slice(0, 4));
      setCategories(cats.slice(0, 12));
      setCreators(creat);
      setPage(1);
      setHasMore(vids.length === LIMIT);
    } catch (err) {
      setVideos(DEMO_VIDEOS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await videoAPI.getFeed({ page, limit: LIMIT, category: catFilter });
      setVideos(prev => [...prev, ...data]);
      setPage(p => p + 1);
      setHasMore(data.length === LIMIT);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, catFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  }, [loadInitial]);

  const displayed = videos.filter(v => {
    if (filter === 'vip') return v.is_vip;
    if (filter === 'free') return !v.is_vip;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <LinearGradient colors={[theme.bg2, theme.bg2 + 'f8']} style={[styles.header, { paddingTop: 44, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={{ color: theme.accent, fontSize: 22, fontWeight: '900', letterSpacing: 1 }}>Lumine<Text style={{ color: theme.text }}>X</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Search')} style={[styles.headerBtn, { borderColor: theme.border, backgroundColor: theme.bg3 }]}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={[styles.headerBtn, { borderColor: theme.border, backgroundColor: theme.bg3 }]}>
              <Text style={{ fontSize: 16 }}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Nav tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {[
            { label: '🏠 Home', route: null },
            { label: '🏷 Categories', route: 'Categories' },
            { label: '🌟 Creators', route: 'Channels' },
            { label: '❤️ Saved', route: 'Saved' },
            { label: '🕐 History', route: 'History' },
            { label: '👑 VIP', route: 'VIP' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              onPress={() => item.route ? navigation.navigate(item.route) : null}
              style={[styles.navTab, !item.route && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            >
              <Text style={{ color: !item.route ? theme.accent : theme.muted, fontSize: 12, fontWeight: !item.route ? '700' : '500' }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        onScroll={({ nativeEvent }) => {
          const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 200) {
            loadMore();
          }
        }}
        scrollEventThrottle={300}
      >
        {/* Hero banner */}
        {!catFilter && <HeroBanner items={trending} theme={theme} onPlay={playVideo} />}

        <View style={{ padding: 12 }}>
          {/* Active category badge */}
          {catFilter && (
            <View style={[styles.catBadge, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
              <Text style={{ fontSize: 18 }}>{catIcon(catFilter)}</Text>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, marginLeft: 8, textTransform: 'capitalize' }}>{catFilter}</Text>
              <TouchableOpacity onPress={() => setCatFilter(null)} style={[styles.catClear, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Suggested Creators */}
          {!catFilter && creators.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <SectionHeader title="🌟 Suggested Creators" action={() => navigation.navigate('Channels')} actionLabel="See all" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: -4 }}>
                {creators.map(u => <CreatorCard key={u.id} user={u} theme={theme} />)}
              </ScrollView>
            </View>
          )}

          {/* Trending horizontal scroll */}
          {!catFilter && trending.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <SectionHeader title="🔥 Trending Now" action={() => navigation.navigate('Trending')} actionLabel="See all" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: -4 }}>
                {trending.map(v => <VideoCard key={v.id} video={v} cardWidth={190} compact />)}
              </ScrollView>
            </View>
          )}

          {/* Categories */}
          {!catFilter && categories.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <SectionHeader title="🏷 Browse Categories" action={() => navigation.navigate('Categories')} actionLabel="See all" />
              <View style={styles.catGrid}>
                {categories.slice(0, 8).map(name => (
                  <CategoryCard key={name} name={name} theme={theme} onPress={() => setCatFilter(name)} />
                ))}
              </View>
            </View>
          )}

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {FILTERS.map(f => (
              <FilterChip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />
            ))}
          </ScrollView>

          {/* Section header */}
          <SectionHeader title={catFilter ? `${catIcon(catFilter)} ${catFilter}` : '🎬 All Videos'} />

          {/* Video grid */}
          {displayed.length === 0 && !loading ? (
            <EmptyState emoji="🎬" title="No videos found" subtitle="Try a different filter or category" />
          ) : (
            <VideoGrid videos={displayed} loading={loading} onPlay={playVideo} theme={theme} />
          )}

          {/* Load more indicator */}
          {loadingMore && (
            <View style={{ alignItems: 'center', padding: 20 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent, margin: 3 }} />
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
  header: { borderBottomWidth: 1, paddingHorizontal: 14, paddingBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  navTab: { paddingHorizontal: 10, paddingVertical: 8, marginRight: 2 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  heroTitle: { fontSize: 22, fontWeight: '900', lineHeight: 28, marginBottom: 6 },
  heroBtn: { borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10, alignSelf: 'flex-start' },
  heroDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  heroDot: { height: 6, borderRadius: 3 },
  catCard: { width: (SW - 60) / 4, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, marginRight: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  creatorCard: { width: 120, borderRadius: 18, marginRight: 12, overflow: 'hidden', borderWidth: 1 },
  creatorCover: { height: 40 },
  creatorBody: { padding: 10, alignItems: 'center', marginTop: -26 },
  creatorName: { fontSize: 11, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  catBadge: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  catClear: { marginLeft: 'auto', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
});
