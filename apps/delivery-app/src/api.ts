import Constants from "expo-constants";

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:4000/api";

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Request failed");
  return body.data as T;
}
