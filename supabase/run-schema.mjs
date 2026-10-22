/**
 * Applies the Nalexis schema to Supabase.
 * Run once with: node supabase/run-schema.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env.local") });

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !svcKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");

// Split on statement boundaries and run each one
// Supabase JS client doesn't run raw DDL — we use the pg REST proxy
const response = await fetch(`${url}/rest/v1/`, {
  method: "GET",
  headers: {
    apikey: svcKey,
    Authorization: `Bearer ${svcKey}`,
  },
});

console.log("Supabase connection test:", response.status === 200 ? "OK" : await response.text());

// Use the Supabase postgres proxy for raw SQL
const execResponse = await fetch(`${url}/pg/query`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: svcKey,
    Authorization: `Bearer ${svcKey}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (execResponse.ok) {
  console.log("Schema applied successfully.");
} else {
  const text = await execResponse.text();
  console.log(`Schema endpoint not available (${execResponse.status}). Use the SQL Editor instead.`);
  console.log("Response:", text.slice(0, 300));
  console.log("\n─────────────────────────────────────────────────");
  console.log("MANUAL STEP REQUIRED:");
  console.log("1. Go to: https://supabase.com/dashboard/project/bsefzssqiqevainnjdmk/sql/new");
  console.log("2. Open: supabase/schema.sql");
  console.log("3. Paste the entire contents and click Run");
  console.log("─────────────────────────────────────────────────\n");
}
