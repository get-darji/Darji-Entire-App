import Constants from "expo-constants";

const productionApiUrl = "https://darji-entire-app-production.up.railway.app/api";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
// Local development is opt-in; Expo's bundle host is not necessarily an API server.
export const apiUrl = configuredApiUrl?.trim() || (Constants.expoConfig?.extra?.apiUrl as string | undefined) || productionApiUrl;
