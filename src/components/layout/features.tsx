"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const features = [
  {
    title: "Gestion des Notes",
    description: "Suivi automatique des notes et des résultats scolaires.",
  },
  {
    title: "Présences",
    description: "Enregistrement et suivi des présences en temps réel.",
  },
  {
    title: "Paiements",
    description: "Gestion simplifiée des frais de scolarité et paiements.",
  },
  {
    title: "IA Intégrée",
    description: "Analyse intelligente des performances et recommandations.",
  },
  {
    title: "Communication",
    description: "Messaging parents-enseignants intégré dans la plateforme.",
  },
  {
    title: "Rapports",
    description: "Génération automatique de rapports d'établissement.",
  },
];

export function Features() {
  return (
    <section id="features" className="container mx-auto px-4 py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Fonctionnalités Principales</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Tout ce dont vous avez besoin pour gérer votre établissement scolaire
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <Card key={i} className="relative">
            <CardHeader>
              <CheckCircle2 className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-xl">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
