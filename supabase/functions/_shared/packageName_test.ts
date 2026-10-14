import { assertEquals } from "jsr:@std/assert@1";
import { capacitorAppId } from "./packageName.ts";

Deno.test("Package name: reads the JSON config that Shippabel generates", () => {
  const json = JSON.stringify({ appId: "com.appanderssontimmy.appshippabelplaytest", appName: "Test", webDir: "dist" }, null, 2);
  assertEquals(capacitorAppId(json), "com.appanderssontimmy.appshippabelplaytest");
});

Deno.test("Package name: reads hand-written TypeScript and JavaScript configs", () => {
  assertEquals(capacitorAppId("const config = {\n  appId: 'com.example.app',\n  webDir: 'dist',\n};"), "com.example.app");
  assertEquals(capacitorAppId('module.exports = { appId: "com.example.two" }'), "com.example.two");
  assertEquals(capacitorAppId("const appId = 'com.example.three';"), "com.example.three");
});

Deno.test("Package name: ignores similar keys and missing values", () => {
  assertEquals(capacitorAppId('{ "appIdentifier": "not.this" }'), null);
  assertEquals(capacitorAppId('{ "appName": "x" }'), null);
  assertEquals(capacitorAppId(null), null);
  assertEquals(capacitorAppId(undefined), null);
});
