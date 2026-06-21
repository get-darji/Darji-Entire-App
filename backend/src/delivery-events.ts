type DeliveryEventType = "DELIVERY_REQUEST_CREATED" | "DELIVERY_REQUEST_ACCEPTED";

export type DeliveryEvent = {
  id: number;
  type: DeliveryEventType;
  requestId: string;
  deliveryPartnerId?: string;
  createdAt: string;
};

type Waiter = {
  afterId: number;
  deliveryPartnerId?: string;
  resolve: (events: DeliveryEvent[]) => void;
  timer: NodeJS.Timeout;
};

const events: DeliveryEvent[] = [];
const waiters = new Set<Waiter>();
let nextId = 1;

function eventMatchesPartner(event: DeliveryEvent, deliveryPartnerId?: string) {
  if (event.type === "DELIVERY_REQUEST_CREATED") return true;
  if (!event.deliveryPartnerId) return true;
  return event.deliveryPartnerId === deliveryPartnerId;
}

function eventsAfter(afterId: number, deliveryPartnerId?: string) {
  return events.filter((event) => event.id > afterId && eventMatchesPartner(event, deliveryPartnerId));
}

export function latestDeliveryEventId() {
  return events.at(-1)?.id ?? 0;
}

export function emitDeliveryEvent(input: Omit<DeliveryEvent, "id" | "createdAt">) {
  const event: DeliveryEvent = {
    ...input,
    id: nextId,
    createdAt: new Date().toISOString()
  };
  nextId += 1;
  events.push(event);
  if (events.length > 200) events.splice(0, events.length - 200);

  for (const waiter of [...waiters]) {
    const matching = eventsAfter(waiter.afterId, waiter.deliveryPartnerId);
    if (!matching.length) continue;
    clearTimeout(waiter.timer);
    waiters.delete(waiter);
    waiter.resolve(matching);
  }
}

export function waitForDeliveryEvents(afterId: number, deliveryPartnerId?: string, timeoutMs = 60000) {
  const existing = eventsAfter(afterId, deliveryPartnerId);
  if (existing.length) return Promise.resolve(existing);

  return new Promise<DeliveryEvent[]>((resolve) => {
    const waiter: Waiter = {
      afterId,
      deliveryPartnerId,
      resolve,
      timer: setTimeout(() => {
        waiters.delete(waiter);
        resolve([]);
      }, timeoutMs)
    };
    waiters.add(waiter);
  });
}
