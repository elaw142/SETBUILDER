import { Sparkles } from "lucide-react";
import EraSearchPanel from "./ModePanel/EraSearchPanel.jsx";
import ManualSearchPanel from "./ModePanel/ManualSearchPanel.jsx";
import RecommendationsPanel from "./ModePanel/RecommendationsPanel.jsx";
import VibePanel from "./ModePanel/VibePanel.jsx";
import TrackRow from "./TrackRow.jsx";

const modes = [
  ["vibe", "Vibe"],
  ["recommendations", "Seeds"],
  ["era", "Era"],
  ["manual", "Manual"],
];

export default function DiscoveryWorkspace({ genres, spotify, workspace }) {
  const panelProps = { genres, spotify, workspace };

  return (
    <section className="mx-auto grid w-full max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[420px_1fr_360px] lg:px-6">
      <aside className="workspace-panel p-4">
        <div className="mb-4 border-b-2 border-ink pb-3">
          <p className="font-display text-6xl leading-none">DISCOVERY</p>
          <p className="text-xs uppercase text-muted">Find candidates, then keep the good ones</p>
        </div>
        <div className="mode-tabs four-tabs">
          {modes.map(([key, label]) => (
            <button key={key} className={workspace.mode === key ? "active" : ""} onClick={() => workspace.setMode(key)}>
              {label}
            </button>
          ))}
        </div>

        {workspace.mode === "vibe" && <VibePanel {...panelProps} />}
        {workspace.mode === "recommendations" && <RecommendationsPanel {...panelProps} />}
        {workspace.mode === "era" && <EraSearchPanel {...panelProps} />}
        {workspace.mode === "manual" && <ManualSearchPanel {...panelProps} />}
      </aside>

      <section className="workspace-panel min-h-[520px] p-4">
        <div className="mb-3 flex items-baseline justify-between border-b-2 border-ink pb-2">
          <h2 className="font-display text-5xl">Candidate Pool</h2>
          <span className="text-xs uppercase text-muted">{workspace.pool.length} found</span>
        </div>
        {workspace.error && <p className="status-error">{workspace.error}</p>}
        {workspace.status === "loading" && <p className="status-line">Tuning antenna...</p>}
        <div className="track-list">
          {workspace.pool.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              selected={workspace.selectedIds.has(track.id)}
              onToggle={workspace.toggleTrack}
              onPreview={workspace.setPreviewTrack}
            />
          ))}
          {workspace.pool.length === 0 && workspace.status !== "loading" && (
            <p className="empty-state">
              <Sparkles size={18} /> Use vibe, seed, era, or manual search to build a candidate pool.
            </p>
          )}
        </div>
      </section>

      <aside className="workspace-panel p-4">
        <div className="mb-3 flex items-baseline justify-between border-b-2 border-ink pb-2">
          <h2 className="font-display text-5xl">Playlist Tray</h2>
          <span className="text-xs uppercase text-muted">{workspace.playlist.length} kept</span>
        </div>
        <div className="track-list tray-list">
          {workspace.playlist.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              selected
              onToggle={() => workspace.removeTrack(track.id)}
              onPreview={workspace.setPreviewTrack}
              compact
            />
          ))}
          {workspace.playlist.length === 0 && <p className="empty-state">Tracks you keep stay visible here.</p>}
        </div>
      </aside>
    </section>
  );
}
