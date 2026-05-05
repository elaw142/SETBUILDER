import { X } from "lucide-react";

export default function PreviewPanel({ track, onClose }) {
  if (!track) return null;

  return (
    <div className="preview-panel">
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink p-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{track.name}</p>
          <p className="truncate text-xs uppercase text-muted">{track.artist}</p>
        </div>
        <button className="square-button" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <iframe
        title={`Spotify preview: ${track.name}`}
        src={`https://open.spotify.com/embed/track/${track.id}`}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}
