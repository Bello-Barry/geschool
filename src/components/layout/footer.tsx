"use client";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4">GESchool</h3>
            <p className="text-sm text-muted-foreground">
              La plateforme de gestion scolaire pour le Congo-Brazzaville.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Produit</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary">Fonctionnalités</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Tarification</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Sécurité</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary">Conditions</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Confidentialité</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:info@geschool.cd" className="text-muted-foreground hover:text-primary">info@geschool.cd</a></li>
              <li><a href="tel:+242" className="text-muted-foreground hover:text-primary">+242 (Congo)</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GESchool. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
