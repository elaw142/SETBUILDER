import { useMemo, useState } from "react";

const starterParams = {
  seedArtists: [],
  seedGenres: [],
  energy: [0.35, 0.9],
  valence: [0.25, 0.85],
  danceability: [0.35, 0.95],
  tempo: [80, 170],
  limit: 30,
  genre: "pop",
  yearStart: 2010,
  yearEnd: 2019,
  query: "",
};

function makeSegment(index = 0) {
  return {
    id: crypto.randomUUID(),
    name: index === 0 ? "Opening Voltage" : `Vibe Segment ${index + 1}`,
    mode: "recommendations",
    collapsed: false,
    params: { ...starterParams },
    pool: [],
    selected: [],
    status: "idle",
    error: "",
  };
}

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

export function useSegments() {
  const [segments, setSegments] = useState([makeSegment(0)]);

  const updateSegment = (id, updater) => {
    setSegments((current) =>
      current.map((segment) => (segment.id === id ? { ...segment, ...updater(segment) } : segment)),
    );
  };

  const addSegment = () => setSegments((current) => [...current, makeSegment(current.length)]);
  const removeSegment = (id) => setSegments((current) => current.filter((segment) => segment.id !== id));

  const updateParam = (id, key, value) => {
    updateSegment(id, (segment) => ({
      params: { ...segment.params, [key]: value },
    }));
  };

  const setPool = (id, tracks) => {
    updateSegment(id, () => ({
      pool: tracks,
      status: "idle",
      error: "",
    }));
  };

  const setStatus = (id, status, error = "") => {
    updateSegment(id, () => ({ status, error }));
  };

  const toggleTrack = (id, track) => {
    updateSegment(id, (segment) => {
      const selected = segment.selected.some((item) => item.id === track.id)
        ? segment.selected.filter((item) => item.id !== track.id)
        : [...segment.selected, track];
      return { selected };
    });
  };

  const selectedTracks = useMemo(() => segments.flatMap((segment) => segment.selected), [segments]);

  return {
    segments,
    selectedTracks,
    addSegment,
    removeSegment,
    updateSegment,
    updateParam,
    setPool,
    setStatus,
    toggleTrack,
  };
}
