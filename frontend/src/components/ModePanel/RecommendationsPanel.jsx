import { Zap } from "lucide-react";
import SliderField from "./SliderField.jsx";
import { normalizeTrack } from "../../hooks/useSegments.js";

export default function RecommendationsPanel({ segment, genres, spotify, segmentsApi }) {
  const params = segment.params;
  const update = (key, value) => segmentsApi.updateParam(segment.id, key, value);

  const run = async () => {
    segmentsApi.setStatus(segment.id, "loading");
    try {
      const payload = await spotify.recommendations({
        limit: params.limit,
        seed_artists: params.seedArtists,
        seed_genres: params.seedGenres.join(","),
        min_energy: params.energy[0],
        max_energy: params.energy[1],
        min_valence: params.valence[0],
        max_valence: params.valence[1],
        min_danceability: params.danceability[0],
        max_danceability: params.danceability[1],
        min_tempo: params.tempo[0],
        max_tempo: params.tempo[1],
      });
      segmentsApi.setPool(segment.id, (payload.tracks || []).map(normalizeTrack));
    } catch (err) {
      segmentsApi.setStatus(segment.id, "error", err.message);
    }
  };

  return (
    <div className="control-stack">
      <label className="control-label">
        Seed Artist IDs
        <input value={params.seedArtists} onChange={(event) => update("seedArtists", event.target.value)} placeholder="comma,separated,spotify,ids" />
      </label>
      <label className="control-label">
        Seed Genres
        <select value={params.seedGenres[0] || ""} onChange={(event) => update("seedGenres", event.target.value ? [event.target.value] : [])}>
          <option value="">Choose a genre</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </label>
      <SliderField label="Energy" value={params.energy} onChange={(value) => update("energy", value)} />
      <SliderField label="Valence" value={params.valence} onChange={(value) => update("valence", value)} />
      <SliderField label="Danceability" value={params.danceability} onChange={(value) => update("danceability", value)} />
      <SliderField label="Tempo" value={params.tempo} min={50} max={220} step={1} onChange={(value) => update("tempo", value)} />
      <label className="control-label">
        Results
        <input type="number" min="1" max="10" value={params.limit} onChange={(event) => update("limit", Number(event.target.value))} />
      </label>
      <button className="action-button" onClick={run}>
        <Zap size={22} strokeWidth={3} /> Build Pool
      </button>
    </div>
  );
}
