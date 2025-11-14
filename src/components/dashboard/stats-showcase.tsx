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
    <section id="stats" className="container mx-auto px-4 py-24 bg-muted/50">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Statistiques</h2>
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Visualisez les performances de votre établissement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Évolution Scolaire</CardTitle>
          <CardDescription>Nombre d'élèves, enseignants et revenus</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="students" fill="#3b82f6" />
              <Bar dataKey="teachers" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  );
}
