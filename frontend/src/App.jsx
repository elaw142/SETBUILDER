import { AlertTriangle, Check, RefreshCw, Scissors, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import PreviewPanel from "./components/PreviewPanel.jsx";
import { useSpotify } from "./hooks/useSpotify.js";

function normalizePreviewTrack(track) {
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: track.artist,
    year: track.year,
    image: track.image,
    previewUrl: "",
  };
}

function formatDuration(durationMs) {
  if (!durationMs) return "0:00";
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function App() {
  const spotify = useSpotify();
  const [playlists, setPlaylists] = useState([]);
  const [playlistId, setPlaylistId] = useState("");
  const [mode, setMode] = useState("exact");
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [previewTrack, setPreviewTrack] = useState(null);
  const [keepPositions, setKeepPositions] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedPlaylist = useMemo(() => playlists.find((playlist) => playlist.id === playlistId), [playlists, playlistId]);
  const eligiblePlaylists = useMemo(() => playlists.filter((playlist) => playlist.scanEligible), [playlists]);
  const pendingRemovals = useMemo(() => buildRemovalItems(analysis, keepPositions), [analysis, keepPositions]);

  useEffect(() => {
    if (!spotify.user) return;
    loadPlaylists();
  }, [spotify.user]);

  const loadPlaylists = async () => {
    setStatus("loading");
    setMessage("Loading playlists");
    try {
      const payload = await spotify.playlists();
      setPlaylists(payload.playlists || []);
      const firstEligible = payload.playlists?.find((playlist) => playlist.scanEligible);
      setPlaylistId((current) => {
        const currentPlaylist = payload.playlists?.find((playlist) => playlist.id === current);
        return currentPlaylist?.scanEligible ? current : firstEligible?.id || "";
      });
      setStatus("idle");
      setMessage(firstEligible ? "" : "No owned or collaborative playlists were found for this Spotify account.");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  const scan = async () => {
    if (!playlistId) return;
    if (!selectedPlaylist?.scanEligible) {
      setStatus("error");
      setMessage("Spotify only allows SIEVE to scan playlists owned by, or collaborative with, the connected account.");
      return;
    }
    setStatus("loading");
    setMessage(selectedPlaylist?.tracksTotal > 1000 ? `Scanning ${selectedPlaylist.tracksTotal} tracks. Large playlists can take a few minutes.` : "Scanning playlist");
    setAnalysis(null);
    try {
      const payload = await spotify.duplicates(playlistId, mode);
      setAnalysis(payload);
      setKeepPositions(Object.fromEntries((payload.groups || []).map((group) => [group.key, [group.keep.position]])));
      setStatus("idle");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  const remove = async () => {
    if (!playlistId || !analysis?.duplicateCount) return;
    setConfirmOpen(false);
    setStatus("loading");
    setMessage("Removing duplicate tracks");
    try {
      const payload = await spotify.removeDuplicates(playlistId, mode, keepPositions, pendingRemovals);
      setStatus("success");
      setMessage(`Removed ${payload.removedCount} duplicates. Scan again when you want a fresh report.`);
      setAnalysis(null);
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  const toggleKeeper = (groupKey, position) => {
    setKeepPositions((current) => {
      const currentPositions = current[groupKey] || [];
      const hasPosition = currentPositions.includes(position);
      if (hasPosition && currentPositions.length === 1) return current;
      const nextPositions = hasPosition ? currentPositions.filter((item) => item !== position) : [...currentPositions, position];
      return { ...current, [groupKey]: nextPositions.sort((a, b) => a - b) };
    });
  };

  const setGroupKeepers = (groupKey, positions) => {
    setKeepPositions((current) => ({ ...current, [groupKey]: positions }));
  };

  return (
    <main className="min-h-screen bg-bg pb-8 font-mono text-ink">
      <Header user={spotify.user} loading={spotify.loading} onConnect={spotify.connect} onLogout={spotify.logout} />

      <section className="mx-auto grid w-full max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[420px_1fr] lg:px-6">
        <aside className="workspace-panel p-4">
          <div className="mb-4 border-b-2 border-ink pb-3">
            <p className="font-display text-6xl leading-none">CONTROL</p>
            <p className="text-xs uppercase text-muted">Pick a playlist, inspect duplicates, then remove extras</p>
          </div>

          {!spotify.user && (
            <p className="empty-state">
              <ShieldCheck size={18} /> Connect Spotify to load your playlists.
            </p>
          )}

          {spotify.user && (
            <div className="control-stack">
              <label className="control-label">
                Playlist
                <select value={playlistId} onChange={(event) => setPlaylistId(event.target.value)}>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id} disabled={!playlist.scanEligible}>
                      {playlist.name} ({playlist.tracksTotal}){playlist.scanEligible ? "" : ` / owned by ${playlist.owner || "another account"}`}
                    </option>
                  ))}
                </select>
              </label>

              <p className="status-line">
                {eligiblePlaylists.length} of {playlists.length} playlists are owned by, or collaborative with, this Spotify account and can be scanned.
              </p>

              <div className="mode-tabs">
                <button className={mode === "exact" ? "active" : ""} onClick={() => setMode("exact")} type="button">
                  Exact
                </button>
                <button className={mode === "soft" ? "active" : ""} onClick={() => setMode("soft")} type="button">
                  Soft
                </button>
                <button onClick={loadPlaylists} type="button">
                  Refresh
                </button>
              </div>

              <button className="action-button" onClick={scan} disabled={!playlistId || !selectedPlaylist?.scanEligible || status === "loading"} type="button">
                <Search size={22} strokeWidth={3} /> Scan
              </button>
              <button className="action-button danger-button" onClick={() => setConfirmOpen(true)} disabled={!pendingRemovals.length || status === "loading"} type="button">
                <Scissors size={22} strokeWidth={3} /> Remove {pendingRemovals.length}
              </button>

              <p className="status-line">
                Exact mode matches identical Spotify tracks. Soft mode matches normalized title and primary artist.
              </p>
            </div>
          )}
        </aside>

        <section className="workspace-panel min-h-[620px] p-4">
          <div className="mb-3 flex items-baseline justify-between border-b-2 border-ink pb-2">
            <h2 className="font-display text-5xl">Duplicate Report</h2>
            <span className="text-xs uppercase text-muted">{analysis ? `${analysis.duplicateCount} extras` : "No scan"}</span>
          </div>

          {status === "loading" && (
            <div className="loading-card">
              <div className="loading-bar">
                <span />
              </div>
              <p className="font-display text-3xl">{message || "Working"}</p>
            </div>
          )}
          {status === "error" && <p className="status-error">{message}</p>}
          {status === "success" && <p className="status-line">{message}</p>}

          {!analysis && status !== "loading" && (
            <p className="empty-state">
              <RefreshCw size={18} /> Scan a playlist to see duplicate groups before anything is changed.
            </p>
          )}

          {analysis && analysis.duplicateCount === 0 && (
            <p className="status-line">
              <Check size={18} /> No duplicates found in {analysis.playlist.name}.
            </p>
          )}

          {analysis?.duplicateCount > 0 && (
            <div className="control-stack">
              <div className="report-strip">
                <span>{analysis.playlist.name}</span>
                <span>{analysis.groupCount} groups</span>
                <span>{pendingRemovals.length} selected</span>
                <span>{analysis.skippedCount} skipped</span>
              </div>
              {analysis.groups.map((group) => (
                <DuplicateGroup
                  key={group.key}
                  group={group}
                  keepPositions={keepPositions[group.key] || [group.keep.position]}
                  onToggleKeep={toggleKeeper}
                  onSetKeepers={setGroupKeepers}
                  onPreview={(track) => setPreviewTrack(normalizePreviewTrack(track))}
                />
              ))}
              <p className="status-line">
                <AlertTriangle size={18} /> Keep one, many, or all copies in each group. Pink rows will be removed.
              </p>
            </div>
          )}
        </section>
      </section>

      <PreviewPanel track={previewTrack} onClose={() => setPreviewTrack(null)} />
      {confirmOpen && analysis && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="duplicate-header">
              <span id="confirm-title">Remove extras</span>
              <button className="preview-button" onClick={() => setConfirmOpen(false)} type="button" aria-label="Close confirmation">
                <X size={16} />
              </button>
            </div>
            <p>
              Remove {pendingRemovals.length} duplicate tracks from {analysis.playlist.name}? Every row marked K will stay.
            </p>
            <div className="confirm-actions">
              <button type="button" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button className="danger-button" type="button" onClick={remove}>
                <Scissors size={18} /> Remove Extras
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function buildRemovalItems(analysis, keepPositions) {
  return (analysis?.groups || []).flatMap((group) => {
    const selectedPositions = new Set((keepPositions[group.key] || [group.keep.position]).map(Number));
    return [group.keep, ...group.remove]
      .filter((occurrence) => !selectedPositions.has(occurrence.position))
      .map((occurrence) => ({ uri: occurrence.track.uri }));
  });
}

function DuplicateGroup({ group, keepPositions, onToggleKeep, onSetKeepers, onPreview }) {
  const occurrences = [group.keep, ...group.remove];
  const keepSet = new Set(keepPositions);
  const allPositions = occurrences.map((occurrence) => occurrence.position);
  const allKept = occurrences.every((occurrence) => keepSet.has(occurrence.position));
  return (
    <div className="duplicate-group">
      <div className="duplicate-header">
        <span>{group.keep.track.name}</span>
        <span>{keepPositions.length} kept / {group.count} copies</span>
        <button className="mini-command" onClick={() => onSetKeepers(group.key, allKept ? [group.keep.position] : allPositions)} type="button">
          {allKept ? "Keep One" : "Keep All"}
        </button>
      </div>
      {occurrences.map((occurrence) => (
        <Occurrence
          key={`${occurrence.track.uri}-${occurrence.position}`}
          label={keepSet.has(occurrence.position) ? "Keep" : "Remove"}
          occurrence={occurrence}
          onKeep={() => onToggleKeep(group.key, occurrence.position)}
          onPreview={onPreview}
          keep={keepSet.has(occurrence.position)}
        />
      ))}
    </div>
  );
}

function Occurrence({ label, occurrence, onKeep, onPreview, keep = false }) {
  const track = occurrence.track;
  return (
    <div className={`occurrence-row ${keep ? "keep" : ""}`}>
      <button className={`track-check ${keep ? "selected" : ""}`} onClick={onKeep} type="button" aria-label={`Keep ${track.name}`}>
        {keep ? "K" : "X"}
      </button>
      {track.image ? <img src={track.image} alt="" /> : <span className="track-image-fallback" />}
      <span className="min-w-0">
        <span className="block truncate font-bold">{track.name}</span>
        <span className="block truncate text-xs uppercase text-muted">
          {track.artist} {track.year ? ` / ${track.year}` : ""} / {formatDuration(track.durationMs)} / {label}
        </span>
      </span>
      <button className="preview-button" onClick={() => onPreview(track)} type="button">
        <Search size={16} />
      </button>
    </div>
  );
}
