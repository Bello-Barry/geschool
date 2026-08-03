"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-100">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-10">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="text-2xl font-bold font-heading flex items-center gap-1">
              <span className="text-brand-500 text-3xl">GE</span>
              <span className="text-marine-900">School</span>
            </Link>
            <p className="text-sm text-neutral-600 leading-relaxed max-w-xs">
              La plateforme de référence pour la gestion scolaire au Congo-Brazzaville. Simple, intelligente et moderne.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-marine-900 text-sm tracking-wider uppercase mb-4">
              Produit
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/#features" className="text-neutral-600 hover:text-brand-500 transition-colors font-medium">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed font-medium">
                  Tarification
                </span>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed font-medium">
                  Sécurité
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-marine-900 text-sm tracking-wider uppercase mb-4">
              Légal
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <span className="text-neutral-400 cursor-not-allowed font-medium">
                  Conditions
                </span>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed font-medium">
                  Confidentialité
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-marine-900 text-sm tracking-wider uppercase mb-4">
              Contact
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="mailto:info@geschool.cd"
                  className="text-neutral-600 hover:text-brand-500 transition-colors font-medium break-all"
                >
                  info@geschool.cd
                </a>
              </li>
              <li className="text-neutral-600 font-medium">
                +242 (Congo)
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-neutral-600 font-medium text-center sm:text-left">
            © {new Date().getFullYear()} GESchool. Tous droits réservés. Conçu pour l'excellence éducative.
          </p>
          <div className="flex gap-4 text-xs sm:text-sm text-neutral-500">
            <span className="font-medium">Version 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
