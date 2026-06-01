import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../db/prisma.js";
import { config } from "./conf.js";

// ── Supabase admin client to generate password setup links ──────────────────
const getSupabaseAdminClient = () =>
  createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// ── Nodemailer transporter via Brevo SMTP ───────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    host: config.BREVO_SMTP_HOST,
    port: config.BREVO_SMTP_PORT,
    secure: false,
    auth: {
      user: config.BREVO_SMTP_LOGIN,
      pass: config.BREVO_SMTP_KEY,
    },
  });

// ── Beautiful welcome email HTML ────────────────────────────────────────────
const buildWelcomeHtml = (setupUrl: string, email: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Aroma AR</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo Row -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#ff7e5f,#feb47b);border-radius:14px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:22px;font-weight:800;line-height:48px;display:block;">A</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.02em;">Aroma AR</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;border:1px solid #e5e7eb;">

              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.02em;">You're invited! &#127881;</p>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:24px;">
                You have been added as a <strong style="color:#111827;">Company Administrator</strong> on Aroma AR.
                Click the button below to set up your password and get started.
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="height:1px;background:#f3f4f6;"></td></tr>
              </table>

              <!-- Feature list -->
              <p style="margin:0 0 16px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">What you can do</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">&#127869;&#65039; &nbsp; Manage all your restaurants</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">&#128203; &nbsp; Create and publish menus &amp; dishes</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">&#128101; &nbsp; Assign managers to restaurants</td></tr>
                <tr><td style="padding:10px 0;font-size:14px;color:#374151;">&#129301; &nbsp; Showcase dishes in 3D Augmented Reality</td></tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}"
                      style="display:inline-block;background:linear-gradient(135deg,#ff7e5f,#feb47b);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:12px;box-shadow:0 4px 14px rgba(255,126,95,0.35);">
                      Setup My Account &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:18px;">
                Button not working? <a href="${setupUrl}" style="color:#ff7e5f;text-decoration:none;">Click here</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">This invite was sent to ${email}</p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">&copy; ${new Date().getFullYear()} Aroma AR &nbsp;&middot;&nbsp; All rights reserved</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Main processing loop ─────────────────────────────────────────────────────
async function processNewUsers() {
  try {
    // Skip if Brevo is not configured
    if (!config.BREVO_SMTP_KEY || !config.BREVO_SENDER_EMAIL) {
      return;
    }

    const pendingUsers = await prisma.user.findMany({
      where: { welcomeEmailSent: false },
      select: { id: true, email: true },
    });

    if (pendingUsers.length === 0) return;

    const supabase = getSupabaseAdminClient();
    const transporter = createTransporter();

    for (const user of pendingUsers) {
      console.log(`[WelcomeService] Processing: ${user.email}`);

      // Skip managers/admins — they go through the manager invite OTP flow
      const isManager = await prisma.restaurantMember.findFirst({
        where: { userId: user.id, role: { in: ["MANAGER", "ADMIN"] } },
      });
      const inPending = await prisma.pendingManagerOtp.findFirst({
        where: { email: user.email },
      });

      if (isManager || inPending) {
        console.log(`[WelcomeService] Skipping manager: ${user.email}`);
        await prisma.user.update({ where: { id: user.id }, data: { welcomeEmailSent: true } });
        continue;
      }

      // Generate a secure password recovery link via Supabase Admin
      const { data, error: linkError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: user.email,
      });

      if (linkError || !data?.properties?.action_link) {
        console.error(`[WelcomeService] Failed to generate link for ${user.email}:`, linkError?.message);
        continue;
      }

      const setupUrl = data.properties.action_link;

      // Send the custom welcome email via Brevo SMTP
      const { error: mailError } = await new Promise<{ error: Error | null }>((resolve) => {
        transporter.sendMail(
          {
            from: `"${config.BREVO_SENDER_NAME}" <${config.BREVO_SENDER_EMAIL}>`,
            to: user.email,
            subject: "Welcome to Aroma AR — Set Up Your Account 🎉",
            html: buildWelcomeHtml(setupUrl, user.email),
          },
          (err) => resolve({ error: err }),
        );
      });

      if (mailError) {
        console.error(`[WelcomeService] Failed to send email to ${user.email}:`, mailError.message);
        continue;
      }

      console.log(`[WelcomeService] ✅ Welcome email sent to: ${user.email}`);
      await prisma.user.update({ where: { id: user.id }, data: { welcomeEmailSent: true } });
    }
  } catch (err) {
    console.error("[WelcomeService] Unexpected error:", err);
  }
}

// ── Start the background service ─────────────────────────────────────────────
export function startWelcomeEmailService() {
  console.log("[WelcomeService] Starting...");
  processNewUsers();
  setInterval(processNewUsers, 10_000);
}
