import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import EraSearchPanel from "./ModePanel/EraSearchPanel.jsx";
import ManualSearchPanel from "./ModePanel/ManualSearchPanel.jsx";
import RecommendationsPanel from "./ModePanel/RecommendationsPanel.jsx";
import TrackRow from "./TrackRow.jsx";

const modes = [
  ["recommendations", "Recommendations"],
  ["era", "Era Search"],
  ["manual", "Manual"],
];

export default function SegmentCard({ segment, index, genres, spotify, segmentsApi }) {
  const panelProps = { segment, genres, spotify, segmentsApi };

  return (
    <motion.article layout transition={{ type: "spring", stiffness: 600, damping: 45 }} className="segment-card">
      <div className="grid gap-3 border-b-2 border-ink p-4 md:grid-cols-[160px_1fr_auto] md:items-center">
        <p className="font-display text-6xl leading-none text-hot">#{String(index + 1).padStart(2, "0")}</p>
        <input
          className="segment-title"
          value={segment.name}
          onChange={(event) => segmentsApi.updateSegment(segment.id, () => ({ name: event.target.value }))}
        />
        <div className="flex gap-2">
          <button className="square-button" onClick={() => segmentsApi.updateSegment(segment.id, () => ({ collapsed: !segment.collapsed }))}>
            {segment.collapsed ? <ChevronDown /> : <ChevronUp />}
          </button>
          <button className="square-button" onClick={() => segmentsApi.removeSegment(segment.id)}>
            <Trash2 />
          </button>
        </div>
      </div>

      {!segment.collapsed && (
        <div className="grid lg:grid-cols-[390px_1fr]">
          <aside className="border-b-2 border-ink p-4 lg:border-b-0 lg:border-r-2">
            <div className="mode-tabs">
              {modes.map(([key, label]) => (
                <button
                  key={key}
                  className={segment.mode === key ? "active" : ""}
                  onClick={() => segmentsApi.updateSegment(segment.id, () => ({ mode: key }))}
                >
                  {label}
                </button>
              ))}
            </div>

            {segment.mode === "recommendations" && <RecommendationsPanel {...panelProps} />}
            {segment.mode === "era" && <EraSearchPanel {...panelProps} />}
            {segment.mode === "manual" && <ManualSearchPanel {...panelProps} />}
          </aside>

          <section className="min-h-[320px] p-4">
            <div className="mb-3 flex items-baseline justify-between border-b-2 border-ink pb-2">
              <h2 className="font-display text-4xl">Track Pool</h2>
              <span className="text-xs uppercase text-muted">{segment.selected.length} selected</span>
            </div>
            {segment.error && <p className="status-error">{segment.error}</p>}
            {segment.status === "loading" && <p className="status-line">Tuning antenna...</p>}
            <div className="track-list">
              {segment.pool.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  selected={segment.selected.some((item) => item.id === track.id)}
                  onToggle={(item) => segmentsApi.toggleTrack(segment.id, item)}
                />
              ))}
              {segment.pool.length === 0 && segment.status !== "loading" && <p className="empty-state">Run a search to build this segment's candidate pool.</p>}
            </div>
          </section>
        </div>
      )}
    </motion.article>
  );
}
