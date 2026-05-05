import { Radio } from "lucide-react";
import { normalizeTrack } from "../../hooks/usePlaylistWorkspace.js";

export default function EraSearchPanel({ spotify, workspace }) {
  const params = workspace.params;
  const update = (key, value) => workspace.updateParam(key, value);

  const run = async () => {
    workspace.setStatus("loading");
    try {
      const payload = await spotify.eraSearch({
        genre: params.genre,
        yearStart: params.yearStart,
        yearEnd: params.yearEnd,
        limit: params.limit,
      });
      const tracks = (payload.tracks?.items || [])
        .map(normalizeTrack)
        .sort((a, b) => b.popularity - a.popularity);
      workspace.setResults(tracks);
    } catch (err) {
      workspace.fail(err.message);
    }
  };

  return (
    <div className="control-stack">
      <label className="control-label">
        Genre Tag
        <input value={params.genre} onChange={(event) => update("genre", event.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="control-label">
          From
          <input type="number" value={params.yearStart} onChange={(event) => update("yearStart", Number(event.target.value))} />
        </label>
        <label className="control-label">
          To
          <input type="number" value={params.yearEnd} onChange={(event) => update("yearEnd", Number(event.target.value))} />
        </label>
      </div>
      <label className="control-label">
        Results
        <input type="number" min="1" max="50" value={params.limit} onChange={(event) => update("limit", Number(event.target.value))} />
      </label>
      <button className="action-button" onClick={run}>
        <Radio size={22} strokeWidth={3} /> Search / Refresh Era
      </button>
    </div>
  );
}
