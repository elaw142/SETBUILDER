import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import ExportBar from "./components/ExportBar.jsx";
import Header from "./components/Header.jsx";
import SegmentCard from "./components/SegmentCard.jsx";
import { useSegments } from "./hooks/useSegments.js";
import { useSpotify } from "./hooks/useSpotify.js";

export default function App() {
  const spotify = useSpotify();
  const segmentsApi = useSegments();
  const [playlistName, setPlaylistName] = useState("SETBUILDER TRANSMISSION");
  const [description, setDescription] = useState("Built from curated SETBUILDER vibe segments.");

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

      <section className="mx-auto grid w-full max-w-[1500px] gap-4 px-4 py-4 lg:px-6">
        {segmentsApi.segments.map((segment, index) => (
          <SegmentCard
            key={segment.id}
            index={index}
            segment={segment}
            genres={spotify.genres}
            spotify={spotify}
            segmentsApi={segmentsApi}
          />
        ))}

        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={segmentsApi.addSegment}
          className="brutal-button flex min-h-16 items-center justify-center gap-3 border-2 border-ink bg-acid px-5 py-4 font-display text-4xl uppercase"
        >
          <Plus size={30} strokeWidth={3} />
          Add Segment
        </motion.button>
      </section>

      <ExportBar
        user={spotify.user}
        playlistName={playlistName}
        description={description}
        selectedTracks={segmentsApi.selectedTracks}
        createPlaylist={spotify.createPlaylist}
      />
    </main>
  );
}
