// Squelette affiché tout de suite pendant qu'une page se charge : la navigation répond au clic au lieu d'attendre la base.
export default function Loading() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Chargement">
      <div className="sk sk-title" />
      <div className="grid">
        <div className="card sk sk-card" data-size="xl" />
        <div className="card sk sk-card" data-size="m" />
        <div className="card sk sk-card" data-size="m" />
      </div>
    </div>
  );
}
