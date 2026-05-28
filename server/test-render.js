
async function run() {
  const email = "jerry.holland.bs123454@gmail.com";
  const password = "Bishnu.974942"; // From previous artifact
  const baseUrl = "https://aroma-backend-0u3o.onrender.com"; // Render backend

  console.log("1. Authenticating user...");
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    const errText = await loginRes.text();
    console.error(`Login failed: ${loginRes.status} - ${errText}`);
    return;
  }

  const { token } = await loginRes.json();
  console.log("Got token.");

  console.log("2. Fetching /me...");
  const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Me Status:", meRes.status);

  console.log("3. Fetching /team...");
  const teamRes = await fetch(`${baseUrl}/api/v1/auth/team`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Team Status:", teamRes.status);
  console.log("Team Body:", await teamRes.text());
}

run().catch(console.error);
