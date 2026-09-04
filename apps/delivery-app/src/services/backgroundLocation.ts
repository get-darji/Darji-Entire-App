import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { api } from "../api";
import { useAppStore } from "../store";

export const DELIVERY_BACKGROUND_LOCATION_TASK = "darji-delivery-background-location";

TaskManager.defineTask(DELIVERY_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
  const position = locations.at(-1);
  if (!position) return;
  await useAppStore.persist.rehydrate();
  const token = useAppStore.getState().token;
  if (!token) return;
  const { latitude, longitude, accuracy, heading, speed } = position.coords;
  await api("/delivery-partners/me/location", {
    method: "PATCH",
    body: JSON.stringify({ latitude, longitude, accuracy, heading, speed })
  }, token).catch(() => undefined);
});

export async function ensureDeliveryBackgroundLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,
    distanceInterval: 10,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Darji live location is active",
      notificationBody: "Your location is being shared while you are online for delivery work.",
      notificationColor: "#F6A313",
      killServiceOnDestroy: false
    }
  });
}

export async function stopDeliveryBackgroundLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK);
  }
}
