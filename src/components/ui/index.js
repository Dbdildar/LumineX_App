// src/components/ui/index.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TouchableHighlight, TextInput,
  StyleSheet, ActivityIndicator, Image, Animated, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useApp } from '../../context/AppContext';

const { width: SW } = Dimensions.get('window');

// ── Avatar ─────────────────────────────────────────────────────────────────
export function Avatar({ profile, size = 36, onPress }) {
  const { theme } = useApp();
  const [err, setErr] = useState(false);
  if (!profile) {
    return (
      <View style={[styles.avatarBase, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.bg3, borderColor: theme.border }]} />
    );
  }
  const initials = (profile.display_name || profile.username || '?')[0].toUpperCase();
  if (profile.avatar_url && !err) {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
        <Image
          source={{ uri: profile.avatar_url }}
          style={[styles.avatarBase, { width: size, height: size, borderRadius: size / 2, borderColor: theme.border }]}
          onError={() => setErr(true)}
        />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#c084fc', '#818cf8']}
        style={[styles.avatarBase, { width: size, height: size, borderRadius: size / 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}
      >
        <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: '#fff' }}>
          {profile.avatar_emoji || initials}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── VipBadge ───────────────────────────────────────────────────────────────
export function VipBadge({ small }) {
  return (
    <LinearGradient
      colors={['#fbbf24', '#f97316']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={[styles.vipBadge, small && styles.vipSmall]}
    >
      <Text style={[styles.vipText, small && { fontSize: 7 }]}>VIP</Text>
    </LinearGradient>
  );
}

// ── VerifiedBadge ──────────────────────────────────────────────────────────
export function VerifiedBadge({ size = 14 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.55, fontWeight: '900' }}>✓</Text>
    </View>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, color }) {
  const { theme } = useApp();
  return <ActivityIndicator size={size > 20 ? 'large' : 'small'} color={color || theme.accent} />;
}

// ── Btn ────────────────────────────────────────────────────────────────────
export function Btn({ children, onPress, variant = 'primary', size = 'md', disabled, loading, style: s }) {
  const { theme } = useApp();
  const pad = { sm: { paddingVertical: 6, paddingHorizontal: 12 }, md: { paddingVertical: 10, paddingHorizontal: 20 }, lg: { paddingVertical: 14, paddingHorizontal: 28 } }[size];
  const fs = { sm: 12, md: 14, lg: 15 }[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={[s]}>
        <LinearGradient
          colors={[theme.accent, theme.accent2]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.btn, pad, (disabled || loading) && { opacity: 0.5 }]}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : (
            <Text style={[styles.btnText, { fontSize: fs }]}>{children}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: { bg: theme.bg3, border: theme.border, textColor: theme.text },
    ghost:     { bg: 'transparent', border: theme.accent, textColor: theme.accent },
    danger:    { bg: theme.red + '22', border: theme.red + '44', textColor: theme.red },
  }[variant] || { bg: theme.bg3, border: theme.border, textColor: theme.text };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.btn, pad, { backgroundColor: variantStyles.bg, borderWidth: 1, borderColor: variantStyles.border, opacity: (disabled || loading) ? 0.5 : 1 }, s]}
    >
      {loading ? <ActivityIndicator size="small" color={variantStyles.textColor} /> : (
        <Text style={[styles.btnText, { fontSize: fs, color: variantStyles.textColor }]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
export function Input({ label, value, onChangeText, placeholder, secureTextEntry, error, keyboardType, autoCapitalize = 'none', icon, multiline, numberOfLines, style: s }) {
  const { theme } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={[styles.inputLabel, { color: theme.muted }]}>{label}</Text> : null}
      <View style={[
        styles.inputWrap,
        { backgroundColor: theme.bg3, borderColor: error ? theme.red : focused ? theme.accent : theme.border },
        focused && { shadowColor: theme.accent, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
        s,
      ]}>
        {icon ? <Text style={styles.inputIcon}>{icon}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[styles.inputText, { color: theme.text, paddingLeft: icon ? 4 : 0 }, multiline && { height: numberOfLines * 20 + 16, textAlignVertical: 'top' }]}
        />
      </View>
      {error ? <Text style={[styles.inputError, { color: theme.red }]}>⚠ {error}</Text> : null}
    </View>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
export function Toast({ toast }) {
  const { theme } = useApp();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [toast]);

  if (!toast) return null;
  const icons = { success: '✓', error: '✕', info: '💡', warning: '⚠' };
  const colors = { success: theme.green, error: theme.red, info: theme.accent, warning: theme.gold };
  const c = colors[toast.type] || theme.accent;

  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: 'rgba(20,20,35,0.97)', borderColor: c + '44', transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] },
    ]}>
      <Text style={{ color: c, fontSize: 15, marginRight: 8 }}>{icons[toast.type] || '•'}</Text>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', flex: 1 }}>{toast.msg}</Text>
    </Animated.View>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 16, style: s }) {
  const { theme } = useApp();
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{ width, height, borderRadius: 8, backgroundColor: theme.bg3, opacity: anim }, s]} />
  );
}

// ── SectionHeader ──────────────────────────────────────────────────────────
export function SectionHeader({ title, action, actionLabel }) {
  const { theme } = useApp();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={action}>
          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>{actionLabel || 'View all'} →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── FilterChip ─────────────────────────────────────────────────────────────
export function FilterChip({ label, active, onPress, icon }) {
  const { theme } = useApp();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.filterChip,
        {
          borderColor: active ? theme.accent : theme.border,
          backgroundColor: active ? theme.accent + '22' : theme.bg3,
        },
      ]}
    >
      {icon ? <Text style={{ marginRight: 4 }}>{icon}</Text> : null}
      <Text style={{ color: active ? theme.accent : theme.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ emoji = '📭', title, subtitle, action, actionLabel }) {
  const { theme } = useApp();
  return (
    <View style={styles.emptyState}>
      <Text style={{ fontSize: 52, marginBottom: 12 }}>{emoji}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 }}>{title}</Text>
      {subtitle ? <Text style={{ fontSize: 13, color: theme.muted, textAlign: 'center', lineHeight: 20 }}>{subtitle}</Text> : null}
      {action ? <Btn onPress={action} variant="ghost" size="sm" style={{ marginTop: 16 }}>{actionLabel}</Btn> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBase: { borderWidth: 2 },
  vipBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  vipSmall: { paddingHorizontal: 5, paddingVertical: 1 },
  vipText: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  btn: { borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  btnText: { fontWeight: '600', color: '#fff' },
  inputLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 2 },
  inputIcon: { fontSize: 16, marginRight: 8 },
  inputText: { flex: 1, fontSize: 14, paddingVertical: 11 },
  inputError: { fontSize: 11, marginTop: 4 },
  toast: {
    position: 'absolute', bottom: 90, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11,
    borderWidth: 1, zIndex: 99999,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8,
  },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
});
