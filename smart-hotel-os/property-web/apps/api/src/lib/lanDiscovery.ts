import { createSocket, type Socket } from "node:dgram";

export function startLanDiscovery(): Socket | null {
  if (process.env.DISABLE_LAN_DISCOVERY === "1") return null;
  const port = Number(process.env.LAN_DISCOVERY_PORT) || 53535;
  const socket = createSocket("udp4");
  socket.on("message", (message, remote) => {
    try {
      const request = JSON.parse(message.toString("utf8")) as { type?: string; nonce?: string };
      if (request.type !== "ANIO_DISCOVER_V1" || !request.nonce) return;
      const response = Buffer.from(JSON.stringify({
        service: "ANIO_PMS", apiVersion: 1, nonce: request.nonce,
        protocol: "http", port: 3100, apiPath: "/api/backend",
      }));
      socket.send(response, remote.port, remote.address);
    } catch {
      // Bỏ qua gói UDP không đúng định dạng; không ghi payload không tin cậy vào log.
    }
  });
  socket.on("error", (error) => console.error("[lan-discovery]", error.message));
  socket.bind(port, "0.0.0.0", () => console.log(`[lan-discovery] UDP ${port} sẵn sàng`));
  return socket;
}
