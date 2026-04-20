// src/screens/TrendingScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { useApp } from '../context/AppContext';
import { videoAPI } from '../lib/supabase';
import { DEMO_VIDEOS } from '../data/theme';
import { SectionHeader, Skeleton } from '../components/ui';
import VideoCard from '../components/cards/VideoCard';

const { width: SW } = Dimensions.get('window');
const COL_W = (SW - 36) / 2;

export default function TrendingScreen({ navigation }) {
  const { theme, playVideo } = useApp();
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await videoAPI.getTrending(30);
      setVideos(data.length ? data : DEMO_VIDEOS);
    } catch {
      setVideos(DEMO_VIDEOS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderPair = ({ item }) => (
    <View style={styles.row}>
      <VideoCard video={item[0]} cardWidth={COL_W} />
      {item[1] ? <VideoCard video={item[1]} cardWidth={COL_W} /> : <View style={{ width: COL_W }} />}
    </View>
  );

  // Pair up videos
  const pairs = [];
  for (let i = 0; i < videos.length; i += 2) pairs.push([videos[i], videos[i + 1]]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.bg2, borderBottomColor: theme.border, paddingTop: 48 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>🔥 Trending Now</Text>
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>Most-watched videos right now</Text>
      </View>

      {loading ? (
        <View style={{ padding: 12 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.row}>
              <Skeleton width={COL_W} height={COL_W * 9 / 16 + 70} style={{ borderRadius: 14, marginBottom: 12 }} />
              <Skeleton width={COL_W} height={COL_W * 9 / 16 + 70} style={{ borderRadius: 14, marginBottom: 12 }} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={pairs}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderPair}
          contentContainerStyle={{ padding: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
});
