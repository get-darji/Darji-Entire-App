export function mayDeleteOwnTailorQuote(requestStatus: string, quoteStatus: string) {
  return requestStatus === "QUOTE_REQUESTED" && quoteStatus === "SUBMITTED";
}
