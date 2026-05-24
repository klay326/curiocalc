import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, Calculator } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalculatorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [calc, setCalc] = useState<Calculator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.calculators
      .get(id)
      .then((c) => {
        setCalc(c);
        navigation.setOptions({ title: `${c.make} ${c.model}` });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  if (error || !calc) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Calculator not found'}</Text>
      </View>
    );
  }

  const images = calc.images ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Image gallery */}
      {images.length > 0 ? (
        <View style={styles.gallery}>
          <Image
            source={{ uri: images[imageIndex] }}
            style={styles.mainImage}
            resizeMode="contain"
          />
          {images.length > 1 && (
            <View style={styles.thumbRow}>
              {images.map((img, i) => (
                <TouchableOpacity key={i} onPress={() => setImageIndex(i)}>
                  <Image
                    source={{ uri: img }}
                    style={[styles.thumb, i === imageIndex && styles.thumbActive]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noImage}>
          <Text style={styles.noImageIcon}>🖩</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.make}>{calc.make}</Text>
        <Text style={styles.model}>{calc.model}</Text>
        {(calc.year_introduced || calc.year_discontinued) && (
          <Text style={styles.years}>
            {calc.year_introduced ?? '?'}
            {calc.year_discontinued && ` – ${calc.year_discontinued}`}
          </Text>
        )}
      </View>

      {/* Tags */}
      {calc.tags && calc.tags.length > 0 && (
        <View style={styles.tagRow}>
          {calc.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Scores */}
      {(calc.rarity_score != null || calc.weirdness_score != null) && (
        <View style={styles.scoreRow}>
          {calc.rarity_score != null && (
            <ScoreBadge label="Rarity" value={calc.rarity_score} color="#f59e0b" />
          )}
          {calc.weirdness_score != null && (
            <ScoreBadge label="Weirdness" value={calc.weirdness_score} color="#8b5cf6" />
          )}
        </View>
      )}

      {/* Specs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specifications</Text>
        {calc.calc_type && <SpecRow label="Type" value={calc.calc_type} />}
        {calc.display_type && <SpecRow label="Display" value={calc.display_type} />}
        {calc.power_source && <SpecRow label="Power" value={calc.power_source} />}
        {calc.num_keys != null && <SpecRow label="Keys" value={String(calc.num_keys)} />}
        {calc.country_of_origin && <SpecRow label="Origin" value={calc.country_of_origin} />}
      </View>

      {/* Description */}
      {calc.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{calc.description}</Text>
        </View>
      )}

      {/* Fun facts */}
      {calc.fun_facts && calc.fun_facts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fun Facts</Text>
          {calc.fun_facts.map((fact, i) => (
            <View key={i} style={styles.factRow}>
              <Text style={styles.factBullet}>✦</Text>
              <Text style={styles.factText}>{fact}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Wikipedia link */}
      <TouchableOpacity
        style={styles.wikiBtn}
        onPress={() =>
          Linking.openURL(
            `https://en.wikipedia.org/wiki/${encodeURIComponent(`${calc.make} ${calc.model}`)}`,
          )
        }
      >
        <Text style={styles.wikiBtnText}>Wikipedia →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ScoreBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 10);
  return (
    <View style={styles.scoreBadge}>
      <Text style={[styles.scoreValue, { color }]}>{pct}/10</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b' },
  errorText: { color: '#ef4444', fontSize: 16 },

  gallery: { backgroundColor: '#0f0f12' },
  mainImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.65 },
  thumbRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#18181b',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: '#3b82f6' },
  noImage: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f12',
  },
  noImageIcon: { fontSize: 72 },

  header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  make: { color: '#71717a', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  model: { color: '#fafafa', fontSize: 28, fontWeight: '800', marginTop: 2 },
  years: { color: '#52525b', fontSize: 14, marginTop: 4 },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  tagText: { color: '#a1a1aa', fontSize: 12 },

  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  scoreBadge: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  scoreValue: { fontSize: 22, fontWeight: '800' },
  scoreLabel: { color: '#71717a', fontSize: 12, marginTop: 2 },

  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  specLabel: { color: '#71717a', fontSize: 14 },
  specValue: { color: '#fafafa', fontSize: 14, fontWeight: '500' },
  description: { color: '#d4d4d8', fontSize: 15, lineHeight: 23 },
  factRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  factBullet: { color: '#3b82f6', fontSize: 12, marginTop: 4 },
  factText: { color: '#d4d4d8', fontSize: 14, lineHeight: 21, flex: 1 },

  wikiBtn: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  wikiBtnText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
});
