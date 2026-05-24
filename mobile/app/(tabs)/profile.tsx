import { useRouter } from 'expo-router';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../lib/auth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>👤</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>Sign in to access your profile and settings.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.btnText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={[styles.btnText, styles.btnOutlineText]}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.header}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(user.display_name ?? user.username).charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.displayName}>{user.display_name ?? user.username}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.is_superuser && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Admin</Text>
          </View>
        )}
      </View>

      {/* Info rows */}
      <View style={styles.section}>
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Account" value={user.is_verified ? 'Verified ✓' : 'Unverified'} />
      </View>

      {/* Links */}
      <View style={styles.section}>
        <SectionLink label="Browse Calculators" onPress={() => router.push('/(tabs)')} />
        <SectionLink
          label="curiocalc.org"
          onPress={() => {
            const Linking = require('expo-linking');
            Linking.openURL('https://curiocalc.org');
          }}
        />
      </View>

      {/* Danger */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>CurioCalc · Open Source Calculator Community</Text>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SectionLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.sectionLink} onPress={onPress}>
      <Text style={styles.sectionLinkText}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090b',
    paddingHorizontal: 32,
    gap: 12,
  },
  icon: { fontSize: 56, marginBottom: 8 },
  title: { color: '#fafafa', fontSize: 22, fontWeight: '700' },
  sub: { color: '#71717a', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btn: {
    marginTop: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3f3f46' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOutlineText: { color: '#a1a1aa' },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: '700' },
  displayName: { color: '#fafafa', fontSize: 22, fontWeight: '700' },
  username: { color: '#71717a', fontSize: 14, marginTop: 2 },
  badge: {
    marginTop: 8,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  infoLabel: { color: '#71717a', fontSize: 14 },
  infoValue: { color: '#fafafa', fontSize: 14, fontWeight: '500' },
  sectionLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  sectionLinkText: { color: '#fafafa', fontSize: 15 },
  chevron: { color: '#52525b', fontSize: 20 },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  footer: { color: '#3f3f46', fontSize: 12, textAlign: 'center', marginTop: 32 },
});
