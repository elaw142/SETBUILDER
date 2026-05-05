import { useState } from "react";
import { Send } from "lucide-react";

export default function ExportBar({ user, playlistName, description, selectedTracks, createPlaylist }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const pushPlaylist = async () => {
    setBusy(true);
    setStatus("");
    try {
      const payload = await createPlaylist({
        name: playlistName,
        description,
        trackIds: selectedTracks.map((track) => track.id),
      });
      setStatus(`Pushed: ${payload.playlist?.external_urls?.spotify || payload.playlist?.name}`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-ink text-bg">
      <div className="mx-auto grid max-w-[1500px] items-center gap-3 px-4 py-3 md:grid-cols-[1fr_auto] lg:px-6">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="font-display text-5xl leading-none text-acid">{selectedTracks.length} TRACKS</span>
          <span className="text-xs uppercase text-bg/70">{status || "Selected tracks export in segment order"}</span>
        </div>
        <button
          className="flex min-h-14 items-center justify-center gap-2 border-2 border-acid bg-acid px-6 font-display text-3xl uppercase text-ink disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!user || selectedTracks.length === 0 || busy}
          onClick={pushPlaylist}
        >
          <Send size={22} strokeWidth={3} />
          {busy ? "Pushing" : "Push to Spotify"}
        </button>
      </div>
    </footer>
  );
}
