/**
 * Customer-app sessions are role-scoped, so the authenticated session can be
 * CUSTOMER even when the account's primary persisted role belongs to another
 * Darji app (or is a protected admin role). For self-service requests, the
 * authenticated user ID is therefore the customer authority.
 *
 * Administrative create-on-behalf flows still require the selected account's
 * primary role to be CUSTOMER.
 */
export function tailoringRequestCustomerFilter(actorRole: string, customerId: string) {
  return actorRole === "CUSTOMER"
    ? { _id: customerId }
    : { _id: customerId, role: "CUSTOMER" as const };
}
