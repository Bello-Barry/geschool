import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Database, Mail, BrainCircuit, CheckCircle2, ShieldCheck, Key } from "lucide-react";

export const metadata = {
  title: "Paramètres — Super Admin",
};

export default function SettingsPage() {
  const isResendConfigured = !!process.env.RESEND_API_KEY;
  const isGeminiConfigured = !!process.env.GEMINI_API_KEY;
  const isDeepSeekConfigured = !!process.env.DEEPSEEK_API_KEY;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Paramètres Plateforme
          </h2>
          <p className="text-muted-foreground mt-1">
            Gérez les clés d'API et la configuration système.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Supabase Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-lg">Base de données</CardTitle>
            </div>
            <CardDescription>État de la connexion Supabase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Connexion Principale</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Connecté</Badge>
            </div>
            <div className="space-y-2">
              <Label>URL Supabase</Label>
              <Input value={process.env.NEXT_PUBLIC_SUPABASE_URL || ""} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Resend Emailing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Service Email (Resend)</CardTitle>
            </div>
            <CardDescription>Configuration d'envoi d'emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Statut de la clé API</span>
              </div>
              {isResendConfigured ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Configuré</Badge>
              ) : (
                <Badge variant="destructive">Manquant</Badge>
              )}
            </div>
            <div className="space-y-2">
              <Label>Clé API Resend</Label>
              <Input value={isResendConfigured ? "*************************" : ""} disabled placeholder="Non défini dans .env" />
            </div>
            <Button variant="outline" className="w-full">Tester l'envoi</Button>
          </CardContent>
        </Card>

        {/* AI Services */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">Services d'Intelligence Artificielle</CardTitle>
            </div>
            <CardDescription>Configuration des modèles LLM pour l'assistant éducatif</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Google Gemini</span>
                  {isGeminiConfigured ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1"><CheckCircle2 className="h-3 w-3" /> Prêt</Badge>
                  ) : (
                    <Badge variant="outline">Non configuré</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Clé API Gemini</Label>
                  <Input value={isGeminiConfigured ? "*************************" : ""} disabled />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">DeepSeek</span>
                  {isDeepSeekConfigured ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1"><CheckCircle2 className="h-3 w-3" /> Prêt</Badge>
                  ) : (
                    <Badge variant="outline">Non configuré</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Clé API DeepSeek</Label>
                  <Input value={isDeepSeekConfigured ? "*************************" : ""} disabled />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
