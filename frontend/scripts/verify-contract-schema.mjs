#!/usr/bin/env node
// Verifies every hardcoded `functionName: "..."` in the frontend actually
// exists on the deployed contract, per genlayer-js's getContractSchema().
// Run before every deploy — this exact check would have caught the
// "frontend misaligned with contract" class of failure other GenLayer
// submissions have been held back for.
//
// Usage: node scripts/verify-contract-schema.mjs
// Requires NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS (and optionally
// NEXT_PUBLIC_GENLAYER_RPC_URL) in the environment or frontend/.env.local.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // no .env.local — fine, env vars may already be set
  }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if ([".ts", ".tsx"].includes(extname(full))) out.push(full);
  }
}

function findFunctionNames(rootDirs) {
  // Three shapes to catch, each anchored tightly to the `functionName`
  // token itself so unrelated string literals on the same line/statement
  // (e.g. a status label passed to setState right after the write call)
  // don't get swept in as false positives:
  //   1. `functionName: "literal"` — a direct write call site.
  //   2. `functionName: "a" | "b" | ...` — a union-typed parameter.
  //   3. `functionName === "literal"` — a runtime branch on the param.
  const found = new Map(); // functionName -> [file, ...]
  // Group 1 of these two is bare (no quotes) — the identifier itself.
  const singlePatterns = [
    /functionName:\s*"([a-zA-Z_][a-zA-Z0-9_]*)"/g,
    /functionName\s*===\s*"([a-zA-Z_][a-zA-Z0-9_]*)"/g,
  ];
  // These two have group 1 as a whole multi-literal expression — sub-parse.
  const unionPattern = /functionName:\s*((?:"[a-zA-Z_][a-zA-Z0-9_]*"\s*\|\s*)+"[a-zA-Z_][a-zA-Z0-9_]*")/g;
  const ternaryPattern = /functionName:\s*\w+\s*\?\s*("[a-zA-Z_][a-zA-Z0-9_]*"\s*:\s*"[a-zA-Z_][a-zA-Z0-9_]*")/g;
  const literalRe = /"([a-zA-Z_][a-zA-Z0-9_]*)"/g;

  const record = (name, rel) => {
    if (!found.has(name)) found.set(name, []);
    if (!found.get(name).includes(rel)) found.get(name).push(rel);
  };

  for (const root of rootDirs) {
    const files = [];
    walk(root, files);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const rel = file.replace(new URL("..", import.meta.url).pathname, "");

      for (const pattern of singlePatterns) {
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(text))) record(m[1], rel);
      }

      for (const pattern of [unionPattern, ternaryPattern]) {
        pattern.lastIndex = 0;
        let um;
        while ((um = pattern.exec(text))) {
          literalRe.lastIndex = 0;
          let lm;
          while ((lm = literalRe.exec(um[1]))) record(lm[1], rel);
        }
      }
    }
  }
  return found;
}

async function main() {
  loadEnvLocal();
  const address = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS;
  if (!address) {
    console.error("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not set — cannot verify schema.");
    process.exit(1);
  }

  const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;
  const client = createClient({
    chain: studionet,
    ...(rpcUrl ? { endpoint: rpcUrl } : {}),
  });

  console.log(`Fetching deployed schema for ${address}...`);
  const schema = await client.getContractSchema(address);
  const deployedMethods = new Set(Object.keys(schema.methods ?? {}));

  const root = new URL("..", import.meta.url).pathname;
  const used = findFunctionNames([join(root, "app"), join(root, "components"), join(root, "lib")]);

  let ok = true;
  console.log(`\nDeployed contract exposes ${deployedMethods.size} methods.`);
  console.log(`Frontend hardcodes ${used.size} distinct functionName call sites.\n`);

  for (const [name, files] of used) {
    if (deployedMethods.has(name)) {
      console.log(`  OK    ${name}`);
    } else {
      ok = false;
      console.error(`  FAIL  ${name}  (not on deployed contract) — used in: ${files.join(", ")}`);
    }
  }

  if (!ok) {
    console.error("\nSchema verification FAILED — fix the mismatches above before deploying.");
    process.exit(1);
  }
  console.log("\nAll frontend functionName references match the deployed contract schema.");
}

main().catch((err) => {
  console.error("Schema verification errored:", err);
  process.exit(1);
});
