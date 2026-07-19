type TailoringEventType = "REQUEST_CREATED" | "QUOTE_ACCEPTED" | "TAILORING_REQUEST_DECLINED";

export type TailoringEvent = {
  id: number;
  type: TailoringEventType;
  requestId: string;
  quoteId?: string;
  tailorId?: string;
  reason?: string;
  createdAt: string;
};

type Waiter = {
  afterId: number;
  tailorId?: string;
  resolve: (events: TailoringEvent[]) => void;
  timer: NodeJS.Timeout;
};

const events: TailoringEvent[] = [];
const waiters = new Set<Waiter>();
let nextId = 1;

function eventMatchesTailor(event: TailoringEvent, tailorId?: string) {
  if (event.type === "REQUEST_CREATED") return true;
  if (!event.tailorId) return true;
  return event.tailorId === tailorId;
}

function eventsAfter(afterId: number, tailorId?: string) {
  return events.filter((event) => event.id > afterId && eventMatchesTailor(event, tailorId));
}

export function latestTailoringEventId() {
  return events.at(-1)?.id ?? 0;
}

export function emitTailoringEvent(input: Omit<TailoringEvent, "id" | "createdAt">) {
  const event: TailoringEvent = {
    ...input,
    id: nextId,
    createdAt: new Date().toISOString()
  };
  nextId += 1;
  events.push(event);
  if (events.length > 200) events.splice(0, events.length - 200);

  for (const waiter of [...waiters]) {
    const matching = eventsAfter(waiter.afterId, waiter.tailorId);
    if (!matching.length) continue;
    clearTimeout(waiter.timer);
    waiters.delete(waiter);
    waiter.resolve(matching);
  }
}

export function waitForTailoringEvents(afterId: number, tailorId?: string, timeoutMs = 60000) {
  const existing = eventsAfter(afterId, tailorId);
  if (existing.length) return Promise.resolve(existing);

  return new Promise<TailoringEvent[]>((resolve) => {
    const waiter: Waiter = {
      afterId,
      tailorId,
      resolve,
      timer: setTimeout(() => {
        waiters.delete(waiter);
        resolve([]);
      }, timeoutMs)
    };
    waiters.add(waiter);
  });
}
