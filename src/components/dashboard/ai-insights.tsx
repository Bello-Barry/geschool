'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIInsights() {
  const [data, setData] = useState<{ analysis: string, atRiskCount?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/analyze');
      if (!response.ok) throw new Error('Erreur lors du chargement de l\'analyse');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            Analyse IA des Performances
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAnalysis}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Analyses prédictives basées sur les données de l'établissement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-white/50 p-4 rounded-lg border border-primary/10">
              <p className="text-sm leading-relaxed text-gray-700 italic">
                "{data?.analysis}"
              </p>
            </div>

            {data?.atRiskCount && data.atRiskCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded text-red-700 text-xs">
                <span className="font-bold">{data.atRiskCount} élèves</span> identifiés comme à risque (absences élevées).
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                DeepSeek-V3
              </span>
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                Temps Réel
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
