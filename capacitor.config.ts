import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.balaadithya123.app1",
  appName: "Builderco",
  webDir: "dist/spa",
  // Use the bundled responsive app instead of a remote URL. This avoids a blank
  // screen when the hosted site is unavailable and keeps app navigation native.
};

export default config;
