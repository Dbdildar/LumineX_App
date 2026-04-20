// src/components/cards/VideoCard.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Animated, PanResponder,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Video from 'react-native-video';
import { useApp } from '../../context/AppContext';
import { Avatar, VipBadge, VerifiedBadge } from '../ui';
import { fmtNum, timeAgo } from '../../data/theme';

const { width: SW } = Dimensions.get('window');

export default function VideoCard({ video, cardWidth, compact, isOwner, onLongPress }) {
  const { playVideo, theme } = useApp();
  const [previewActive, setPreviewActive] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const lpTimer = useRef(null);
  const lpAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pf = video.profiles || { username: video.channel || 'Unknown' };
  const W  = cardWidth || SW / 2 - 18;

  // ── Long press handlers ───────────────────────────────────────────────────
  const startLongPress = useCallback(() => {
    lpAnim.setValue(0);
    Animated.timing(lpAnim, { toValue: 1, duration: 600, useNativeDriver: false }).start();
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    lpTimer.current = setTimeout(() => {
      setPreviewActive(true);
      Animated.spring(scaleAnim, { toValue: 1.02, useNativeDriver: true }).start();
    }, 600);
  }, [lpAnim, scaleAnim]);

  const endLongPress = useCallback(() => {
    clearTimeout(lpTimer.current);
    lpAnim.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    setTimeout(() => setPreviewActive(false), 300);
  }, [lpAnim, scaleAnim]);

  const handlePress = useCallback(() => {
    if (previewActive) {
      setPreviewActive(false);
    }
    playVideo(video);
  }, [previewActive, playVideo, video]);

  const lpCircumference = 2 * Math.PI * 26;
  const lpProgress = lpAnim.interpolate({ inputRange: [0, 1], outputRange: [lpCircumference, 0] });

  return (
    <Animated.View style={[styles.card, { width: W, transform: [{ scale: scaleAnim }], backgroundColor: theme.card, borderColor: previewActive ? theme.accent + '66' : theme.border }]}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={() => { onLongPress ? onLongPress(video) : startLongPress(); }}
        onPressIn={startLongPress}
        onPressOut={endLongPress}
        delayLongPress={600}
        activeOpacity={0.95}
      >
        {/* Thumbnail / Video Preview */}
        <View style={[styles.thumb, { aspectRatio: 16 / 9 }]}>
          {previewActive && video.video_url && !videoError ? (
            <Video
              source={{ uri: video.video_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              muted
              repeat
              paused={false}
              onError={() => setVideoError(true)}
            />
          ) : (
            <Image
              source={{ uri: video.thumbnail_url || `https://picsum.photos/640/360?random=${(video.id || '1').charCodeAt?.(0) || 1}` }}
              style={[StyleSheet.absoluteFill, styles.thumbImg]}
              resizeMode="cover"
            />
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* VIP badge */}
          {video.is_vip && (
            <View style={styles.vipPos}>
              <VipBadge small />
            </View>
          )}

          {/* Duration */}
          {video.duration ? (
            <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
              <Text style={styles.durationText}>{video.duration}</Text>
            </View>
          ) : null}

          {/* Long-press progress ring */}
          {lpTimer.current !== null && (
            <View style={styles.lpRingContainer} pointerEvents="none">
              <Animated.View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                <View style={[styles.lpRingBg, { borderColor: 'rgba(255,255,255,0.2)' }]} />
                <Animated.View
                  style={[
                    styles.lpRingFg,
                    { borderColor: theme.accent },
                  ]}
                />
                <Text style={{ position: 'absolute', fontSize: 20 }}>▶</Text>
              </Animated.View>
            </View>
          )}

          {/* Preview label */}
          {previewActive && (
            <View style={[styles.previewLabel, { backgroundColor: theme.accent }]}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>PREVIEW</Text>
            </View>
          )}
        </View>

        {/* Info row */}
        {!compact && (
          <View style={styles.infoRow}>
            <Avatar profile={pf} size={28} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{video.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={[styles.channel, { color: theme.accent }]}>{pf.display_name || pf.username}</Text>
                {pf.is_verified ? <VerifiedBadge size={10} /> : null}
              </View>
              <Text style={[styles.meta, { color: theme.muted }]}>
                {fmtNum(video.views_count || video.views || 0)} views · {timeAgo(video.created_at)}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 4,
  },
  thumb: {
    width: '100%',
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  vipPos: { position: 'absolute', top: 6, left: 6 },
  durationBadge: {
    position: 'absolute', bottom: 6, right: 6,
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  durationText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  lpRingContainer: {
    position: 'absolute', inset: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  lpRingBg: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 3 },
  lpRingFg: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 3 },
  previewLabel: {
    position: 'absolute', top: 6, right: 6,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, paddingTop: 8 },
  title: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  channel: { fontSize: 10, fontWeight: '600' },
  meta: { fontSize: 9, marginTop: 2 },
});
