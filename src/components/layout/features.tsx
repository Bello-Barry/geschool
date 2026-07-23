"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  CreditCard,
  Bot,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";

const features = [
  {
    title: "Gestion des Notes",
    description: "Saisie rapide, calcul automatique des moyennes et génération des bulletins. Plus besoin de Excel.",
    icon: ClipboardCheck,
    color: "from-orange-500 to-amber-600",
    bgLight: "bg-orange-50 dark:bg-orange-950/20",
  },
  {
    title: "Présences",
    description: "Appel en un clic, suivi en temps réel et rapports d&apos;absentéisme pour chaque classe.",
    icon: Users,
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  {
    title: "Paiements",
    description: "Frais de scolarité, suivi des impayés et reçus automatiques. Tranquillité financière.",
    icon: CreditCard,
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 dark:bg-violet-950/20",
  },
  {
    title: "Intelligence Artificielle",
    description: "Analyse des performances, prédiction des résultats et recommandations personnalisées.",
    icon: Bot,
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 dark:bg-blue-950/20",
  },
  {
    title: "Communication",
    description: "Messagerie intégrée parents-enseignants-administration. Plus de mots dans les cahiers.",
    icon: MessageSquare,
    color: "from-pink-500 to-rose-600",
    bgLight: "bg-pink-50 dark:bg-pink-950/20",
  },
  {
    title: "Rapports & Statistiques",
    description: "Tableaux de bord en temps réel, export PDF et analyses comparatives par classe et par matière.",
    icon: TrendingUp,
    color: "from-cyan-500 to-sky-600",
    bgLight: "bg-cyan-50 dark:bg-cyan-950/20",
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={`group rounded-xl border bg-card p-6 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className={`w-12 h-12 rounded-lg ${feature.bgLight} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2 font-heading">{feature.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
      <div className={`mt-4 h-1 w-12 rounded-full bg-gradient-to-r ${feature.color} opacity-50 group-hover:opacity-100 group-hover:w-16 transition-all duration-300`} />
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="container mx-auto px-4 py-16 md:py-24">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 font-heading">
          Tout ce qu&apos;il faut pour votre école
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Des outils pensés pour les établissements congolais, du primaire au secondaire.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <FeatureCard key={i} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
