import type { NextConfig } from "next";

const config: NextConfig = {
  // Dev seulement : autorise 127.0.0.1 (le navigateur de test garde ses cookies de session sur cette adresse, séparés de localhost).
  allowedDevOrigins: ["127.0.0.1"],
  // Import de fichiers GPX/FIT par formulaire : la limite par défaut (1 Mo) est trop basse.
  // 4 Mo, car Vercel plafonne de toute façon le corps d'une requête à 4,5 Mo.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default config;
