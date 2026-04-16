import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ikizurasenryaku.montasku",
  appName: "モンタスク",
  webDir: "android-web",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://montasku.vercel.app",
    cleartext: false
  }
};

export default config;
