import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<T>(url);
      setData(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar dados';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    setTimeout(() => {
      fetchData();
    }, 0);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
