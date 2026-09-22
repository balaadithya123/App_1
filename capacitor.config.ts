import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.balaadithya123.app1",
  appName: "Local Worker Discovery",
  webDir: "dist/spa",
  server: {
    url: "https://builderco.vercel.app/",
    cleartext: false,
  },
};

export default config;
