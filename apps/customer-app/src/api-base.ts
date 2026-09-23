import Constants from "expo-constants";

const productionApiUrl = "https://darji-entire-app-production.up.railway.app/api";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
const devApiUrl = devHost ? `http://${devHost}:4000/api` : undefined;

export const apiUrl = __DEV__ && devApiUrl && (!configuredApiUrl || configuredApiUrl === productionApiUrl)
  ? devApiUrl
  : configuredApiUrl ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? productionApiUrl;
