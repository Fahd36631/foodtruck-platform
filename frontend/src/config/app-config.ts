import { Platform } from "react-native";

const DEFAULT_DEV_API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:4000/api/v1" : "http://10.61.11.76:4000/api/v1";

export const appConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_DEV_API_BASE_URL,
  isApiBaseUrlFromEnv: Boolean(process.env.EXPO_PUBLIC_API_BASE_URL)
};
