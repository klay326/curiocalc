import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, Calculator } from '../../lib/api';

const CALC_TYPES = ['', 'scientific', 'graphing', 'financial', 'basic', 'programmable', 'vintage'];

export default function BrowseScreen() {
  const router = useRouter();
  const [calculators, setCalculators] = useState<Calculator[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const SIZE = 20;

  const loadPage = useCallback(
    async (pg: number, reset = false) => {
      if (pg === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const data = await api.calculators.list({
          page: pg,
          size: SIZE,
          search: search || undefined,
          calc_type: typeFilter || undefined,
        });
        setCalculators((prev) => (reset || pg === 1 ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setHasMore(pg < data.pages);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, typeFilter],
  );

  useEffect(() => {
    setPage(1);
    loadPage(1, true);
  }, [search, typeFilter]);

  const loadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const next = page + 1;
    setPage(next);
    loadPage(next);
  };

  const submitSearch = () => setSearch(searchInput);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={submitSearch}
          placeholder="Search calculators…"
          placeholderTextColor="#71717a"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Type filter pills */}
      <FlatList
        data={CALC_TYPES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(t) => t}
        style={styles.pills}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.pill, typeFilter === item && styles.pillActive]}
            onPress={() => setTypeFilter(item)}
          >
            <Text style={[styles.pillText, typeFilter === item && styles.pillTextActive]}>
              {item || 'All'}
            </Text>
          </Pressable>
        )}
      />

      {/* Count */}
      <Text style={styles.count}>
        {total} calculator{total !== 1 ? 's' : ''}
      </Text>

      {/* Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : (
        <FlatList
          data={calculators}
          numColumns={2}
          keyExtractor={(c) => c.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#3b82f6" style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No calculators found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CalcCard calc={item} onPress={() => router.push(`/calculators/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

function CalcCard({ calc, onPress }: { calc: Calculator; onPress: () => void }) {
  const image = calc.images?.[0];
  return (
    <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: '#27272a' }}>
      <View style={styles.imageBox}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.imageFallback}>🖩</Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardMake} numberOfLines={1}>
          {calc.make}
        </Text>
        <Text style={styles.cardModel} numberOfLines={1}>
          {calc.model}
        </Text>
        {calc.year_introduced && (
          <Text style={styles.cardYear}>{calc.year_introduced}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  searchRow: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  searchInput: {
    backgroundColor: '#18181b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fafafa',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  pills: { flexGrow: 0, marginVertical: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  pillActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  pillText: { color: '#a1a1aa', fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  count: { color: '#52525b', fontSize: 12, paddingHorizontal: 14, marginBottom: 4 },
  grid: { paddingHorizontal: 10, paddingBottom: 20 },
  row: { gap: 10, marginBottom: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { color: '#52525b', fontSize: 15 },
  card: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  imageBox: {
    height: 130,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  imageFallback: { fontSize: 48 },
  cardBody: { padding: 10 },
  cardMake: { color: '#a1a1aa', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardModel: { color: '#fafafa', fontSize: 14, fontWeight: '700', marginTop: 2 },
  cardYear: { color: '#52525b', fontSize: 11, marginTop: 3 },
});
