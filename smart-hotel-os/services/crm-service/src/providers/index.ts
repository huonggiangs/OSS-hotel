import type { NotificationProvider } from "./notificationProvider";
import { ConsoleNotificationProvider } from "./consoleNotificationProvider";

const PROVIDERS: Record<string, NotificationProvider> = {
  console: new ConsoleNotificationProvider(),
};

/** Registry trung tâm — đổi biến môi trường NOTIFICATION_PROVIDER khi cắm provider thật. */
export function getNotificationProvider(): NotificationProvider {
  const key = process.env.NOTIFICATION_PROVIDER || "console";
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new Error(`Không tìm thấy NotificationProvider '${key}'. Các provider có sẵn: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  return provider;
}
