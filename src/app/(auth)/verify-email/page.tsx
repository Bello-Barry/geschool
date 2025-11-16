"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { AlertCircle, CheckCircle, Loader2, Mail } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [status, setStatus] = useState<"pending" | "verifying" | "success" | "error">("pending");
  const [error, setError] = useState<string | null>(null);
  const email = searchParams.get("email") || "";

  const handleResendEmail = async () => {
    setStatus("verifying");
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) throw new Error(error.message);
      setStatus("success");
      setTimeout(() => setStatus("pending"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du renvoi");
      setStatus("pending");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vérifiez votre email</CardTitle>
          <CardDescription>
            Nous avons envoyé un lien de confirmation à <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              Cliquez sur le lien dans l'email pour vérifier votre adresse et créer votre compte.
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Email d'invitation renvoyé!
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleResendEmail}
            disabled={status === "verifying"}
            variant="outline"
            className="w-full"
          >
            {status === "verifying" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Renvoyer l'email"
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Vous n'avez pas reçu l'email?</p>
            <Link href="/register" className="text-blue-600 hover:underline text-sm">
              Retour à l'inscription
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
