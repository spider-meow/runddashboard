// Étiquette unique des lectures en base mises en cache (voir queries.ts). Un seul propriétaire, peu de données :
// invalider tout d'un coup après une écriture est plus simple et plus sûr que d'étiqueter finement.
export const DATA_TAG = "data";
// Filet de sécurité si une invalidation était manquée (écriture directe en base, par exemple). 10 minutes.
export const DATA_TTL = 600;
// Calibrage du relief : un jour. Les écritures ne l'invalident pas (voir queries.ts).
export const CALIB_TAG = "calibration";
export const CALIB_TTL = 86400;
