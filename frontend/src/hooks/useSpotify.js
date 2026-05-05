import { useCallback, useEffect, useState } from "react";

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.error || "Spotify request failed");
  }
  return payload;
}

export function useSpotify() {
  const [user, setUser] = useState(null);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshMe = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api("/api/auth/me");
      setUser(payload.user);
    } catch (err) {
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (!user) return;
    api("/api/genres")
      .then((payload) => setGenres(payload.genres || []))
      .catch(() => setGenres([]));
  }, [user]);

  return {
    user,
    genres,
    loading,
    error,
    connect: () => {
      window.location.href = "/api/auth/login";
    },
    logout: async () => {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
    },
    searchTracks: (query, limit = 30, variance = false) =>
      api(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}&variance=${variance}`),
    searchArtists: (query, limit = 10) => api(`/api/artists/search?q=${encodeURIComponent(query)}&limit=${limit}`),
    eraSearch: (params) => api(`/api/era-search?${new URLSearchParams(params).toString()}`),
    vibePlan: (prompt) =>
      api("/api/vibe-plan", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      }),
    recommendations: (params) => api(`/api/recommendations?${new URLSearchParams(params).toString()}`),
    createPlaylist: (payload) =>
      api("/api/playlist/create", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };
}
