import type { NextFunction, Request, Response } from "express";
import { AdminAuditLogModel, UserModel } from "../models.js";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function auditRequestContext(req: Request) {
  const ipAddress = String(req.ip || req.socket.remoteAddress || "").replace(/^::ffff:/, "").slice(0, 64) || undefined;
  const userAgent = String(req.get("user-agent") || "").slice(0, 400) || undefined;
  return { ipAddress, userAgent };
}

function classify(path: string) {
  const lower = path.toLowerCase();
  if (lower.includes("/auth/")) return "ACCESS";
  if (lower.includes("/orders") || lower.includes("/assign") || lower.includes("/quotes")) return "ORDERS";
  if (lower.includes("/tailors") || lower.includes("delivery-partners") || lower.includes("/users") || lower.includes("verification")) return "PEOPLE";
  if (lower.includes("tailoring") || lower.includes("measurement") || lower.includes("delivery")) return "OPERATIONS";
  if (lower.includes("payment") || lower.includes("wallet") || lower.includes("ledger")) return "FINANCE";
  if (lower.includes("support") || lower.includes("bug") || lower.includes("change-request")) return "SUPPORT";
  if (lower.includes("coupon") || lower.includes("notification") || lower.includes("settings") || lower.includes("catalog")) return "CONFIGURATION";
  return "OTHER";
}

function actionSummary(method: string, path: string) {
  const operation = method === "POST" ? "Created" : method === "DELETE" ? "Deleted" : "Updated";
  const lower = path.toLowerCase();
  if (lower.includes("reassign")) return "Reassigned operational work";
  if (lower.includes("/assign")) return "Updated assignment";
  if (lower.includes("/status")) return "Updated status";
  if (lower.includes("verification")) return "Reviewed verification";
  if (lower.includes("payout")) return "Recorded payout";
  if (lower.includes("notification")) return "Managed notification campaign";
  return `${operation} ${entityFromPath(path).entityType.replace(/_/g, " ")}`;
}

function entityFromPath(path: string) {
  const parts = path.split("?")[0].split("/").filter(Boolean);
  const apiIndex = parts.indexOf("api");
  const scoped = apiIndex >= 0 ? parts.slice(apiIndex + 1) : parts;
  const withoutAdmin = scoped[0] === "admin" ? scoped.slice(1) : scoped;
  const entityType = withoutAdmin[0]?.replace(/-/g, "_") || "admin_action";
  const entityId = withoutAdmin.find((part, index) => index > 0 && !["status", "assign", "messages", "featured", "approve", "reject", "notify"].includes(part));
  return { entityType, entityId };
}

export function auditAdminMutation(req: Request, res: Response, next: NextFunction) {
  if (!mutationMethods.has(req.method)) return next();

  res.once("finish", () => {
    const actor = req.user;
    if (!actor || !["ADMIN", "SUPER_ADMIN"].includes(actor.role) || res.statusCode >= 400) return;
    const path = req.originalUrl.split("?")[0];
    const { entityType, entityId } = entityFromPath(path);
    void UserModel.findById(actor.id).select("name phone").lean().then((user) =>
      AdminAuditLogModel.create({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: user?.name,
        actorPhone: user?.phone,
        category: classify(path),
        action: actionSummary(req.method, path),
        ...auditRequestContext(req),
        method: req.method,
        path,
        statusCode: res.statusCode,
        entityType,
        entityId,
        summary: actionSummary(req.method, path),
        metadata: { params: req.params, query: req.query }
      })
    ).catch((error) => console.error("Failed to write admin audit log", error));
  });
  next();
}
