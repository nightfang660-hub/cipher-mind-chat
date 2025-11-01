import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  confirmationUrl: string;
}

const getEmailTemplate = (confirmationUrl: string) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial,sans-serif;background:#ffffff;color:#0b0b0b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:28px auto;border-collapse:collapse;">
      <tr>
        <td style="padding:24px;border:1px solid #e9e9e9;border-radius:8px;background:#ffffff;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:48px;height:48px;border-radius:8px;background:#111827;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:700;">
              CN
            </div>
            <div>
              <div style="font-size:16px;font-weight:600;">Cipher Mind</div>
              <div style="font-size:12px;color:#6b7280;">Account confirmation</div>
            </div>
          </div>

          <h2 style="font-size:18px;margin:0 0 12px 0;font-weight:600;color:#111827;">Confirm your email address</h2>

          <p style="margin:0 0 16px 0;color:#374151;line-height:1.5;">
            Thank you for creating an account on Cipher Mind. Please confirm your email address to complete the sign-up process.
          </p>

          <div style="text-align:left;margin:18px 0;">
            <a href="${confirmationUrl}" style="display:inline-block;padding:12px 20px;border-radius:6px;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;">
              Confirm email
            </a>
          </div>

          <p style="margin:0 0 8px 0;color:#6b7280;font-size:13px;">
            If the button does not work, copy and paste this link into your browser:
          </p>

          <pre style="background:#f3f4f6;padding:10px;border-radius:6px;color:#111827;overflow-x:auto;font-size:13px;margin:8px 0;">${confirmationUrl}</pre>

          <hr style="border:0;border-top:1px solid #eef2f7;margin:18px 0;" />

          <p style="margin:0;color:#6b7280;font-size:12px;">
            If you did not request this email, you can ignore it. For help, contact support at support@shadownet.in.
          </p>

          <p style="margin:12px 0 0 0;color:#9ca3af;font-size:12px;">
            ShadowNet · <a href="https://ciphermind.in" style="color:#111827;text-decoration:none;">ciphermind.in</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, confirmationUrl }: EmailRequest = await req.json();

    console.log(`Sending confirmation email to: ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Cipher Mind <onboarding@resend.dev>",
      to: [email],
      subject: "Confirm your Cipher Mind account",
      html: getEmailTemplate(confirmationUrl),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
