import { Resend } from "resend";

export interface WelcomeEmailParams {
  email: string;
  tempPassword: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolName: string;
  schoolSlug: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured, skipping welcome email to", params.email);
    return;
  }

  const resend = new Resend(apiKey);

  const roleLabel =
    params.role === "teacher" ? "enseignant" :
    params.role === "parent" ? "parent" :
    params.role === "student" ? "élève" : params.role;

  const loginUrl = `${process.env.NEXT_PUBLIC_ROOT_DOMAIN === "localhost:3000" ? "http://localhost:3000" : "https://geschool.vercel.app"}/${params.schoolSlug}/login`;

  try {
    await resend.emails.send({
      from: "Geschool <noreply@geschool.app>",
      to: params.email,
      subject: `Bienvenue sur Geschool — Vos identifiants de connexion`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4F46E5; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${params.schoolName}</h1>
          </div>

          <div style="padding: 32px 24px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151;">Bonjour <strong>${params.firstName} ${params.lastName}</strong>,</p>
            <p style="font-size: 16px; color: #374151;">
              Un compte <strong>${roleLabel}</strong> a été créé pour vous sur la plateforme Geschool de <strong>${params.schoolName}</strong>.
            </p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h2 style="color: #4F46E5; font-size: 18px; margin-top: 0;">Vos identifiants de connexion</h2>
              <p style="margin: 8px 0;"><strong>Email :</strong> ${params.email}</p>
              <p style="margin: 8px 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${params.tempPassword}</code></p>
            </div>

            <a href="${loginUrl}"
               style="display: inline-block; background: #4F46E5; color: white; text-decoration: none;
                      padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
              Se connecter
            </a>

            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              Pour des raisons de sécurité, veuillez changer votre mot de passe lors de votre première connexion.
            </p>
          </div>

          <div style="padding: 16px 24px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>Geschool — Application de gestion scolaire</p>
          </div>
        </div>
      `,
    });
    console.log("Welcome email sent to", params.email);
  } catch (error) {
    console.error("Failed to send welcome email to", params.email, error);
  }
}
