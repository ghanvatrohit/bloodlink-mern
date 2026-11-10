// A small custom hook to load data from the backend.
//
// Example:
//   const { data, loading, reload } = useFetch('/requests', [], ['request:new']);
//
// - url:          backend path to GET (pass null to skip loading)
// - defaultValue: value to use before data arrives
// - liveEvents:   socket event names; when one happens, data is loaded again
import { useState, useEffect, useCallback } from 'react';
import api from './api';
import { getSocket } from './socket';

export default function useFetch(url, defaultValue = null, liveEvents = []) {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!url) return;
    try {
      const response = await api.get(url);
      setData(response.data);
    } catch (e) {
      console.log('Could not load', url, e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  // Load when the page opens or the url changes
  useEffect(() => {
    reload();
  }, [reload]);

  // Reload when a live event comes from the server
  const eventsKey = liveEvents.join(',');
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !eventsKey) return;
    const names = eventsKey.split(',');
    names.forEach((name) => socket.on(name, reload));
    return () => names.forEach((name) => socket.off(name, reload));
  }, [eventsKey, reload]);

  return { data, setData, loading, reload };
}
