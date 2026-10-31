import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.balaadithya123.app1",
  appName: "Builderco",
  webDir: "dist/spa",
  // Stable branch alias: always serves the latest successful app-redesign deployment.
  server: {
    url: "https://newapp-1-git-app-redesign-balaadithya74-5139s-projects.vercel.app",
    cleartext: false,
  },
};

export default config;
