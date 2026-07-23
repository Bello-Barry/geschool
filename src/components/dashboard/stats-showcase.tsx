"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { name: "Jan", students: 400, teachers: 24, revenue: 2400 },
  { name: "Fév", students: 450, teachers: 26, revenue: 2210 },
  { name: "Mar", students: 480, teachers: 29, revenue: 2290 },
  { name: "Avr", students: 520, teachers: 31, revenue: 2000 },
  { name: "Mai", students: 580, teachers: 35, revenue: 2181 },
  { name: "Juin", students: 600, teachers: 37, revenue: 2500 },
];

export function StatsShowcase() {
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

  return (
    <section id="stats" className="container mx-auto px-4 py-16 md:py-24 mb-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 font-heading">Statistiques</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Suivez la croissance et les performances de votre école en temps réel.
        </p>
      </div>

      <div
        ref={ref}
        className={`transition-all duration-700 delay-200 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <Card className="border-none shadow-lg bg-gradient-to-br from-card to-muted/30">
          <CardHeader>
            <CardTitle className="font-heading">Évolution de l&apos;établissement</CardTitle>
            <CardDescription>Élèves et Enseignants (Données indicatives)</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-4 sm:px-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12}} width={40} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="students" name="Élèves" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="teachers" name="Enseignants" fill="hsl(160 60% 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
