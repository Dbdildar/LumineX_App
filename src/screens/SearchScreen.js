// src/screens/SearchScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Image, Keyboard, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useApp } from '../context/AppContext';
import { videoAPI, profileAPI } from '../lib/supabase';
import { useDebounce } from '../hooks';
import { Avatar, VipBadge, VerifiedBadge, Spinner, EmptyState } from '../components/ui';
import { fmtNum } from '../data/theme';

const { width: SW } = Dimensions.get('window');

export default function SearchScreen({ navigation }) {
  const { theme, playVideo } = useApp();
  const [q, setQ]           = useState('');
  const [videos, setVideos] = useState([]);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const inputRef = useRef(null);
  const dq = useDebounce(q, 320);

  useEffect(() => {
    if (!dq.trim() || dq.length < 2) { setVideos([]); setUsers([]); return; }
    setLoading(true);
    Promise.all([
      videoAPI.search(dq).catch(() => []),
      profileAPI.search(dq).catch(() => []),
    ]).then(([v, u]) => {
      setVideos(v);
      setUsers(u);
      setLoading(false);
    });
  }, [dq]);

  const hasResults = videos.length > 0 || users.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <LinearGradient colors={[theme.bg2, theme.bg]} style={[styles.header, { paddingTop: 50 }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.bg3, borderColor: theme.accent }]}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
          <TextInput
            ref={inputRef}
            value={q}
            onChangeText={setQ}
            placeholder="Search videos, creators…"
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.text }]}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {loading && <Spinner size={16} />}
          {q.length > 0 && !loading && (
            <TouchableOpacity onPress={() => setQ('')}>
              <Text style={{ color: theme.muted, fontSize: 16, marginLeft: 6 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        {hasResults && (
          <View style={styles.tabRow}>
            {['all', 'videos', 'users'].map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setActiveTab(t)}
                style={[styles.tabBtn, { backgroundColor: activeTab === t ? theme.accent : theme.bg3 }]}
              >
                <Text style={{ color: activeTab === t ? '#fff' : theme.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Empty / hint */}
      {!q && (
        <View style={styles.hint}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
          <Text style={{ color: theme.muted, fontSize: 14 }}>Search for videos, creators and more</Text>
        </View>
      )}

      {q.length >= 2 && !loading && !hasResults && (
        <EmptyState emoji="🔍" title={`No results for "${q}"`} subtitle="Try different keywords" />
      )}

      <FlatList
        data={[1]}
        keyExtractor={() => 'results'}
        renderItem={() => (
          <View style={{ padding: 12 }}>
            {/* Users */}
            {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.resultsLabel, { color: theme.muted }]}>PEOPLE</Text>
                <View style={[styles.resultCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                  {users.slice(0, activeTab === 'all' ? 3 : 10).map((u, i) => (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => navigation.navigate('UserProfile', { userId: u.id, userData: u })}
                      style={[styles.userRow, i < users.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
                    >
                      <Avatar profile={u} size={44} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{u.display_name || u.username}</Text>
                          {u.is_verified && <VerifiedBadge size={12} />}
                        </View>
                        <Text style={{ color: theme.muted, fontSize: 12 }}>@{u.username}</Text>
                      </View>
                      <Text style={{ color: theme.muted, fontSize: 11 }}>{fmtNum(u.followers_count || 0)} followers</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Videos */}
            {(activeTab === 'all' || activeTab === 'videos') && videos.length > 0 && (
              <View>
                <Text style={[styles.resultsLabel, { color: theme.muted }]}>VIDEOS</Text>
                <View style={[styles.resultCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                  {videos.slice(0, activeTab === 'all' ? 6 : 12).map((v, i) => (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => playVideo(v)}
                      style={[styles.videoRow, i < videos.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
                    >
                      <View style={styles.videoThumb}>
                        <Image source={{ uri: v.thumbnail_url || `https://picsum.photos/200/112?random=${i + 50}` }} style={[StyleSheet.absoluteFill, { borderRadius: 8 }]} resizeMode="cover" />
                        {v.is_vip && <View style={{ position: 'absolute', top: 3, left: 3 }}><VipBadge small /></View>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', lineHeight: 18 }} numberOfLines={2}>{v.title}</Text>
                        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{v.profiles?.display_name || v.channel}</Text>
                        <Text style={{ color: theme.muted, fontSize: 10, marginTop: 1 }}>{fmtNum(v.views || 0)} views</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 14, paddingBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: { borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6 },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  resultsLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  resultCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  videoRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 },
  videoThumb: { width: 80, aspectRatio: 16 / 9, borderRadius: 8, overflow: 'hidden', backgroundColor: '#111' },
});
