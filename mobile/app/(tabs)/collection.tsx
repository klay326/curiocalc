import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../lib/auth';

export default function CollectionScreen() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>📚</Text>
        <Text style={styles.title}>Your Collection</Text>
        <Text style={styles.sub}>Sign in to save calculators and build your collection.</Text>
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

  return (
    <View style={styles.center}>
      <Text style={styles.icon}>🚧</Text>
      <Text style={styles.title}>Coming Soon</Text>
      <Text style={styles.sub}>
        Collection tracking is on its way. For now, browse and explore on the Browse tab.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090b',
    paddingHorizontal: 32,
    gap: 12,
  },
  icon: { fontSize: 56, marginBottom: 8 },
  title: { color: '#fafafa', fontSize: 22, fontWeight: '700', textAlign: 'center' },
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
});
