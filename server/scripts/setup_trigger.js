import { prisma } from "../dist/db/prisma.js";

async function main() {
  const sqlFunction = `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public."User" (id, email, "passwordHash", "createdAt", "updatedAt")
      VALUES (new.id, new.email, '', now(), now())
      ON CONFLICT (email) DO UPDATE
      SET id = new.id;
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  const sqlTrigger = `
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  `;

  console.log("Setting up PostgreSQL handle_new_user trigger...");
  await prisma.$executeRawUnsafe(sqlFunction);
  await prisma.$executeRawUnsafe(sqlTrigger);
  console.log("Trigger setup successfully completed!");
}

main().catch(console.error);
