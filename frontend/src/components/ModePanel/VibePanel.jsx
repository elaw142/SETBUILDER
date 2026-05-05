import { Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { normalizeTrack } from "../../hooks/usePlaylistWorkspace.js";

export default function VibePanel({ spotify, workspace }) {
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState(null);

  const applyPlan = (nextPlan) => {
    if (nextPlan.genre) workspace.updateParam("genre", nextPlan.genre);
    if (nextPlan.yearStart) workspace.updateParam("yearStart", Number(nextPlan.yearStart));
    if (nextPlan.yearEnd) workspace.updateParam("yearEnd", Number(nextPlan.yearEnd));
    if (Array.isArray(nextPlan.seedGenres)) workspace.updateParam("seedGenres", nextPlan.seedGenres.slice(0, 3));
    if (nextPlan.manualQuery) workspace.updateParam("query", nextPlan.manualQuery);
  };

  const planVibe = async () => {
    workspace.setStatus("loading");
    try {
      const payload = await spotify.vibePlan(prompt);
      setPlan(payload.plan);
      applyPlan(payload.plan);
      workspace.setStatus("idle");
    } catch (err) {
      workspace.fail(err.message);
    }
  };

  const searchPlan = async () => {
    const variants = plan?.queryVariants || [];
    const query = variants[0] || workspace.params.query || prompt;
    workspace.setStatus("loading");
    try {
      const payload = await spotify.searchTracks(query, workspace.params.limit, true);
      workspace.setResults((payload.tracks?.items || []).map(normalizeTrack));
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
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) planVibe();
          }}
          placeholder="glossy 2012 tumblr pop, sad dancefloor, not too obvious"
        />
      </label>
      <label className="control-label">
        Results
        <input type="number" min="1" max="50" value={workspace.params.limit} onChange={(event) => workspace.updateParam("limit", Number(event.target.value))} />
      </label>
      <button className="action-button" onClick={planVibe} disabled={!prompt.trim()}>
        <Wand2 size={22} strokeWidth={3} /> Plan Vibe
      </button>
      {plan && (
        <div className="plan-card">
          <p className="font-display text-3xl">AI Search Plan</p>
          <p>{plan.notes || "Plan ready."}</p>
          <button className="action-button mt-3" onClick={searchPlan}>
            <Sparkles size={22} strokeWidth={3} /> Search Plan
          </button>
        </div>
      )}
    </div>
  );
}
