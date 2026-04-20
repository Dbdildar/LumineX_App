// src/context/AppContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, authAPI, profileAPI, notifAPI } from '../lib/supabase';
import { DARK_THEME, LIGHT_THEME } from '../data/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession]         = useState(null);
  const [profile, setProfile]         = useState(null);
  const [authReady, setAuthReady]     = useState(false);
  const [player, setPlayer]           = useState(null);   // video being played
  const [toast, setToast]             = useState(null);
  const [authModal, setAuthModal]     = useState(null);   // 'login' | 'signup' | null
  const [vipModal, setVipModal]       = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [notifCount, setNotifCount]   = useState(0);
  const [activeProfile, setActiveProfile] = useState(null);
  const [isDark, setIsDark]           = useState(true);
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const toastTimer = useRef(null);

  // ── Auth init ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setAuthReady(true); setNotifCount(0); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Notification subscription ──────────────────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    notifAPI.getUnreadCount(session.user.id).then(setNotifCount).catch(() => {});
    const ch = supabase
      .channel(`notifs:${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => setNotifCount(c => c + 1))
      .subscribe();
    return () => ch.unsubscribe();
  }, [session?.user?.id]);

  // ── Theme persistence ──────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('lx_theme').then(val => {
      if (val !== null) setIsDark(val === 'dark');
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(d => {
      const next = !d;
      AsyncStorage.setItem('lx_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const loadProfile = async id => {
    try {
      const p = await profileAPI.getById(id);
      setProfile(p);
    } catch (e) {
      console.error('Profile load:', e);
    } finally {
      setAuthReady(true);
    }
  };

  const showToast = useCallback((msg, type = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const playVideo = useCallback(async video => {
    if (video.is_vip && !profile?.is_vip) {
      setVipModal(true);
      return;
    }
    setPlayer(video);
  }, [profile]);

  const signOut = useCallback(async () => {
    try {
      await authAPI.signOut();
      setSession(null);
      setProfile(null);
      setNotifCount(0);
      setPlayer(null);
      showToast('Signed out', 'success');
    } catch {
      showToast('Error signing out', 'error');
    }
  }, [showToast]);

  const refreshProfile = useCallback(() => {
    if (session?.user?.id) loadProfile(session.user.id);
  }, [session]);

  const incrementView = useCallback(async videoId => {
    try {
      await supabase.rpc('increment_views', { vid: videoId });
    } catch (err) {
      console.error('View increment failed:', err);
    }
  }, []);

  return (
    <AppCtx.Provider value={{
      session, profile, authReady, theme, isDark, toggleTheme,
      player, setPlayer, playVideo,
      activeProfile, setActiveProfile,
      toast, showToast,
      authModal, setAuthModal,
      vipModal, setVipModal,
      uploadModal, setUploadModal,
      notifOpen, setNotifOpen,
      notifCount, setNotifCount,
      signOut, refreshProfile, loadProfile,
      incrementView,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
