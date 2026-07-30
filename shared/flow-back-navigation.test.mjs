import assert from "node:assert/strict";
import { handleFlowBack, previousFlowStep } from "./dist/flow-back-navigation.js";

const steps = ["step1", "step2", "step3", "step4"];
const calls = [];

const previousResult = handleFlowBack({
  currentStep: "step4",
  steps,
  onPreviousStep: (step, source) => calls.push(["previous", step, source]),
  onExitFlow: (source) => calls.push(["exit", source])
}, "hardware");

assert.deepEqual(previousResult, { handled: true, action: "previous", previousStep: "step3" });
assert.deepEqual(calls.pop(), ["previous", "step3", "hardware"]);

handleFlowBack({
  currentStep: "step3",
  steps,
  onPreviousStep: (step, source) => calls.push(["previous", step, source]),
  onExitFlow: (source) => calls.push(["exit", source])
}, "header");
assert.deepEqual(calls.pop(), ["previous", "step2", "header"]);

const exitResult = handleFlowBack({
  currentStep: "step1",
  steps,
  onPreviousStep: (step, source) => calls.push(["previous", step, source]),
  onExitFlow: (source) => calls.push(["exit", source])
}, "button");

assert.deepEqual(exitResult, { handled: true, action: "exit" });
assert.deepEqual(calls.pop(), ["exit", "button"]);
assert.equal(previousFlowStep(steps, "step2"), "step1");
assert.equal(previousFlowStep(steps, "step1"), undefined);

console.log("flow-back-navigation tests passed");
