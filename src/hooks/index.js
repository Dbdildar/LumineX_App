// src/hooks/index.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { Dimensions } from 'react-native';
import { likeAPI, followAPI } from '../lib/supabase';
import { useApp } from '../context/AppContext';

// ── Screen dimensions ──────────────────────────────────────────────────────
export function useScreenDimensions() {
  const [dims, setDims] = useState(Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub?.remove();
  }, []);
  return dims;
}

// ── Debounce ───────────────────────────────────────────────────────────────
export function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ── Video like (optimistic) ────────────────────────────────────────────────
export function useVideoLike(videoId, initialLiked, initialCount) {
  const { session, setAuthModal } = useApp();
  const [liked, setLiked] = useState(!!initialLiked);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const pending = useRef(false);

  useEffect(() => { setLiked(!!initialLiked); }, [initialLiked]);
  useEffect(() => { setCount(Number(initialCount) || 0); }, [initialCount]);

  const toggle = useCallback(async () => {
    if (!session) { setAuthModal('login'); return; }
    if (pending.current) return;
    pending.current = true;
    const next = !liked;
    setLiked(next);
    setCount(c => next ? c + 1 : Math.max(0, c - 1));
    try {
      await likeAPI.toggle(session.user.id, videoId, liked);
    } catch {
      setLiked(liked);
      setCount(c => next ? Math.max(0, c - 1) : c + 1);
    } finally {
      pending.current = false;
    }
  }, [session, liked, videoId, setAuthModal]);

  return { liked, count, toggle };
}

// ── Follow (optimistic) ────────────────────────────────────────────────────
export function useFollow(targetUserId, initialFollowing, targetProfile, setTargetProfile) {
  const { session, setAuthModal, showToast } = useApp();
  const [following, setFollowing] = useState(!!initialFollowing);
  const [loading, setLoading]     = useState(false);
  const pending = useRef(false);

  useEffect(() => { setFollowing(!!initialFollowing); }, [initialFollowing]);

  const toggle = useCallback(async () => {
    if (!session) { setAuthModal('login'); return; }
    if (session.user.id === targetUserId) return;
    if (pending.current) return;
    pending.current = true;
    const next = !following;
    setFollowing(next);
    if (setTargetProfile && targetProfile) {
      setTargetProfile(p => ({
        ...p,
        followers_count: Math.max(0, (p.followers_count || 0) + (next ? 1 : -1)),
      }));
    }
    setLoading(true);
    try {
      if (next) await followAPI.follow(session.user.id, targetUserId);
      else await followAPI.unfollow(session.user.id, targetUserId);
      showToast(next ? '✓ Following!' : 'Unfollowed', 'success');
    } catch {
      setFollowing(following);
      if (setTargetProfile && targetProfile) {
        setTargetProfile(p => ({
          ...p,
          followers_count: Math.max(0, (p.followers_count || 0) + (next ? -1 : 1)),
        }));
      }
      showToast('Something went wrong', 'error');
    } finally {
      setLoading(false);
      pending.current = false;
    }
  }, [session, following, targetUserId, setAuthModal, showToast, targetProfile, setTargetProfile]);

  return { following, toggle, loading, isOwn: session?.user?.id === targetUserId };
}
