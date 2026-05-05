import { Search } from "lucide-react";
import { normalizeTrack } from "../../hooks/usePlaylistWorkspace.js";

export default function ManualSearchPanel({ spotify, workspace }) {
  const params = workspace.params;
  const update = (key, value) => workspace.updateParam(key, value);

  const run = async () => {
    workspace.setStatus("loading");
    try {
      const payload = await spotify.generousSearchTracks(params.query, params.limit);
      workspace.setResults((payload.tracks?.items || []).map(normalizeTrack));
    } catch (err) {
      workspace.fail(err.message);
    }
  };

  return (
    <div className="control-stack">
      <label className="control-label">
        Track Search
        <input
          value={params.query}
          onChange={(event) => update("query", event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") run();
          }}
          placeholder="song, artist, both"
        />
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
