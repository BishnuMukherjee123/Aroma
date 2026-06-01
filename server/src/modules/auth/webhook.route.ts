import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { config } from "../../utils/conf.js";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { buildWelcomeHtml } from "../../utils/email-templates.js";

const router = Router();

// Webhook endpoint called by Supabase Database Webhooks when a row is inserted in User table
router.post("/welcome-webhook", async (req, res) => {
  try {
    const { record, type } = req.body;
    
    // We only care about new user INSERTS
    if (type !== "INSERT" || !record || !record.email || record.welcomeEmailSent) {
      return res.status(200).json({ status: "ignored" });
    }

    const email = record.email;
    const userId = record.id;
    console.log(`[WelcomeWebhook] Processing new user: ${email}`);

    // Skip managers/admins — they go through the manager invite OTP flow
    const isManager = await prisma.restaurantMember.findFirst({
      where: { userId: userId, role: { in: ["MANAGER", "ADMIN"] } },
    });
    const inPending = await prisma.pendingManagerOtp.findFirst({
      where: { email: email },
    });

    if (isManager || inPending) {
      console.log(`[WelcomeWebhook] Skipping manager: ${email}`);
      await prisma.user.update({ where: { id: userId }, data: { welcomeEmailSent: true } });
      return res.status(200).json({ status: "skipped_manager" });
    }

    // Generate secure setup link
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
    });

    if (linkError || !data?.properties?.action_link) {
      console.error(`[WelcomeWebhook] Failed to generate link for ${email}:`, linkError?.message);
      return res.status(500).json({ error: "Failed to generate setup link" });
    }

    const setupUrl = data.properties.action_link;

    // Send email via Brevo SMTP
    const transporter = nodemailer.createTransport({
      host: config.BREVO_SMTP_HOST,
      port: config.BREVO_SMTP_PORT,
      secure: false,
      auth: {
        user: config.BREVO_SMTP_LOGIN,
        pass: config.BREVO_SMTP_KEY,
      },
    });

    await new Promise<{ error: Error | null }>((resolve, reject) => {
      transporter.sendMail(
        {
          from: `"${config.BREVO_SENDER_NAME}" <${config.BREVO_SENDER_EMAIL}>`,
          to: email,
          subject: "Welcome to Aroma AR — Set Up Your Account 🎉",
          html: buildWelcomeHtml(setupUrl, email),
        },
        (err) => {
          if (err) reject(err);
          else resolve({ error: null });
        }
      );
    });

    console.log(`[WelcomeWebhook] ✅ Welcome email sent to: ${email}`);
    
    // Mark as sent
    await prisma.user.update({ where: { id: userId }, data: { welcomeEmailSent: true } });
    
    return res.status(200).json({ status: "sent" });
  } catch (error: any) {
    console.error("[WelcomeWebhook] Error processing webhook:", error);
    return res.status(500).json({ error: error.message });
  }
});

export const createAuthWebhookRouter = () => {
  return router;
};
