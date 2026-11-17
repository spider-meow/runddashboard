import type { NextConfig } from "next";

const config: NextConfig = {
  // Import de fichiers GPX/FIT par formulaire : la limite par défaut (1 Mo) est trop basse pour un FIT.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default config;
