import { assertEquals } from "jsr:@std/assert@1";
import { analyzeZip } from "./scanSource.ts";
import { appContext, privacyContext } from "./projectContext.ts";
import { strToU8, zipSync } from "npm:fflate@0.8.2";

Deno.test("Generation context reads uploaded app config and omits source-code contents", () => {
  const source = analyzeZip(zipSync({
    "app/package.json": strToU8(JSON.stringify({ dependencies: { "@supabase/supabase-js": "2", "@stripe/stripe-js": "5" } })),
    "app/app.json": strToU8(JSON.stringify({ expo: { android: { permissions: ["android.permission.CAMERA", "CAMERA", "android.permission.ACCESS_FINE_LOCATION"] }, ios: { infoPlist: { NSCameraUsageDescription: "photo", CFBundleName: "example" } } } })),
    "app/src/main.ts": strToU8("PRIVATE_SOURCE_NOT_FOR_GENERATION"),
  }));
  assertEquals(privacyContext(source), { services: ["Supabase (authentication, database)", "Stripe (payment processing)"], permissions: ["Camera", "Precise Location"] });
  assertEquals(appContext(source).includes("PRIVATE_SOURCE_NOT_FOR_GENERATION"), false);
  assertEquals(appContext(source).includes("ACCESS_FINE_LOCATION"), true);
});
Deno.test("Missing optional configuration yields no invented detected services", () => {
  assertEquals(privacyContext(analyzeZip(zipSync({ "README.md": strToU8("Simple offline app") }))), { services: [], permissions: [] });
});
