import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.balaadithya123.app1",
  appName: "Builderco",
  webDir: "dist/spa",
  // The Android app is a lightweight native shell for the live responsive website.
  // Website deployments update the app's content without rebuilding the APK.
  server: {
    url: "https://builderco.vercel.app",
    cleartext: false,
  },
};

export default config;
