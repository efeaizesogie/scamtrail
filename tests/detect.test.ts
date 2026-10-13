import { test } from "node:test";
import assert from "node:assert/strict";
import { detect } from "../lib/detect";

test("detects each input type", () => {
  assert.deepEqual(detect("@exampleproto"), { ok: true, type: "HANDLE", value: "@exampleproto" });
  assert.deepEqual(detect("https://x.com/Example_Proto"), { ok: true, type: "HANDLE", value: "@Example_Proto" });
  assert.deepEqual(detect("twitter.com/example?s=21"), { ok: true, type: "HANDLE", value: "@example" });
  assert.equal(detect("0x7a11e70000000000000000000000000000000042").ok && detect("0x7a11e70000000000000000000000000000000042").type, "EVM ADDRESS");
  assert.equal((detect("0x7a11e70000000000000000000000000000000042", "CONTRACT") as { type: string }).type, "CONTRACT");
  assert.equal((detect("app.example.com") as { type: string }).type, "DOMAIN");
  assert.equal((detect("https://app.example.com/swap?x=1") as { type: string }).type, "DOMAIN");
  assert.equal((detect("Example Protocol") as { type: string }).type, "PROJECT");
});

test("explains invalid input", () => {
  const short = detect("0x1234");
  assert.equal(short.ok, false);
  assert.match((short as { error: string }).error, /4 characters after 0x/);
  assert.equal(detect("x.com/").ok, false);
  assert.equal(detect("@this_handle_is_far_too_long").ok, false);
  assert.equal(detect(" ").ok, false);
});
