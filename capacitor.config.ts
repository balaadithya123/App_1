import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.balaadithya123.app1",
  appName: "Builderco",
  webDir: "dist/spa",
  // Load the live Builderco web app in Capacitor's WebView so authenticated
  // sessions and /api requests continue to use the hosted backend.
  server: {
    url: "https://builderco.vercel.app",
    cleartext: false,
  },
};

export default config;
