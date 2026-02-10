"use client";

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
  return (
    <section id="stats" className="container mx-auto px-4 py-16 md:py-24 bg-muted/30 rounded-3xl mb-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Statistiques</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Suivez la croissance et les performances de votre école en temps réel.
        </p>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Évolution de l'établissement</CardTitle>
          <CardDescription>Élèves et Enseignants (Données indicatives)</CardDescription>
        </CardHeader>
        <CardContent className="pl-0 pr-4 sm:px-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} width={40} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="students" name="Élèves" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="teachers" name="Enseignants" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
