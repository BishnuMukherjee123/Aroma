import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../db/prisma.js";
import { config } from "./conf.js";
import { buildWelcomeHtml } from "./email-templates.js";

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
