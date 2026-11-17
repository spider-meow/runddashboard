import type { NextConfig } from "next";

const config: NextConfig = {
  // Import de fichiers GPX/FIT par formulaire : la limite par défaut (1 Mo) est trop basse.
  // 4 Mo, car Vercel plafonne de toute façon le corps d'une requête à 4,5 Mo.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default config;
