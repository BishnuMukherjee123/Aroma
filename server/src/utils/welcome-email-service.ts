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

// ── Welcome email HTML (designer template) ──────────────────────────────────
const buildWelcomeHtml = (setupUrl: string, email: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Aroma AR</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f5f0eb; font-family: 'DM Sans', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
    .email-wrapper { max-width: 620px; margin: 40px auto; background: #fdfaf6; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 40px rgba(60,30,10,0.10); }
    .header { background: #1c1008; padding: 48px 52px 40px; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 80% at 90% 10%, rgba(220,140,60,0.18) 0%, transparent 70%), radial-gradient(ellipse 40% 60% at 10% 90%, rgba(180,90,20,0.12) 0%, transparent 70%); pointer-events: none; }
    .logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 36px; }
    .logo-icon { width: 38px; height: 38px; flex-shrink: 0; }
    .logo-text { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: #f5c97a; letter-spacing: 0.06em; }
    .logo-text span { color: #e8d5b0; font-weight: 400; font-style: italic; }
    .header-eyebrow { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #c8955a; margin-bottom: 12px; }
    .header-headline { font-family: 'Cormorant Garamond', serif; font-size: 44px; font-weight: 600; line-height: 1.12; color: #fdfaf6; margin-bottom: 6px; }
    .header-headline em { color: #f5c97a; font-style: italic; }
    .header-sub { font-size: 13px; color: #b09070; letter-spacing: 0.02em; }
    .header-arc { position: absolute; right: -30px; bottom: -40px; width: 220px; height: 220px; border-radius: 50%; border: 1.5px solid rgba(245,201,122,0.12); }
    .header-arc-2 { position: absolute; right: 20px; bottom: -70px; width: 160px; height: 160px; border-radius: 50%; border: 1px solid rgba(245,201,122,0.07); }
    .body { padding: 44px 52px; }
    .greeting { font-size: 15.5px; line-height: 1.75; color: #3a2410; margin-bottom: 32px; }
    .greeting strong { font-weight: 500; color: #1c1008; }
    .badge { display: inline-flex; align-items: center; gap: 7px; background: #fef5e4; border: 1px solid #e8c882; border-radius: 3px; padding: 5px 14px 5px 10px; font-size: 11.5px; font-weight: 500; color: #7a4e10; letter-spacing: 0.04em; margin-bottom: 36px; }
    .badge-dot { width: 7px; height: 7px; background: #d4890a; border-radius: 50%; }
    .cta-wrap { margin: 36px 0; text-align: left; }
    .cta-btn { display: inline-block; background: #c2660a; color: #fdfaf6 !important; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-decoration: none; padding: 15px 34px; border-radius: 3px; }
    .cta-arrow { display: inline-block; margin-left: 8px; font-size: 16px; }
    .divider { border: none; border-top: 1px solid #ede5d8; margin: 36px 0; }
    .features-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #c8955a; margin-bottom: 20px; }
    .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .feature-card { background: #fef9f2; border: 1px solid #ede5d8; border-radius: 4px; padding: 18px 18px 16px; }
    .feature-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; background: #fef0dc; border-radius: 8px; border: 1px solid #f0d8b0; padding: 8px; margin-bottom: 12px; }
    .feature-icon svg { display: block; }
    .feature-title { font-size: 13px; font-weight: 500; color: #1c1008; margin-bottom: 4px; }
    .feature-desc { font-size: 12px; color: #7a6050; line-height: 1.55; }
    .signoff { margin-top: 40px; font-size: 14px; color: #5a3a20; line-height: 1.8; }
    .signoff-brand { font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 600; color: #1c1008; }
    .footer { background: #1c1008; padding: 28px 52px; border-top: 1px solid #2e1c0c; }
    .footer-note { font-size: 11.5px; color: #7a5a3a; line-height: 1.65; margin-bottom: 16px; }
    .footer-note a { color: #c8955a; text-decoration: none; }
    .footer-copy { font-size: 11px; color: #4a3020; letter-spacing: 0.04em; }
    @media (max-width: 540px) {
      .email-wrapper { margin: 0; border-radius: 0; }
      .header, .body, .footer { padding-left: 28px; padding-right: 28px; }
      .header-headline { font-size: 34px; }
      .features-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<div class="email-wrapper">

  <div class="header">
    <div class="header-arc"></div>
    <div class="header-arc-2"></div>
    <div class="logo-row">
      <svg class="logo-icon" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="19" cy="19" r="18.5" stroke="#f5c97a" stroke-opacity="0.3"/>
        <path d="M19 8C19 8 13 14.5 13 20a6 6 0 0 0 12 0c0-3-2-5.5-2-5.5s-0.5 2-2 3c0 0 0-4-2-9.5z" fill="#f5c97a" opacity="0.9"/>
        <path d="M22 20.5a3 3 0 0 1-6 0c0-1.5 1-3 1-3s0.2 1 1 1.5c0 0 0.2-1.5 1-3 .5 1.5 .6 3 1.5 3.5a1 1 0 0 0 .5 1z" fill="#c2660a"/>
        <path d="M5 5 L5 10 M5 5 L10 5" stroke="#c8955a" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M33 5 L33 10 M33 5 L28 5" stroke="#c8955a" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M5 33 L5 28 M5 33 L10 33" stroke="#c8955a" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M33 33 L33 28 M33 33 L28 33" stroke="#c8955a" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <div class="logo-text">Aroma <span>AR</span></div>
    </div>
    <div class="header-eyebrow">Account Activated</div>
    <div class="header-headline">Welcome<br>to <em>Aroma AR</em></div>
    <div class="header-sub">Your restaurant's AR menu experience starts here.</div>
  </div>

  <div class="body">
    <p class="greeting">
      Hi there,<br><br>
      We're thrilled to have you on board. Your account has been created and you've been set up as a
      <strong>Company Administrator</strong> — you now have full access to manage your restaurants on the Aroma AR platform.
    </p>
    <div class="badge">
      <span class="badge-dot"></span>
      Company Administrator · Full Access
    </div>
    <p style="font-size:13.5px; color:#5a3a20; margin-bottom:18px; font-weight:400;">
      To get started, set up your account by clicking below:
    </p>
    <div class="cta-wrap">
      <a href="${setupUrl}" class="cta-btn">
        Setup My Account <span class="cta-arrow">→</span>
      </a>
    </div>
    <hr class="divider" />
    <div class="features-label">What you can do</div>
    <div class="features-grid">
      <div class="feature-card">
        <span class="feature-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 2v7c0 1.66 1.34 3 3 3h.5v10a1 1 0 0 0 2 0V12H9c1.66 0 3-1.34 3-3V2" stroke="#c2660a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="6" y1="2" x2="6" y2="7" stroke="#c2660a" stroke-width="1.6" stroke-linecap="round"/>
            <line x1="9" y1="2" x2="9" y2="7" stroke="#c2660a" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M15 2c0 0 3 2.5 3 7v.5a2.5 2.5 0 0 1-2 2.45V22a1 1 0 0 1-2 0V2" stroke="#c2660a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <div class="feature-title">Menus &amp; Dishes</div>
        <div class="feature-desc">Create and manage restaurant menus. Add dishes with rich details and beautiful media.</div>
      </div>
      <div class="feature-card">
        <span class="feature-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="#c2660a" stroke-width="1.6"/>
            <rect x="5" y="5" width="3" height="3" fill="#c2660a"/>
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="#c2660a" stroke-width="1.6"/>
            <rect x="16" y="5" width="3" height="3" fill="#c2660a"/>
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="#c2660a" stroke-width="1.6"/>
            <rect x="5" y="16" width="3" height="3" fill="#c2660a"/>
            <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="#c2660a"/>
          </svg>
        </span>
        <div class="feature-title">QR Code Generator</div>
        <div class="feature-desc">Generate instant QR codes that link diners directly to your public AR menu.</div>
      </div>
      <div class="feature-card">
        <span class="feature-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="7" r="3.2" stroke="#c2660a" stroke-width="1.6"/>
            <path d="M2 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="#c2660a" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="17.5" cy="7.5" r="2.5" stroke="#c2660a" stroke-width="1.4"/>
            <path d="M21.5 20c0-2.76-1.79-5.1-4.3-5.8" stroke="#c2660a" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </span>
        <div class="feature-title">Team Management</div>
        <div class="feature-desc">Assign managers to your restaurants and control access levels with ease.</div>
      </div>
      <div class="feature-card">
        <span class="feature-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#c2660a" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M12 2v15M2 7l10 5 10-5" stroke="#c2660a" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M7 4.5l10 5" stroke="#c2660a" stroke-width="1" stroke-linecap="round" opacity="0.45"/>
          </svg>
        </span>
        <div class="feature-title">3D Augmented Reality</div>
        <div class="feature-desc">Showcase your dishes in stunning 3D AR — let guests preview every plate before ordering.</div>
      </div>
    </div>
    <div class="signoff">
      <p>If you have any questions, our support team is always here to help.</p>
      <br>
      <p>Warm regards,</p>
      <p class="signoff-brand">The Aroma AR Team</p>
    </div>
  </div>

  <div class="footer">
    <p class="footer-note">
      This invitation was sent to <a href="mailto:${email}">${email}</a>.
      If you didn't expect this email, you can safely ignore it.
    </p>
    <p class="footer-copy">&copy; ${new Date().getFullYear()} Aroma AR &middot; All rights reserved</p>
  </div>

</div>
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
