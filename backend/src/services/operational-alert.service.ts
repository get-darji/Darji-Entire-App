import { env } from "../env.js";
import { OperationalAlertModel, TailorQuoteModel, TailoringRequestModel, UserModel } from "../models.js";
import { sendOperationalAlertEmail } from "./email-alert.service.js";

type AlertInput = {
  type: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  dedupeKey: string;
  entityType?: string;
  entityId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
};

export async function upsertOperationalAlert(input: AlertInput) {
  const alert = await OperationalAlertModel.findOneAndUpdate(
    { dedupeKey: input.dedupeKey },
    {
      $setOnInsert: {
        type: input.type,
        severity: input.severity ?? "WARNING",
        title: input.title,
        message: input.message,
        dedupeKey: input.dedupeKey,
        entityType: input.entityType,
        entityId: input.entityId,
        customerId: input.customerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        metadata: input.metadata ?? {},
        status: "OPEN"
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  if (input.sendEmail && alert && !alert.emailSentAt) {
    try {
      await sendOperationalAlertEmail({
        subject: input.title,
        text: `${input.message}\n\nEntity: ${input.entityType ?? "unknown"} ${input.entityId ?? ""}`,
        metadata: input.metadata
      });
      await OperationalAlertModel.updateOne({ _id: alert.id }, { $set: { emailSentAt: new Date() }, $unset: { emailError: 1 } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email failure";
      console.error("[alerts] Failed to send alert email", message);
      await OperationalAlertModel.updateOne({ _id: alert.id }, { $set: { emailError: message } });
    }
  }

  return alert;
}

export async function resolveOperationalAlert(dedupeKey: string, userId?: string) {
  return OperationalAlertModel.findOneAndUpdate(
    { dedupeKey, status: { $ne: "RESOLVED" } },
    { $set: { status: "RESOLVED", resolvedAt: new Date(), resolvedBy: userId } },
    { returnDocument: "after" }
  );
}

export async function monitorNoQuoteRequests(now = new Date()) {
  const thresholdMs = Math.max(1, env.NO_QUOTE_ALERT_MINUTES) * 60 * 1000;
  const cutoff = new Date(now.getTime() - thresholdMs);
  const requests = await TailoringRequestModel.find({
    status: "QUOTE_REQUESTED",
    createdAt: { $lte: cutoff }
  }).sort({ createdAt: 1 }).limit(100);

  for (const request of requests) {
    const quoteCount = await TailorQuoteModel.countDocuments({ requestId: request.id, status: { $in: ["SUBMITTED", "RESERVED", "ACCEPTED"] } });
    const dedupeKey = `NO_QUOTE:${request.id}`;
    if (quoteCount > 0) {
      await resolveOperationalAlert(dedupeKey);
      continue;
    }
    const customer = await UserModel.findById(request.customerId).select("name phone");
    const waitingMinutes = Math.floor((now.getTime() - new Date(request.createdAt).getTime()) / 60000);
    await upsertOperationalAlert({
      type: "NO_QUOTE",
      severity: "WARNING",
      title: "No quote received",
      message: `${request.clothType} request has been waiting ${waitingMinutes} minutes for tailor quotes.`,
      dedupeKey,
      entityType: "tailoring_request",
      entityId: request.id,
      customerId: request.customerId,
      customerName: customer?.name ?? undefined,
      customerPhone: customer?.phone ?? undefined,
      metadata: {
        requestId: request.id,
        service: request.workType,
        garment: request.clothType,
        location: request.pickupAddress,
        requestTime: request.createdAt,
        waitingMinutes
      },
      sendEmail: true
    });
  }
}
