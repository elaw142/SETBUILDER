import { Radio } from "lucide-react";
import { normalizeTrack } from "../../hooks/useSegments.js";
import SliderField from "./SliderField.jsx";

export default function EraSearchPanel({ segment, spotify, segmentsApi }) {
  const params = segment.params;
  const update = (key, value) => segmentsApi.updateParam(segment.id, key, value);

  const run = async () => {
    segmentsApi.setStatus(segment.id, "loading");
    try {
      const query = `genre:${params.genre} year:${params.yearStart}-${params.yearEnd}`;
      const payload = await spotify.searchTracks(query, params.limit);
      const tracks = (payload.tracks?.items || [])
        .map(normalizeTrack)
        .sort((a, b) => b.popularity - a.popularity);
      segmentsApi.setPool(segment.id, tracks);
    } catch (err) {
      segmentsApi.setStatus(segment.id, "error", err.message);
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
      <SliderField label="Energy Sort Bias" value={params.energy} onChange={(value) => update("energy", value)} />
      <SliderField label="Valence Sort Bias" value={params.valence} onChange={(value) => update("valence", value)} />
      <label className="control-label">
        Results
        <input type="number" min="1" max="10" value={params.limit} onChange={(event) => update("limit", Number(event.target.value))} />
      </label>
      <button className="action-button" onClick={run}>
        <Radio size={22} strokeWidth={3} /> Search Era
      </button>
    </div>
  );
}
