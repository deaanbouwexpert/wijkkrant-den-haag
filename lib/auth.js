import { getConfig } from "./kv";

export async function checkAdminPassword(req) {
  const provided = req.headers.get("x-admin-password") || "";
  if (!provided) return false;
  const cfg = await getConfig();
  return provided === cfg.password;
}
