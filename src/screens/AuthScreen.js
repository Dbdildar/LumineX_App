// src/screens/AuthScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useApp } from '../context/AppContext';
import { authAPI, profileAPI } from '../lib/supabase';
import { Input, Btn, Spinner } from '../components/ui';

// ── Login Form ─────────────────────────────────────────────────────────────
function LoginForm({ onSwitch, onClose, theme }) {
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = {};
    if (!email.trim()) e.email = 'Email required';
    if (!pass) e.pass = 'Password required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await authAPI.signIn({ email, password: pass });
      showToast('Welcome back! 🎉', 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Sign in failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text style={[styles.formTitle, { color: theme.text }]}>Welcome back 👋</Text>
      <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 22 }}>Sign in to continue watching</Text>
      <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" icon="📧" error={errors.email} />
      <Input label="Password" value={pass} onChangeText={setPass} placeholder="Your password" secureTextEntry icon="🔒" error={errors.pass} />
      <TouchableOpacity onPress={() => onSwitch('forgot')} style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -8 }}>
        <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>Forgot password?</Text>
      </TouchableOpacity>
      <Btn onPress={submit} loading={loading} size="lg" style={{ marginBottom: 16 }}>Sign In →</Btn>
      <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>
        No account?{' '}
        <Text onPress={() => onSwitch('signup')} style={{ color: theme.accent, fontWeight: '700' }}>Create one free</Text>
      </Text>
    </View>
  );
}

// ── Signup Form ────────────────────────────────────────────────────────────
function SignupForm({ onSwitch, onClose, theme }) {
  const { showToast } = useApp();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', username: '', email: '', pass: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = key => val => setForm(prev => ({ ...prev, [key]: val }));

  const nextStep = async () => {
    const e = {};
    if (!form.name.trim() || form.name.length < 2) e.name = 'At least 2 characters';
    if (!form.username || form.username.length < 3) e.username = 'At least 3 characters';
    else if (!/^[a-z0-9_]+$/.test(form.username)) e.username = 'Only a-z, 0-9, _';
    if (!form.email.trim()) e.email = 'Email required';
    setErrors(e);
    if (Object.keys(e).length) return;
    // Check username
    const taken = await profileAPI.checkUsername(form.username).catch(() => false);
    if (taken) { setErrors({ username: 'Username taken' }); return; }
    setStep(2);
  };

  const submit = async () => {
    const e = {};
    if (!form.pass || form.pass.length < 8) e.pass = 'At least 8 characters';
    if (form.pass !== form.confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await authAPI.signUp({ email: form.email, password: form.pass, username: form.username.toLowerCase(), displayName: form.name, avatarId: 'a9' });
      showToast('Check your email for verification link 📧', 'info');
      onClose();
    } catch (err) {
      showToast(err.message || 'Sign up failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text style={[styles.formTitle, { color: theme.text }]}>Create account 🚀</Text>
      <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 8 }}>Step {step} of 2</Text>
      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 22 }}>
        {[1, 2].map(s => (
          <LinearGradient
            key={s}
            colors={step >= s ? [theme.accent, theme.accent2] : [theme.border, theme.border]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ flex: 1, height: 3, borderRadius: 3 }}
          />
        ))}
      </View>

      {step === 1 && (
        <>
          <Input label="Full Name" value={form.name} onChangeText={set('name')} placeholder="Your name" icon="👤" error={errors.name} />
          <Input label="Username" value={form.username} onChangeText={v => set('username')(v.toLowerCase())} placeholder="unique_username" icon="@" error={errors.username} autoCapitalize="none" />
          <Input label="Email" value={form.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" icon="📧" error={errors.email} />
          <Btn onPress={nextStep} size="lg" style={{ marginTop: 4 }}>Continue →</Btn>
        </>
      )}

      {step === 2 && (
        <>
          <Input label="Password" value={form.pass} onChangeText={set('pass')} placeholder="Min 8 characters" secureTextEntry icon="🔒" error={errors.pass} />
          <Input label="Confirm Password" value={form.confirm} onChangeText={set('confirm')} placeholder="Repeat password" secureTextEntry icon="🔒" error={errors.confirm} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Btn onPress={() => setStep(1)} variant="secondary" size="md" style={{ flex: 1 }}>← Back</Btn>
            <Btn onPress={submit} loading={loading} size="md" style={{ flex: 2 }}>Create Account 🎉</Btn>
          </View>
        </>
      )}

      <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center', marginTop: 20 }}>
        Have an account?{' '}
        <Text onPress={() => onSwitch('login')} style={{ color: theme.accent, fontWeight: '700' }}>Sign in</Text>
      </Text>
    </View>
  );
}

// ── Forgot Form ────────────────────────────────────────────────────────────
function ForgotForm({ onSwitch, theme }) {
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authAPI.resetPassword(email);
      setSent(true);
      showToast('Reset link sent! Check your email', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
        <Text style={[styles.formTitle, { color: theme.text, textAlign: 'center' }]}>Check your inbox</Text>
        <Text style={{ color: theme.muted, textAlign: 'center', marginBottom: 24 }}>We sent a reset link to {email}</Text>
        <Btn onPress={() => onSwitch('login')} size="lg">Back to Sign In</Btn>
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.formTitle, { color: theme.text }]}>Reset Password</Text>
      <Text style={{ color: theme.muted, marginBottom: 22 }}>Enter your registered email</Text>
      <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" icon="📧" />
      <Btn onPress={send} loading={loading} size="lg" style={{ marginBottom: 16 }}>Send Reset Link →</Btn>
      <TouchableOpacity onPress={() => onSwitch('login')}>
        <Text style={{ color: theme.accent, fontWeight: '600', textAlign: 'center' }}>← Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main AuthScreen ────────────────────────────────────────────────────────
export default function AuthScreen({ navigation, route }) {
  const { theme, authModal, setAuthModal } = useApp();
  const [mode, setMode] = useState(route.params?.mode || authModal || 'login');

  const onClose = useCallback(() => {
    setAuthModal(null);
    if (navigation.canGoBack()) navigation.goBack();
  }, [setAuthModal, navigation]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={[theme.bg, theme.bg2]} style={{ flex: 1 }}>
        {/* Ambient blobs */}
        <View style={[styles.blob1, { backgroundColor: theme.accent + '13' }]} />
        <View style={[styles.blob2, { backgroundColor: theme.accent2 + '0f' }]} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Close */}
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
            <Text style={{ color: theme.muted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>

          {/* Brand */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={[styles.logoCircle, { backgroundColor: theme.bg3 }]}>
              <Text style={{ color: theme.accent, fontSize: 28, fontWeight: '900' }}>L</Text>
            </View>
            <Text style={{ color: theme.accent, fontSize: 24, fontWeight: '900', marginTop: 8 }}>
              Lumine<Text style={{ color: theme.text }}>X</Text>
            </Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: theme.bg2 + 'ee', borderColor: theme.border }]}>
            {mode === 'login'  && <LoginForm  onSwitch={setMode} onClose={onClose} theme={theme} />}
            {mode === 'signup' && <SignupForm onSwitch={setMode} onClose={onClose} theme={theme} />}
            {mode === 'forgot' && <ForgotForm onSwitch={setMode} theme={theme} />}
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 54, justifyContent: 'center' },
  blob1: { position: 'absolute', top: '10%', left: '5%', width: 300, height: 300, borderRadius: 150 },
  blob2: { position: 'absolute', bottom: '10%', right: '5%', width: 250, height: 250, borderRadius: 125 },
  closeBtn: { position: 'absolute', top: 50, right: 20, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  formTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
});
