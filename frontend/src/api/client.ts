import axios from "axios";

import { appConfig } from "@/config/app-config";

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 10000
});
