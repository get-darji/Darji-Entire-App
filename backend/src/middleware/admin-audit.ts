import type { NextFunction, Request, Response } from "express";
import { AdminAuditLogModel, UserModel } from "../models.js";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
    void UserModel.findById(actor.id).select("name").lean().then((user) =>
      AdminAuditLogModel.create({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: user?.name,
        method: req.method,
        path,
        statusCode: res.statusCode,
        entityType,
        entityId,
        summary: `${req.method} ${path}`,
        metadata: { params: req.params, query: req.query }
      })
    ).catch((error) => console.error("Failed to write admin audit log", error));
  });
  next();
}
