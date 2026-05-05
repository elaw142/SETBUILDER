export default function TrackRow({ track, selected, onToggle, direct = false }) {
  return (
    <button type="button" className="track-row" onClick={() => onToggle(track)}>
      <span className={`track-check ${selected ? "selected" : ""}`}>{selected ? "X" : direct ? "+" : ""}</span>
      {track.image ? <img src={track.image} alt="" /> : <span className="track-image-fallback" />}
      <span className="min-w-0">
        <span className="block truncate font-bold">{track.name}</span>
        <span className="block truncate text-xs uppercase text-muted group-hover:text-bg/70">
          {track.artist} {track.year ? ` / ${track.year}` : ""}
        </span>
      </span>
    </button>
  );
}
