import assert from "node:assert/strict";
import { test } from "node:test";
import { mayDeleteOwnTailorQuote } from "../utils/quote-workflow.js";

test("only an unselected submitted quote on an open request can be deleted", () => {
  assert.equal(mayDeleteOwnTailorQuote("QUOTE_REQUESTED", "SUBMITTED"), true);
  assert.equal(mayDeleteOwnTailorQuote("QUOTE_REQUESTED", "RESERVED"), false);
  assert.equal(mayDeleteOwnTailorQuote("QUOTE_REQUESTED", "ACCEPTED"), false);
  assert.equal(mayDeleteOwnTailorQuote("PAYMENT_PENDING", "SUBMITTED"), false);
  assert.equal(mayDeleteOwnTailorQuote("TAILOR_SELECTED", "ACCEPTED"), false);
});
