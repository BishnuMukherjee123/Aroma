import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  console.log("Connected to database. Updating database triggers...");

  // 1. Recreate the handle_new_user function to safely auto-assign OWNER to non-managers
  await client.query(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      restaurant_record RECORD;
      resolved_user_id TEXT;
      is_manager BOOLEAN;
    BEGIN
      -- Step 1: Insert into public.User (skip if email already exists)
      INSERT INTO public."User" (id, email, "passwordHash", "welcomeEmailSent", "createdAt", "updatedAt")
      VALUES (
        NEW.id::text,
        NEW.email,
        COALESCE(NEW.encrypted_password, ''),
        FALSE,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING;

      -- Step 2: Resolve the actual user ID
      SELECT id INTO resolved_user_id FROM public."User" WHERE email = NEW.email;

      -- Step 3: Check if the user is a manager (exists in PendingManagerOtp)
      SELECT EXISTS(
        SELECT 1 FROM public."PendingManagerOtp" WHERE email = NEW.email
      ) INTO is_manager;

      -- Step 4: If not a manager, auto-assign them as OWNER to all restaurants
      IF resolved_user_id IS NOT NULL AND NOT is_manager THEN
        FOR restaurant_record IN SELECT id FROM public."Restaurant" LOOP
          INSERT INTO public."RestaurantMember"
            (id, "userId", "restaurantId", role, "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::text,
            resolved_user_id,
            restaurant_record.id,
            'OWNER'::"RestaurantMemberRole",
            NOW(),
            NOW()
          )
          ON CONFLICT ("userId", "restaurantId") DO NOTHING;
        END LOOP;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  console.log("✅ Updated public.handle_new_user trigger function.");

  // 2. Perform backfill for any existing users that are not managers and are not associated with any restaurants
  console.log("Running backfill for existing owners who are not in RestaurantMember...");
  await client.query(`
    DO $$
    DECLARE
      user_record RECORD;
      restaurant_record RECORD;
      is_manager BOOLEAN;
    BEGIN
      FOR user_record IN SELECT id, email FROM public."User" LOOP
        -- Check if they are in PendingManagerOtp or already have a MANAGER/ADMIN role
        SELECT EXISTS(
          SELECT 1 FROM public."PendingManagerOtp" WHERE email = user_record.email
          UNION
          SELECT 1 FROM public."RestaurantMember" WHERE "userId" = user_record.id AND role IN ('MANAGER'::"RestaurantMemberRole", 'ADMIN'::"RestaurantMemberRole")
        ) INTO is_manager;

        -- If they are not a manager, link them as OWNER to all restaurants
        IF NOT is_manager THEN
          FOR restaurant_record IN SELECT id FROM public."Restaurant" LOOP
            INSERT INTO public."RestaurantMember"
              (id, "userId", "restaurantId", role, "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid()::text,
              user_record.id,
              restaurant_record.id,
              'OWNER'::"RestaurantMemberRole",
              NOW(),
              NOW()
            )
            ON CONFLICT ("userId", "restaurantId") DO NOTHING;
          END LOOP;
        END IF;
      END LOOP;
    END;
    $$;
  `);

  console.log("✅ Backfill for existing owners complete.");

  // 3. Show current memberships for verification
  const members = await client.query(`
    SELECT u.email, r.name AS restaurant, rm.role
    FROM public."RestaurantMember" rm
    JOIN public."User" u ON u.id = rm."userId"
    JOIN public."Restaurant" r ON r.id = rm."restaurantId"
    ORDER BY u.email, r.name;
  `);
  console.log(`\n📋 Final RestaurantMember state (${members.rowCount} rows):`);
  for (const row of members.rows) {
    console.log(`   • ${row.email}  →  ${row.restaurant}  [${row.role}]`);
  }

  await client.end();
  console.log("\n🎉 Database trigger update and backfill successfully applied!");
}

run().catch((e) => {
  console.error("❌ ERROR:", e.message);
  process.exit(1);
});
