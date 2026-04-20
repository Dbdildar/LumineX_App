// src/components/player/VideoPlayer.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, StatusBar, Platform, PanResponder, ScrollView,
  Image, ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Avatar, VipBadge, VerifiedBadge } from '../ui';
import { fmtNum, fmtTime, timeAgo } from '../../data/theme';
import { useVideoLike } from '../../hooks';
import { likeAPI } from '../../lib/supabase';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Ad data ────────────────────────────────────────────────────────────────
const DUMMY_ADS = [
  { id: 1, brand: 'NovaDrive', tagline: 'The Future, Delivered.', cta: 'Learn More', description: 'Experience the all-new NovaDrive EV. Zero emissions, infinite possibilities.', bg: ['#0f0c29','#302b63'], accent: '#7c6bfa', logo: '🚗' },
  { id: 2, brand: 'PureBlend Coffee', tagline: 'Taste the Altitude.', cta: 'Shop Now', description: 'Single-origin beans from 2,000m above sea level.', bg: ['#3b1f0a','#7b4f2e'], accent: '#e8a96b', logo: '☕' },
  { id: 3, brand: 'ArcFit Pro', tagline: 'Train Smarter. Live Longer.', cta: 'Get Free Trial', description: 'AI-powered workout plans that adapt to YOU.', bg: ['#001a12','#00412c'], accent: '#00e676', logo: '🏋️' },
];

const AD_STRATEGY = { 1:{pre:5}, 3:{pre:10}, 5:{pre:15}, 7:{pre:6} };
const getAdDuration = count => AD_STRATEGY[count]?.pre || 0;
const UNSKIPPABLE = new Set([5, 6]);

// ── Seek flash ──────────────────────────────────────────────────────────────
function SeekFlash({ dir }) {
  if (!dir) return null;
  return (
    <View style={[styles.seekFlash, dir === 'bwd' ? { left: 0 } : { right: 0 }]} pointerEvents="none">
      <View style={styles.seekFlashInner}>
        <Text style={{ fontSize: 22 }}>{dir === 'bwd' ? '⏪' : '⏩'}</Text>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 2 }}>{dir === 'bwd' ? '-10s' : '+10s'}</Text>
      </View>
    </View>
  );
}

// ── Controls Bar ────────────────────────────────────────────────────────────
function ControlsBar({
  playing, muted, progress, duration, buffering, speed,
  onPlayPause, onSeek, onSeekBy, onMute, onSpeedChange, onFullscreen,
  isFullscreen, theme,
}) {
  const [showSpeed, setShowSpeed] = useState(false);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <View style={[styles.controlsBar, { paddingBottom: isFullscreen ? 20 : 8 }]}>
      {/* Seekbar */}
      <View style={styles.seekRow}>
        <Text style={styles.timeText}>{fmtTime(progress * duration)}</Text>
        <Slider
          style={styles.slider}
          value={progress}
          minimumValue={0}
          maximumValue={1}
          onSlidingComplete={val => onSeek(val)}
          minimumTrackTintColor={theme.accent}
          maximumTrackTintColor="rgba(255,255,255,0.25)"
          thumbTintColor={theme.accent}
        />
        <Text style={styles.timeText}>{fmtTime(duration)}</Text>
      </View>

      {/* Buttons row */}
      <View style={styles.ctrlRow}>
        <TouchableOpacity onPress={() => onSeekBy(-10)} style={styles.ctrlBtn}>
          <Text style={styles.ctrlIcon}>⟲</Text>
          <Text style={styles.ctrlSub}>10</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPlayPause} style={[styles.ctrlBtnLg, { backgroundColor: theme.accent + '33', borderColor: theme.accent + '55' }]}>
          <Text style={{ fontSize: 22, color: '#fff' }}>{playing ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onSeekBy(10)} style={styles.ctrlBtn}>
          <Text style={styles.ctrlIcon}>⟳</Text>
          <Text style={styles.ctrlSub}>10</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onMute} style={styles.ctrlBtn}>
          <Text style={styles.ctrlIcon}>{muted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity onPress={() => setShowSpeed(v => !v)} style={[styles.speedBtn, speed !== 1 && { backgroundColor: theme.accent + '22', borderColor: theme.accent + '55' }]}>
          <Text style={{ color: speed !== 1 ? theme.accent : '#fff', fontSize: 11, fontWeight: '800' }}>{speed}×</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onFullscreen} style={styles.ctrlBtn}>
          <Text style={styles.ctrlIcon}>{isFullscreen ? '⊡' : '⛶'}</Text>
        </TouchableOpacity>
      </View>

      {/* Speed picker */}
      {showSpeed && (
        <View style={[styles.speedPicker, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          {SPEEDS.map(s => (
            <TouchableOpacity key={s} onPress={() => { onSpeedChange(s); setShowSpeed(false); }} style={[styles.speedItem, speed === s && { backgroundColor: theme.accent + '22' }]}>
              <Text style={{ color: speed === s ? theme.accent : '#fff', fontWeight: speed === s ? '800' : '400', fontSize: 13 }}>{s === 1 ? 'Normal' : `${s}×`}</Text>
              {speed === s && <Text style={{ color: theme.accent }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Ad Overlay ──────────────────────────────────────────────────────────────
function AdOverlay({ ad, remaining, canSkip, onSkip, isMobile }) {
  const progress = Math.max(0, 1 - (remaining / 30));
  return (
    <LinearGradient colors={ad.bg} style={StyleSheet.absoluteFill}>
      <View style={styles.adHeader}>
        <View style={styles.adBrand}>
          <Text style={{ fontSize: 22 }}>{ad.logo}</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>{ad.brand}</Text>
        </View>
        <View style={[styles.adTag, { borderColor: ad.accent + '55', backgroundColor: ad.accent + '22' }]}>
          <Text style={{ color: ad.accent, fontSize: 9, fontWeight: '800' }}>AD</Text>
        </View>
      </View>

      <View style={styles.adBody}>
        <Text style={{ fontSize: 48 }}>{ad.logo}</Text>
        <Text style={[styles.adTagline, { color: '#fff' }]}>{ad.tagline}</Text>
        <Text style={[styles.adDesc, { color: 'rgba(255,255,255,0.75)' }]}>{ad.description}</Text>
        <TouchableOpacity style={[styles.adCta, { backgroundColor: ad.accent }]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{ad.cta} →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.adFooter}>
        <View style={styles.adTimer}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{Math.ceil(remaining)}</Text>
        </View>
        <TouchableOpacity
          onPress={onSkip}
          disabled={!canSkip}
          style={[styles.skipBtn, canSkip ? { backgroundColor: '#fff' } : { backgroundColor: 'rgba(255,255,255,0.25)' }]}
        >
          <Text style={{ color: canSkip ? '#000' : 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 12 }}>
            {canSkip ? 'Skip Ad ›' : `End in ${Math.ceil(remaining)}s`}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ── Main VideoPlayer ─────────────────────────────────────────────────────────
export default function VideoPlayer({ video, onClose, related = [] }) {
  const { theme, session, profile, showToast, incrementView } = useApp();
  const insets = useSafeAreaInsets();
  const vRef = useRef(null);
  const ctrlTimer = useRef(null);
  const adTimer = useRef(null);
  const viewGuard = useRef(false);
  const sessionCount = useRef(1);
  const tapTimer = useRef(null);
  const lastTap = useRef({ time: 0, side: null });

  const [playing, setPlaying]       = useState(false);
  const [muted, setMuted]           = useState(false);
  const [progress, setProgress]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const [buffering, setBuffering]   = useState(true);
  const [showCtrl, setShowCtrl]     = useState(true);
  const [speed, setSpeed]           = useState(1);
  const [seekFlash, setSeekFlash]   = useState(null);
  const [is3x, setIs3x]             = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saved, setSaved]           = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Ad state
  const [adActive, setAdActive]     = useState(false);
  const [adRemaining, setAdRemaining] = useState(0);
  const [adCanSkip, setAdCanSkip]   = useState(false);
  const [adData, setAdData]         = useState(null);

  const { liked, count: likeCount, toggle: toggleLike } = useVideoLike(video.id, false, video.likes_count);
  const pf = video.profiles || {};

  // ── Check saved ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (session?.user?.id) {
      likeAPI.isSaved(session.user.id, video.id).then(setSaved).catch(() => {});
    }
  }, [session, video.id]);

  // ── Start pre-roll ad ────────────────────────────────────────────────────
  useEffect(() => {
    const dur = getAdDuration(sessionCount.current);
    if (dur > 0) {
      const ad = DUMMY_ADS[(sessionCount.current - 1) % DUMMY_ADS.length];
      setAdData(ad);
      setAdActive(true);
      setAdRemaining(dur);
      setAdCanSkip(false);

      let elapsed = 0;
      adTimer.current = setInterval(() => {
        elapsed++;
        if (elapsed >= 5 && !UNSKIPPABLE.has(dur)) setAdCanSkip(true);
        setAdRemaining(r => {
          if (r <= 1) {
            clearInterval(adTimer.current);
            setAdActive(false);
            setAdData(null);
            setAdCanSkip(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    sessionCount.current++;
    return () => clearInterval(adTimer.current);
  }, [video.id]);

  // ── View increment ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(async () => {
      if (video?.id && !viewGuard.current && playing && !adActive) {
        viewGuard.current = true;
        await incrementView(video.id).catch(() => {});
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [playing, video.id, adActive]);

  // ── Controls auto-hide ───────────────────────────────────────────────────
  const revealCtrl = useCallback(() => {
    setShowCtrl(true);
    clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => setShowCtrl(false), 3500);
  }, []);

  const handleTap = useCallback((e) => {
    if (adActive) return;
    const x = e.nativeEvent.locationX;
    const w = SW;
    const third = w / 3;
    const now = Date.now();
    const prev = lastTap.current;
    const gap = now - prev.time;
    const side = x < third ? 'bwd' : x > third * 2 ? 'fwd' : 'center';
    const sameSide = prev.side === side;

    if (gap < 280 && sameSide) {
      clearTimeout(tapTimer.current);
      lastTap.current = { time: 0, side: null };
      if (side === 'bwd') seekBy(-10);
      else if (side === 'fwd') seekBy(10);
    } else {
      lastTap.current = { time: now, side };
      clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        if (side === 'center') togglePlayPause();
        else revealCtrl();
        lastTap.current = { time: 0, side: null };
      }, 250);
    }
  }, [adActive]);

  const togglePlayPause = useCallback(() => {
    setPlaying(p => !p);
    revealCtrl();
  }, [revealCtrl]);

  const seekBy = useCallback(secs => {
    if (!vRef.current || adActive) return;
    const newTime = Math.max(0, Math.min(duration, progress * duration + secs));
    vRef.current.seek(newTime);
    setSeekFlash(secs > 0 ? 'fwd' : 'bwd');
    setTimeout(() => setSeekFlash(null), 700);
    revealCtrl();
  }, [duration, progress, adActive, revealCtrl]);

  const handleSave = async () => {
    if (!session) { showToast('Please log in first', 'info'); return; }
    const next = !saved;
    setSaved(next);
    await likeAPI.toggleSave(session.user.id, video.id, saved);
    showToast(next ? '❤️ Saved!' : 'Removed from saved', 'success');
  };

  const handleShare = () => {
    showToast('Link copied! 📋', 'success');
  };

  const playerH = isFullscreen ? SH : SW * (9 / 16);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { backgroundColor: theme.bg2, borderBottomColor: theme.border, paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{video.title}</Text>
          <Text style={{ color: theme.muted, fontSize: 11 }}>{pf.display_name || pf.username || ''}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── Video player area ── */}
        <View style={[styles.playerWrap, { height: playerH }]}>
          {!adActive && (
            <Video
              ref={vRef}
              source={{ uri: video.video_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              paused={!playing}
              muted={muted}
              rate={speed}
              onLoad={({ duration: d }) => { setDuration(d); setBuffering(false); setPlaying(true); }}
              onProgress={({ currentTime }) => {
                if (duration > 0) setProgress(currentTime / duration);
              }}
              onBuffer={({ isBuffering: b }) => setBuffering(b)}
              onEnd={() => setPlaying(false)}
              onError={() => { setBuffering(false); showToast('Playback error', 'error'); }}
            />
          )}

          {/* Ad overlay */}
          {adActive && adData && (
            <AdOverlay
              ad={adData}
              remaining={adRemaining}
              canSkip={adCanSkip}
              onSkip={() => {
                clearInterval(adTimer.current);
                setAdActive(false);
                setAdData(null);
                setPlaying(true);
              }}
            />
          )}

          {/* Buffering */}
          {buffering && !adActive && (
            <View style={styles.bufferWrap} pointerEvents="none">
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          )}

          {/* Paused icon */}
          {!playing && !buffering && !adActive && (
            <View style={styles.pausedIcon} pointerEvents="none">
              <LinearGradient colors={[theme.accent + 'cc', theme.accent2 + 'cc']} style={styles.pausedCircle}>
                <Text style={{ color: '#fff', fontSize: 26 }}>▶</Text>
              </LinearGradient>
            </View>
          )}

          {/* Tap zone */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleTap}
          />

          {/* Seek flash */}
          <SeekFlash dir={seekFlash} />

          {/* Controls */}
          {showCtrl && !adActive && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.92)']}
              style={styles.controlsGrad}
              pointerEvents="box-none"
            >
              <ControlsBar
                playing={playing}
                muted={muted}
                progress={progress}
                duration={duration}
                buffering={buffering}
                speed={speed}
                theme={theme}
                isFullscreen={isFullscreen}
                onPlayPause={togglePlayPause}
                onSeek={val => {
                  if (vRef.current) vRef.current.seek(val * duration);
                  setProgress(val);
                }}
                onSeekBy={seekBy}
                onMute={() => setMuted(m => !m)}
                onSpeedChange={s => setSpeed(s)}
                onFullscreen={() => setIsFullscreen(f => !f)}
              />
            </LinearGradient>
          )}
        </View>

        {/* ── Video info ── */}
        <View style={[styles.infoSection, { paddingBottom: 20 }]}>
          <Text style={[styles.videoTitle, { color: theme.text }]}>{video.title}</Text>

          {/* Channel row */}
          <View style={styles.channelRow}>
            <Avatar profile={pf} size={40} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{pf.display_name || pf.username}</Text>
                {pf.is_verified && <VerifiedBadge />}
              </View>
              <Text style={{ color: theme.muted, fontSize: 11 }}>{fmtNum(pf.followers_count || 0)} followers</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Text style={{ color: theme.muted, fontSize: 11 }}>👁 {fmtNum(video.views || 0)}</Text>
              {video.is_vip && <VipBadge small />}
            </View>
          </View>

          {/* Action buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
            <ActionBtn icon={liked ? '❤️' : '🤍'} label={fmtNum(likeCount)} active={liked} color={theme.accent3} onPress={toggleLike} theme={theme} />
            <ActionBtn icon="🔖" label={saved ? 'Saved' : 'Save'} active={saved} color={theme.accent} onPress={handleSave} theme={theme} />
            <ActionBtn icon="🔗" label="Share" color={theme.accent2} onPress={handleShare} theme={theme} />
            <ActionBtn icon="💬" label="Comments" color={theme.muted} onPress={() => setShowComments(true)} theme={theme} />
          </ScrollView>

          {/* Description */}
          {video.description ? (
            <View style={[styles.descBox, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
              <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 20 }} numberOfLines={descExpanded ? undefined : 2}>
                {video.description}
              </Text>
              <TouchableOpacity onPress={() => setDescExpanded(v => !v)}>
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                  {descExpanded ? 'Show less ↑' : 'Show more ↓'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Tags */}
          {video.tags?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {video.tags.map(t => (
                <View key={t} style={[styles.tag, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
                  <Text style={{ color: theme.muted, fontSize: 11 }}>#{t}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Related videos */}
          {related.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.relatedHeader, { color: theme.text, borderBottomColor: theme.border }]}>Up Next</Text>
              {related.slice(0, 8).map((v, idx) => (
                <RelatedCard key={v.id} video={v} index={idx} theme={theme} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionBtn({ icon, label, active, color, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.actionBtn,
        { borderColor: active ? color : theme.border, backgroundColor: active ? color + '1a' : theme.bg3 },
      ]}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ color: active ? color : theme.text, fontSize: 12, fontWeight: '600', marginLeft: 5 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function RelatedCard({ video: v, index, theme }) {
  const { playVideo } = useApp();
  return (
    <TouchableOpacity onPress={() => playVideo(v)} activeOpacity={0.85} style={[styles.relatedCard, { borderBottomColor: theme.border + '33' }]}>
      <View style={styles.relatedThumb}>
        <Image
          source={{ uri: v.thumbnail_url || `https://picsum.photos/320/180?random=${index + 20}` }}
          style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
          resizeMode="cover"
        />
        {v.is_vip && <View style={{ position: 'absolute', top: 4, left: 4 }}><VipBadge small /></View>}
        {v.duration && (
          <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.85)', position: 'absolute', bottom: 4, right: 4 }]}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{v.duration}</Text>
          </View>
        )}
        {index === 0 && (
          <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: theme.accent, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>NEXT</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', lineHeight: 17 }} numberOfLines={2}>{v.title}</Text>
        <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '600', marginTop: 2 }}>{v.profiles?.display_name || v.channel || 'Unknown'}</Text>
        <Text style={{ color: theme.muted, fontSize: 9, marginTop: 1 }}>{fmtNum(v.views_count ?? v.views ?? 0)} views</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingBottom: 10, borderBottomWidth: 1, zIndex: 10,
  },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  playerWrap: { width: SW, backgroundColor: '#000', overflow: 'hidden' },
  bufferWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  pausedIcon: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pausedCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  seekFlash: { position: 'absolute', top: 0, bottom: 0, width: '38%', alignItems: 'center', justifyContent: 'center' },
  seekFlashInner: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 40, padding: 12 },
  controlsGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 40 },
  controlsBar: { paddingHorizontal: 12, paddingTop: 4 },
  seekRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  timeText: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '600', width: 36 },
  slider: { flex: 1, marginHorizontal: 4, height: 20 },
  ctrlRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 4 },
  ctrlBtn: { padding: 6, alignItems: 'center' },
  ctrlIcon: { color: '#fff', fontSize: 16 },
  ctrlSub: { color: 'rgba(255,255,255,0.5)', fontSize: 7, marginTop: -2 },
  ctrlBtnLg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  speedBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  speedPicker: {
    position: 'absolute', bottom: '100%', right: 10,
    borderRadius: 12, borderWidth: 1, overflow: 'hidden', minWidth: 120, zIndex: 50,
  },
  speedItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  // Ad styles
  adHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 20 },
  adBrand: { flexDirection: 'row', alignItems: 'center' },
  adTag: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  adBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  adTagline: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  adDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  adCta: { borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12, marginTop: 4 },
  adFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 24 },
  adTimer: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  skipBtn: { borderRadius: 8, paddingHorizontal: 18, paddingVertical: 9 },
  // Info section
  infoSection: { padding: 16 },
  videoTitle: { fontSize: 18, fontWeight: '800', lineHeight: 26, marginBottom: 12 },
  channelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  descBox: { borderRadius: 10, padding: 12, borderWidth: 1 },
  tag: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, marginRight: 8 },
  relatedHeader: { fontSize: 14, fontWeight: '800', paddingBottom: 12, marginBottom: 8, borderBottomWidth: 1 },
  relatedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  relatedThumb: { width: 130, aspectRatio: 16 / 9, borderRadius: 8, overflow: 'hidden', backgroundColor: '#111' },
  durationBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
});
