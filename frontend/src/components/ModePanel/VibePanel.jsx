import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeTrack } from "../../hooks/usePlaylistWorkspace.js";

const loadingSteps = [
  "Reading the prompt...",
  "Checking Spotify candidates...",
  "Balancing the results...",
];

export default function VibePanel({ spotify, workspace }) {
  const [prompt, setPrompt] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [lastSearch, setLastSearch] = useState(null);
  const isVibeLoading = workspace.status === "loading" && workspace.mode === "vibe";

  useEffect(() => {
    if (!isVibeLoading) return undefined;
    setLoadingStep(0);
    const timer = window.setInterval(() => {
      setLoadingStep((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 2400);
    return () => window.clearInterval(timer);
  }, [isVibeLoading]);

  useEffect(() => {
    if (isVibeLoading) {
      workspace.setLoadingMessage(loadingSteps[loadingStep]);
    }
  }, [isVibeLoading, loadingStep, workspace.setLoadingMessage]);

  const runSearch = async () => {
    workspace.setStatus("loading");
    workspace.setLoadingMessage(loadingSteps[0]);
    setLastSearch(null);
    try {
      const payload = await spotify.vibeSearch(prompt, workspace.params.limit);
      workspace.setResults((payload.tracks?.items || []).map(normalizeTrack));
      setLastSearch({
        count: payload.tracks?.items?.length || 0,
        artists: payload.matchedArtists?.map((artist) => artist.name).slice(0, 6) || [],
      });
    } catch (err) {
      workspace.fail(err.message);
    }
  };

  return (
    <div className="control-stack">
      <label className="control-label">
        Vibe Prompt
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) runSearch();
          }}
          placeholder="ericdoa, glaive, juno, kmoe, brakence, quadeca"
        />
      </label>
      <label className="control-label">
        Results
        <input type="number" min="1" max="50" value={workspace.params.limit} onChange={(event) => workspace.updateParam("limit", Number(event.target.value))} />
      </label>
      <button className="action-button" onClick={runSearch} disabled={!prompt.trim() || isVibeLoading}>
        <Sparkles size={22} strokeWidth={3} /> {isVibeLoading ? "Searching..." : "Find Songs"}
      </button>
      {isVibeLoading && (
        <div className="loading-card">
          <div className="loading-bar">
            <span />
          </div>
          <p className="font-display text-3xl">{loadingSteps[loadingStep]}</p>
          <p>Spotify can throttle bursts of searches, so this now asks for a smaller first pass.</p>
        </div>
      )}
      {lastSearch && lastSearch.count > 0 && (
        <p className="status-line">
          Found {lastSearch.count} tracks{lastSearch.artists.length ? ` using ${lastSearch.artists.join(", ")}` : ""}.
        </p>
      )}
    </div>
  );
}
