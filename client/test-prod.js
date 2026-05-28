import fetch from "node-fetch";

async function testProd() {
  console.log("Logging in to production...");
  const loginRes = await fetch("https://aroma-orcin.vercel.app/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "jerry.holland.bs123454@gmail.com",
      password: "password123", // Assuming password is this or we can't login? Wait, I don't know the password!
    }),
  });
  
  if (!loginRes.ok) {
    const text = await loginRes.text();
    console.error("Login failed:", text);
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log("Got token.");
  
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
