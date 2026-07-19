import { api } from "../api";

export async function rejectIncomingAssignment(path: string, token?: string, reason = "partner_rejected") {
  if (!token) return;
  await api(path, { method: "POST", body: JSON.stringify({ reason }) }, token);
}
