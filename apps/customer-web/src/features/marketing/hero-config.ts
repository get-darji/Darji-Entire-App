export const heroSceneConfig = {
  modelPath: "/animations/shirt.glb",
  basePath: "/animations/base.png",
  threadRollPath: "/animations/thread-roll.png",
  scissorsPath: "/animations/scissors.png",
  buttonsPath: "/animations/buttons.png",
  camera: {
    initial: [0.08, 0.08, 4.12] as [number, number, number],
    target: [0, -0.04, 0] as [number, number, number],
    fov: 29
  },
  model: {
    position: [0, 0.02, 0] as [number, number, number],
    scale: 2.08
  },
  scroll: {
    rotate15: Math.PI * 0.24,
    rotate30: Math.PI * 0.56,
    backView: Math.PI * 1.05,
    threeQuarter: Math.PI * 1.72,
    cameraZoom: 3.62,
    cameraShift: 0.42
  }
};

export const heroTrustItems = ["Verified Tailors", "Live Tracking", "On-time Delivery", "Secure Payments"];
