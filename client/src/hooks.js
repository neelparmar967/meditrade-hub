import { useEffect, useState } from 'react';
import { api } from './api.js';

export function useApi(path, fallback) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(path)
      .then((response) => active && setData(response.data))
      .catch((err) => active && setError(err.response?.data?.message || 'Unable to load data'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [path]);

  return { data, setData, loading, error };
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
