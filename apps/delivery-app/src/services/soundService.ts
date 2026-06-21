import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

export type AppSound = "request" | "confirmation";

const sources = {
  request: require("../../requests.mp3"),
  confirmation: require("../../confirm.mp3")
} as const;

const players: Partial<Record<AppSound, AudioPlayer>> = {};
let audioModeReady = false;

export async function playAppSound(sound: AppSound, enabled = true) {
  if (!enabled) return;
  try {
    if (!audioModeReady) {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" });
      audioModeReady = true;
    }
    const player = players[sound] ?? createAudioPlayer(sources[sound]);
    players[sound] = player;
    await player.seekTo(0);
    player.play();
  } catch (error) {
    console.warn(`Could not play ${sound} sound`, error);
  }
}
