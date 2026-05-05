import { useState } from "react";
import DiscoveryWorkspace from "./components/DiscoveryWorkspace.jsx";
import ExportBar from "./components/ExportBar.jsx";
import Header from "./components/Header.jsx";
import PreviewPanel from "./components/PreviewPanel.jsx";
import { usePlaylistWorkspace } from "./hooks/usePlaylistWorkspace.js";
import { useSpotify } from "./hooks/useSpotify.js";

export default function App() {
  const spotify = useSpotify();
  const workspace = usePlaylistWorkspace();
  const [playlistName, setPlaylistName] = useState("SETBUILDER TRANSMISSION");
  const [description, setDescription] = useState("Built with SETBUILDER.");

  return (
    <main className="min-h-screen bg-bg pb-28 font-mono text-ink">
      <Header
        user={spotify.user}
        loading={spotify.loading}
        playlistName={playlistName}
        description={description}
        onPlaylistName={setPlaylistName}
        onDescription={setDescription}
        onConnect={spotify.connect}
        onLogout={spotify.logout}
      />

      <DiscoveryWorkspace genres={spotify.genres} spotify={spotify} workspace={workspace} />
      <PreviewPanel track={workspace.previewTrack} onClose={() => workspace.setPreviewTrack(null)} />

      <ExportBar
        user={spotify.user}
        playlistName={playlistName}
        description={description}
        selectedTracks={workspace.playlist}
        createPlaylist={spotify.createPlaylist}
      />
    </main>
  );
}
