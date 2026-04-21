/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ikizurasenryaku.montasku",
  appName: "モンタスク",
  webDir: "android-web",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://montasku.vercel.app",
    cleartext: false
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["google.com", "apple.com"]
    }
  }
};

export default config;
