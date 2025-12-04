export default function SchoolNotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-4 text-destructive">École non trouvée</h1>
      <p>Désolé, nous n'avons pas pu trouver l'école associée à ce sous-domaine.</p>
      <p>Veuillez vérifier l'adresse ou retourner à la page d'accueil.</p>
      <a href="/" className="text-primary hover:underline mt-4 inline-block">
        Retour à l'accueil
      </a>
    </div>
  );
}
