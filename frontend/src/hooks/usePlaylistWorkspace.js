import { useMemo, useState } from "react";

export const starterParams = {
  seedArtists: [],
  seedGenres: [],
  genre: "pop",
  yearStart: 2010,
  yearEnd: 2019,
  query: "",
  limit: 30,
};

export function normalizeTrack(track) {
  const album = track.album || {};
  const artists = track.artists || [];
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: artists.map((artist) => artist.name).join(", "),
    year: album.release_date ? album.release_date.slice(0, 4) : "",
    image: album.images?.at(-1)?.url || album.images?.[0]?.url || "",
    popularity: track.popularity || 0,
  };
}

export function usePlaylistWorkspace() {
  const [mode, setMode] = useState("vibe");
  const [params, setParams] = useState(starterParams);
  const [pool, setPool] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [previewTrack, setPreviewTrack] = useState(null);

  const updateParam = (key, value) => setParams((current) => ({ ...current, [key]: value }));

  const setResults = (tracks) => {
    setPool(tracks);
    setStatus("idle");
    setError("");
  };

  const fail = (message) => {
    setStatus("error");
    setError(message);
  };

  const toggleTrack = (track) => {
    setPlaylist((current) =>
      current.some((item) => item.id === track.id)
        ? current.filter((item) => item.id !== track.id)
        : [...current, track],
    );
  };

  const removeTrack = (trackId) => setPlaylist((current) => current.filter((track) => track.id !== trackId));
  const clearPlaylist = () => setPlaylist([]);

  const selectedIds = useMemo(() => new Set(playlist.map((track) => track.id)), [playlist]);

  return {
    mode,
    setMode,
    params,
    updateParam,
    pool,
    playlist,
    selectedIds,
    status,
    setStatus,
    error,
    setResults,
    fail,
    toggleTrack,
    removeTrack,
    clearPlaylist,
    previewTrack,
    setPreviewTrack,
  };
}
