import { Search, X, Zap } from "lucide-react";
import { useState } from "react";
import { normalizeTrack } from "../../hooks/usePlaylistWorkspace.js";

export default function RecommendationsPanel({ genres, spotify, workspace }) {
  const params = workspace.params;
  const [artistQuery, setArtistQuery] = useState("");
  const [artistResults, setArtistResults] = useState([]);
  const update = (key, value) => workspace.updateParam(key, value);

  const run = async () => {
    workspace.setStatus("loading");
    try {
      const payload = await spotify.recommendations({
        limit: params.limit,
        seed_artist_ids: params.seedArtists.map((artist) => artist.id).join(","),
        seed_artist_names: params.seedArtists.map((artist) => artist.name).join(","),
        seed_genres: params.seedGenres.join(","),
      });
      workspace.setResults((payload.tracks?.items || []).map(normalizeTrack));
    } catch (err) {
      workspace.fail(err.message);
    }
  };

  const findArtists = async () => {
    if (!artistQuery.trim()) return;
    const payload = await spotify.searchArtists(artistQuery);
    setArtistResults(payload.artists?.items || []);
  };

  const addArtist = (artist) => {
    if (params.seedArtists.some((item) => item.id === artist.id)) return;
    update("seedArtists", [...params.seedArtists, { id: artist.id, name: artist.name }]);
    setArtistQuery("");
    setArtistResults([]);
  };

  const removeArtist = (artistId) => {
    update(
      "seedArtists",
      params.seedArtists.filter((artist) => artist.id !== artistId),
    );
  };

  return (
    <div className="control-stack">
      <div className="control-label">
        Seed Artists
        <div className="flex gap-2">
          <input
            value={artistQuery}
            onChange={(event) => setArtistQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") findArtists();
            }}
            placeholder="search artist name"
          />
          <button className="square-button shrink-0" onClick={findArtists} type="button">
            <Search size={20} />
          </button>
        </div>
        {params.seedArtists.length > 0 && (
          <div className="chip-row">
            {params.seedArtists.map((artist) => (
              <button key={artist.id} type="button" className="artist-chip" onClick={() => removeArtist(artist.id)}>
                {artist.name}
                <X size={14} />
              </button>
            ))}
          </div>
        )}
        {artistResults.length > 0 && (
          <div className="artist-results">
            {artistResults.slice(0, 5).map((artist) => (
              <button key={artist.id} type="button" onClick={() => addArtist(artist)}>
                {artist.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="control-label">
        Seed Genres
        <select
          value=""
          onChange={(event) => {
            const genre = event.target.value;
            if (genre && !params.seedGenres.includes(genre)) update("seedGenres", [...params.seedGenres, genre]);
          }}
        >
          <option value="">Add a genre</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        {params.seedGenres.length > 0 && (
          <div className="chip-row">
            {params.seedGenres.map((genre) => (
              <button key={genre} type="button" className="artist-chip" onClick={() => update("seedGenres", params.seedGenres.filter((item) => item !== genre))}>
                {genre}
                <X size={14} />
              </button>
            ))}
          </div>
        )}
      </div>
      <label className="control-label">
        Results
        <input type="number" min="1" max="50" value={params.limit} onChange={(event) => update("limit", Number(event.target.value))} />
      </label>
      <button className="action-button" onClick={run}>
        <Zap size={22} strokeWidth={3} /> Build Pool
      </button>
    </div>
  );
}
