import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getApiBaseUrl } from './src/lib/api';

type HealthResponse = { status: string };

export default function App() {
  const baseUrl = getApiBaseUrl();
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${baseUrl}/health`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const body = (await res.json()) as HealthResponse;
        if (!cancelled) setData(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tripinci</Text>
      <Text style={styles.subtitle}>API: {baseUrl}</Text>

      {loading && <ActivityIndicator />}
      {data && <Text style={styles.ok}>/health → {JSON.stringify(data)}</Text>}
      {error && <Text style={styles.error}>error: {error}</Text>}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
  },
  ok: {
    color: '#0a6b2e',
    fontSize: 16,
  },
  error: {
    color: '#b00020',
    fontSize: 14,
    textAlign: 'center',
  },
});
