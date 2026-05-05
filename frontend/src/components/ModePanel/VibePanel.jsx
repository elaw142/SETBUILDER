import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeTrack } from "../../hooks/usePlaylistWorkspace.js";

const loadingSteps = [
  "Reading the prompt...",
  "Search job started...",
  "Waiting for Spotify...",
];

function formatRetry(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 90) return `${Math.round(value)} seconds`;
  const minutes = Math.round(value / 60);
  if (minutes < 90) return `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return `${hours} hours`;
}

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
      const started = await spotify.vibeSearch(prompt, workspace.params.limit);
      const payload = isTerminalJob(started) ? started.result : await waitForJob(started.id);
      workspace.setResults((payload.tracks?.items || []).map(normalizeTrack));
      if (payload.rateLimited) {
        const waitTime = formatRetry(payload.retryAfter);
        const retryText = waitTime ? ` Spotify says to wait about ${waitTime} before trying again.` : " Spotify is cooling this app down for a moment.";
        workspace.fail(`Spotify rate limited the search.${retryText}`);
        return;
      }
      setLastSearch({
        count: payload.tracks?.items?.length || 0,
        artists: payload.matchedArtists?.map((artist) => artist.name).slice(0, 6) || [],
      });
    } catch (err) {
      workspace.fail(err.message);
    }
  };

  const waitForJob = async (jobId) => {
    if (!jobId) throw new Error("Vibe search did not start.");
    const delays = [1500, 4000, 8000, 15000, 30000];
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delays[attempt]));
      const job = await spotify.vibeSearchJob(jobId);
      if (job.message) workspace.setLoadingMessage(job.message);
      if (isTerminalJob(job)) return job.result;
      if (job.status === "error") throw new Error(job.message || job.error?.error || "Vibe search failed.");
    }
    throw new Error("Spotify is still taking too long. Try again later instead of keeping this page polling.");
  };

  const isTerminalJob = (job) => job?.status === "complete" || job?.status === "rate_limited";

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
          <p>The search runs in the background now, so slow Spotify responses will not break the page.</p>
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
