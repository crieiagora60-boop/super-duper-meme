import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import Editor from "@/components/editor/Editor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Worder Effect — Editor de vídeo com IA" },
      { name: "description", content: "Editor de vídeo com 520 efeitos, Time Remap, Twixtor, upscaler 4x com IA e importação de presets .ffx do After Effects." },
      { property: "og:title", content: "Worder Effect — Editor de vídeo com IA" },
      { property: "og:description", content: "520 efeitos, Time Remap, Twixtor, Topaz IA e importação .ffx." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div className="h-screen bg-background" />}>
      <Editor />
    </ClientOnly>
  ),
});
