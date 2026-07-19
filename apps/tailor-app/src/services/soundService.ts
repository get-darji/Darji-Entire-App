import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

export type AppSound = "request" | "confirmation";

const sources = {
  request: require("../../requests.mp3"),
  confirmation: require("../../confirm.mp3")
} as const;

const players: Partial<Record<AppSound, AudioPlayer>> = {};
const loopTimers: Partial<Record<AppSound, ReturnType<typeof setInterval>>> = {};
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

export async function startLoopingAppSound(sound: AppSound, enabled = true, intervalMs = 3600) {
  stopAppSound(sound);
  if (!enabled) return;
  await playAppSound(sound, true);
  loopTimers[sound] = setInterval(() => {
    void playAppSound(sound, true);
  }, intervalMs);
}

export function stopAppSound(sound?: AppSound) {
  const sounds = sound ? [sound] : (Object.keys(players) as AppSound[]);
  sounds.forEach((item) => {
    if (loopTimers[item]) {
      clearInterval(loopTimers[item]);
      delete loopTimers[item];
    }
    const player = players[item] as AudioPlayer & { pause?: () => void };
    try {
      player?.pause?.();
    } catch {
      // Some native audio backends only support replay; the loop timer above is still stopped.
    }
  });
}
