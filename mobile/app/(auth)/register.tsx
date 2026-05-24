import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../lib/auth';

type Rule = { label: string; test: (p: string) => boolean };

const RULES: Rule[] = [
  { label: '8+ characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /\d/.test(p) },
  { label: 'Special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
const STRENGTH_COLORS = ['#27272a', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const passed = RULES.filter((r) => r.test(password)).length;
  const strengthColor = STRENGTH_COLORS[passed];
  const strengthLabel = STRENGTH_LABELS[passed];
  const canSubmit = passed >= 4 && email.trim() && username.trim();

  const handleRegister = async () => {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        username: username.trim(),
        password,
        display_name: displayName.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>🖩</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.sub}>Join the calculator community</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#52525b"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="calcfan42"
            placeholderTextColor="#52525b"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Calculator Fan (optional)"
            placeholderTextColor="#52525b"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password *</Text>
          <View style={styles.passRow}>
            <TextInput
              style={[
                styles.input,
                styles.passInput,
                passed >= 4 && { borderColor: '#22c55e' },
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowPass((s) => !s)}>
              <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>

          {/* Strength bar */}
          {password.length > 0 && (
            <View style={styles.strengthArea}>
              <View style={styles.strengthBarRow}>
                {RULES.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthSegment,
                      { backgroundColor: i < passed ? strengthColor : '#27272a' },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                {strengthLabel}
              </Text>

              {/* Checklist */}
              <View style={styles.checklist}>
                {RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <View key={rule.label} style={styles.checkRow}>
                      <Text style={[styles.checkIcon, { color: ok ? '#22c55e' : '#52525b' }]}>
                        {ok ? '✓' : '○'}
                      </Text>
                      <Text style={[styles.checkLabel, { color: ok ? '#d4d4d8' : '#52525b' }]}>
                        {rule.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b' },
  scroll: { flexGrow: 1, padding: 24 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8, marginTop: 16 },
  title: { color: '#fafafa', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#71717a', fontSize: 15, textAlign: 'center', marginTop: 4, marginBottom: 28 },
  errorBox: {
    backgroundColor: '#2d1515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#fca5a5', fontSize: 14 },
  form: { gap: 4 },
  label: { color: '#a1a1aa', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#18181b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fafafa',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  passRow: { position: 'relative' },
  passInput: { paddingRight: 50 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eyeText: { fontSize: 18 },
  strengthArea: { marginTop: 10, gap: 6 },
  strengthBarRow: { flexDirection: 'row', gap: 4, height: 5 },
  strengthSegment: { flex: 1, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  checklist: { gap: 4, marginTop: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkIcon: { fontSize: 13, width: 14 },
  checkLabel: { fontSize: 13 },
  btn: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  footerText: { color: '#71717a', fontSize: 14 },
  footerLink: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
});
