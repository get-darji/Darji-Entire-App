export type FlowBackSource = "header" | "hardware" | "gesture" | "button" | "unknown";

export type FlowBackNavigationInput<Step extends string | number> = {
  currentStep: Step;
  steps: readonly Step[];
  onPreviousStep: (previousStep: Step, source: FlowBackSource) => void;
  onExitFlow: (source: FlowBackSource) => void;
  disabled?: boolean;
};

export type FlowBackNavigationResult<Step extends string | number> =
  | { handled: true; action: "previous"; previousStep: Step }
  | { handled: true; action: "exit" }
  | { handled: false; action: "disabled" | "unknown-step" };

export function handleFlowBack<Step extends string | number>(
  input: FlowBackNavigationInput<Step>,
  source: FlowBackSource = "unknown"
): FlowBackNavigationResult<Step> {
  if (input.disabled) return { handled: false, action: "disabled" };

  const currentIndex = input.steps.indexOf(input.currentStep);
  if (currentIndex < 0) return { handled: false, action: "unknown-step" };

  if (currentIndex === 0) {
    input.onExitFlow(source);
    return { handled: true, action: "exit" };
  }

  const previousStep = input.steps[currentIndex - 1];
  input.onPreviousStep(previousStep, source);
  return { handled: true, action: "previous", previousStep };
}

export function previousFlowStep<Step extends string | number>(steps: readonly Step[], currentStep: Step) {
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex > 0 ? steps[currentIndex - 1] : undefined;
}
