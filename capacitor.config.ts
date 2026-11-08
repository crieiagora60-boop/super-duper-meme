import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.worder.effects",
  appName: "Worder Effect",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    backgroundColor: "#090710",
    allowMixedContent: false,
  },
};

export default config;
