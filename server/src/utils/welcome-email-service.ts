import { createClient } from "@supabase/supabase-js";
import { prisma } from "../db/prisma.js";
import { config } from "./conf.js";

const getSupabaseAdminClient = () => {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const supabase = getSupabaseAdminClient();

async function processNewUsers() {
  try {
    // Find users who haven't been sent a welcome email yet
    const pendingUsers = await prisma.user.findMany({
      where: {
        welcomeEmailSent: false,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (pendingUsers.length === 0) {
      return;
    }

    for (const user of pendingUsers) {
      console.log(`[WelcomeService] Processing new user: ${user.email}`);

      // Check if they are in PendingManagerOtp table
      const inPendingManager = await prisma.pendingManagerOtp.findFirst({
        where: { email: user.email },
      });

      // Check if they are already in RestaurantMember with MANAGER or ADMIN role
      const inRestaurantMember = await prisma.restaurantMember.findFirst({
        where: {
          userId: user.id,
          role: { in: ["MANAGER", "ADMIN"] },
        },
      });

      // If they are a manager/admin, skip the auto-welcome email (they go through the manager signup/OTP invite flow)
      if (inPendingManager || inRestaurantMember) {
        console.log(`[WelcomeService] Skipping manager/admin user: ${user.email}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSent: true },
        });
        continue;
      }

      // Send password reset / recovery email via Supabase to act as a welcome & setup email
      console.log(`[WelcomeService] Sending welcome/confirmation email to owner: ${user.email}`);
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);

      if (error) {
        console.error(`[WelcomeService] Failed to send email to ${user.email}:`, error.message);
      } else {
        console.log(`[WelcomeService] Successfully triggered welcome email for: ${user.email}`);
      }

      // Mark as sent so we don't process them again
      await prisma.user.update({
        where: { id: user.id },
        data: { welcomeEmailSent: true },
      });
    }
  } catch (error) {
    console.error("[WelcomeService] Error processing new users:", error);
  }
}

export function startWelcomeEmailService() {
  console.log("[WelcomeService] Starting Welcome/Confirmation Email background service...");
  // Run once immediately, then every 10 seconds
  processNewUsers();
  setInterval(processNewUsers, 10_000);
}
