const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL ?? "http://localhost:4103";
const IOT_SERVICE_API_KEY = process.env.IOT_SERVICE_API_KEY;

export type IotProtocol = "HTTP" | "MQTT" | "TCP" | "FIREBASE";

export async function registerIotDevice(input: {
  id: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  deviceType: string;
  name: string;
  assetCode: string;
  connectionProtocol: IotProtocol;
  brand?: string;
  model?: string;
  protocolConfig?: Record<string, unknown>;
}) {
  if (!IOT_SERVICE_API_KEY) throw new Error("IOT_SERVICE_API_KEY chưa được cấu hình.");
  const response = await fetch(`${IOT_SERVICE_URL}/api/v1/devices/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Service-Api-Key": IOT_SERVICE_API_KEY },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; device?: unknown; device_key?: string };
  if (!response.ok) throw new Error(body.message ?? `iot-service trả về ${response.status}`);
  return body as { device: { id: string; connection_protocol: IotProtocol }; device_key: string };
}
