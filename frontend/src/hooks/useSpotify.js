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
    const spotifyMessage = payload.error?.message || payload.error;
    const missingScopes = payload.sieve_scopes?.missing?.length ? ` Missing scopes: ${payload.sieve_scopes.missing.join(", ")}.` : "";
    const retryAfter = payload.retry_after ? ` Spotify says to retry in about ${formatRetryAfter(payload.retry_after)}.` : "";
    throw new Error(`${spotifyMessage || "Spotify request failed"}${retryAfter}${missingScopes}`);
  }
  return payload;
}

function formatRetryAfter(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "a little while";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function useSpotify() {
  const [user, setUser] = useState(null);
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

  return {
    user,
    loading,
    error,
    connect: () => {
      window.location.href = "/api/auth/login";
    },
    logout: async () => {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
    },
    playlists: () => api("/api/playlists"),
    duplicates: (playlistId, mode = "exact") => api(`/api/playlists/${playlistId}/duplicates?mode=${mode}`),
    removeDuplicates: (playlistId, mode = "exact", keepPositions = {}, removals = []) =>
      api(`/api/playlists/${playlistId}/remove-duplicates`, {
        method: "POST",
        body: JSON.stringify({ mode, keepPositions, removals }),
      }),
  };
}
