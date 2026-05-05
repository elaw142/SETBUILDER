import { Play } from "lucide-react";

export default function TrackRow({ track, selected, onToggle, onPreview, direct = false, compact = false }) {
  return (
    <div className={`track-row ${compact ? "compact" : ""}`} onClick={() => onToggle(track)}>
      <span className={`track-check ${selected ? "selected" : ""}`}>{selected ? "X" : direct ? "+" : ""}</span>
      {track.image ? <img src={track.image} alt="" /> : <span className="track-image-fallback" />}
      <span className="min-w-0">
        <span className="block truncate font-bold">{track.name}</span>
        <span className="block truncate text-xs uppercase text-muted group-hover:text-bg/70">
          {track.artist} {track.year ? ` / ${track.year}` : ""}
        </span>
      </span>
      <button
        type="button"
        className="preview-button"
        onClick={(event) => {
          event.stopPropagation();
          onPreview?.(track);
        }}
      >
        <Play size={16} />
      </button>
    </div>
  );
}
