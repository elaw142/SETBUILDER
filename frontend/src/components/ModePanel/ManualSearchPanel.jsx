import { Search } from "lucide-react";
import { normalizeTrack } from "../../hooks/useSegments.js";

export default function ManualSearchPanel({ segment, spotify, segmentsApi }) {
  const params = segment.params;
  const update = (key, value) => segmentsApi.updateParam(segment.id, key, value);

  const run = async () => {
    segmentsApi.setStatus(segment.id, "loading");
    try {
      const payload = await spotify.searchTracks(params.query, params.limit);
      segmentsApi.setPool(segment.id, (payload.tracks?.items || []).map(normalizeTrack));
    } catch (err) {
      segmentsApi.setStatus(segment.id, "error", err.message);
    }
  };

  return (
    <div className="control-stack">
      <label className="control-label">
        Track Search
        <input value={params.query} onChange={(event) => update("query", event.target.value)} placeholder="song, artist, both" />
      </label>
      <label className="control-label">
        Results
        <input type="number" min="1" max="50" value={params.limit} onChange={(event) => update("limit", Number(event.target.value))} />
      </label>
      <button className="action-button" onClick={run}>
        <Search size={22} strokeWidth={3} /> Search Tracks
      </button>
    </div>
  );
}
