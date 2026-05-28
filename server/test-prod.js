import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const userId = "41e11961-b8d2-4577-b48e-f93e901c050e"; // jerry's user ID
const email = "jerry.holland.bs123454@gmail.com";

const token = jwt.sign(
  { sub: userId, email, role: "authenticated" },
  SUPABASE_JWT_SECRET,
  { expiresIn: "1h" }
);

async function testProd() {
  console.log("Fetching /me...");
  const meRes = await fetch("https://aroma-orcin.vercel.app/api/v1/auth/me", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Me Status:", meRes.status);
  console.log("Me Body:", await meRes.text());
  
  console.log("Fetching /team...");
  const teamRes = await fetch("https://aroma-orcin.vercel.app/api/v1/auth/team", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Team Status:", teamRes.status);
  console.log("Team Body:", await teamRes.text());
}

testProd();
