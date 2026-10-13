// Extracts the visible copy from the rendered page and checks it against the
// Part 3 copy rules. Usage: start the server, then `npm run copycheck [url]`.
// Writes copy.txt, which can also be fed to SlopMonster's tools/deslop.py.
// Report-page copy is generated from data; tests/rules.test.ts checks it against the same rules.
import { writeFileSync } from "node:fs";

const url = process.argv[2] ?? "http://localhost:3000";
const html = await (await fetch(url)).text();

const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<svg[\s\S]*?<\/svg>/gi, (m) => (m.match(/<text[^>]*>([\s\S]*?)<\/text>/g) ?? []).join(" "))
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<\/(p|h1|h2|h3|li|dt|dd|a|button|span|label)>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");

writeFileSync("copy.txt", text + "\n");

const BANNED = ["delve", "seamless", "game-changing", "game changing", "cutting-edge", "cutting edge", "unlock", "elevate", "journey", "landscape", "leverage", "robust"];
const checks = [
  ...BANNED.map((w) => [`banned word "${w}"`, new RegExp("\\b" + w, "i")]),
  ["em dash", /—/],
  ["'not just X, but Y'", /\bnot just\b/i],
  ["'it's not X, it's Y'", /\bit'?s not\b[^.]*\bit'?s\b/i],
  ["exclamation mark", /!/],
  ["question (possible self-answering)", /\?/],
  ["emoji", /(?![©®™])\p{Extended_Pictographic}/u],
  ["number next to users/customers/projects", /(^|[\s(])\d[\d,.]*[kKmM]?\+?\s*(users|customers|projects)\b/i],
  ["stacked hedge", /\b(may|might|could)\s+(possibly|potentially|perhaps)\b/i],
];

let fails = 0;
for (const [name, re] of checks) {
  const hits = text.split("\n").filter((l) => re.test(l));
  if (hits.length) {
    fails++;
    console.log(`FAIL  ${name}`);
    hits.slice(0, 5).forEach((h) => console.log(`      ${h}`));
  }
}
console.log(`\n${checks.length - fails}/${checks.length} checks clean. ${text.split(/\s+/).length} words written to copy.txt`);
process.exitCode = fails ? 1 : 0;
