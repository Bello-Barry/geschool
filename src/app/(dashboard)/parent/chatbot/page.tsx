import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, User, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ParentChatbotPage() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");
  const schoolName = headersList.get("x-school-name") || "l'école";

  if (!schoolId) redirect("/login");

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assistant IA</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Posez vos questions sur la scolarité de vos enfants à notre IA multilingue.
          </p>
        </div>
        <Badge variant="outline" className="flex gap-1 items-center bg-blue-50 text-blue-700 border-blue-200 py-1">
          <Sparkles className="h-3 w-3" /> Propulsé par Gemini
        </Badge>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-2 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Assistant {schoolName} (Français / Lingala)
          </CardTitle>
          <CardDescription>
            Exemple : "Quelle est la moyenne de mon fils en maths ?" ou "S'il vous plaît, traduisez en Lingala."
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Welcome Message */}
          <div className="flex gap-3 max-w-[80%]">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div className="bg-muted p-4 rounded-2xl rounded-tl-none">
              <p className="text-sm">
                Bonjour ! Je suis votre assistant scolaire intelligent. Comment puis-je vous aider aujourd'hui ?
                <br /><br />
                Ngai nazali lisungi na bino ya mayele mpona makambo ya kelasi. Ndenge nini nakoki kosunga bino lelo ?
              </p>
            </div>
          </div>

          {/* User Message Example */}
          <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-none">
              <p className="text-sm text-white">
                Quelles sont les dernières notes de Marie ?
              </p>
            </div>
          </div>

          <div className="italic text-xs text-muted-foreground text-center py-4">
            Ceci est une démonstration. Les données réelles apparaîtront ici après connexion à l'API.
          </div>
        </CardContent>

        <div className="p-4 border-t bg-white">
          <form className="flex gap-2">
            <Input
              placeholder="Écrivez votre message ici..."
              className="flex-1 rounded-full border-2 focus-visible:ring-blue-500"
            />
            <Button size="icon" className="rounded-full h-10 w-10 bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            L'IA peut faire des erreurs. Vérifiez les informations importantes auprès de l'école.
          </p>
        </div>
      </Card>
    </div>
  );
}
