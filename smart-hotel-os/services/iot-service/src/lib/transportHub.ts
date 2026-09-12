import { createServer, type Server, type Socket } from "node:net";
import { connect, type MqttClient } from "mqtt";
import { deviceGateway, type GatewayTransport } from "./deviceGateway";
import type { Device, DeviceCommand } from "../types/domain";

type WireMessage = {
  type: "auth" | "heartbeat" | "telemetry" | "ack";
  assetCode?: string;
  deviceKey?: string;
  payload?: unknown;
  commandId?: string;
  result?: { success: boolean; message?: string; data?: unknown };
};

function send(socket: Socket, value: unknown) {
  socket.write(`${JSON.stringify(value)}\n`);
}

class TransportHub {
  private mqttClient: MqttClient | null = null;
  private tcpServer: Server | null = null;
  private sockets = new Map<string, Socket>();

  start() {
    this.startMqtt();
    this.startTcp();
  }

  private startMqtt() {
    const url = process.env.MQTT_URL;
    if (!url) return;
    this.mqttClient = connect(url, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      reconnectPeriod: 5000,
    });
    this.mqttClient.on("connect", () => this.mqttClient?.subscribe("hotel/+/up", { qos: 1 }));
    this.mqttClient.on("message", async (topic, buffer) => {
      const assetCode = topic.split("/")[1];
      try {
        const message = JSON.parse(buffer.toString("utf8")) as WireMessage;
        await this.handleMessage("MQTT", assetCode, message.deviceKey ?? "", message);
      } catch (error) {
        console.error("[mqtt] Bản tin thiết bị không hợp lệ:", (error as Error).message);
      }
    });
    this.mqttClient.on("error", (error) => console.error("[mqtt]", error.message));
  }

  private startTcp() {
    const port = Number(process.env.TCP_DEVICE_PORT || 0);
    if (!port) return;
    this.tcpServer = createServer((socket) => {
      let buffer = "";
      let auth: { assetCode: string; deviceKey: string } | null = null;
      socket.setKeepAlive(true, 30_000);
      socket.on("data", async (chunk) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          try {
            const message = JSON.parse(line) as WireMessage;
            if (message.type === "auth") {
              if (!message.assetCode || !message.deviceKey) throw new Error("AUTH_FIELDS_REQUIRED");
              await deviceGateway.authenticate(message.assetCode, message.deviceKey);
              auth = { assetCode: message.assetCode, deviceKey: message.deviceKey };
              this.sockets.set(auth.assetCode, socket);
              send(socket, { type: "auth_ok", assetCode: auth.assetCode });
              continue;
            }
            if (!auth) throw new Error("AUTH_REQUIRED");
            const response = await this.handleMessage("TCP", auth.assetCode, auth.deviceKey, message);
            send(socket, { type: "ok", requestType: message.type, ...response });
          } catch (error) {
            send(socket, { type: "error", code: (error as Error).message });
          }
        }
      });
      socket.on("close", () => {
        for (const [assetCode, current] of this.sockets) if (current === socket) this.sockets.delete(assetCode);
      });
    });
    this.tcpServer.listen(port, "0.0.0.0", () => console.log(`[tcp] Cổng thiết bị đang nghe tại ${port}`));
  }

  private async handleMessage(transport: GatewayTransport, assetCode: string, deviceKey: string, message: WireMessage) {
    if (message.type === "heartbeat") {
      await deviceGateway.heartbeat(assetCode, deviceKey, transport, message.payload);
      return { recorded: true };
    }
    if (message.type === "telemetry") {
      await deviceGateway.telemetry(assetCode, deviceKey, transport, message.payload ?? {});
      return { recorded: true };
    }
    if (message.type === "ack" && message.commandId && message.result) {
      const command = await deviceGateway.acknowledge(assetCode, deviceKey, message.commandId, transport, message.result);
      return { commandId: command.id, status: command.status };
    }
    throw new Error("MESSAGE_TYPE_INVALID");
  }

  async publishCommand(device: Device, command: DeviceCommand): Promise<boolean> {
    const message = JSON.stringify({ type: "command", command });
    if (device.connection_protocol === "TCP") {
      const socket = device.asset_code ? this.sockets.get(device.asset_code) : undefined;
      if (!socket) return false;
      send(socket, JSON.parse(message));
      return true;
    }
    if (device.connection_protocol === "MQTT" && this.mqttClient?.connected && device.asset_code) {
      this.mqttClient.publish(`hotel/${device.asset_code}/down`, message, { qos: 1 });
      return true;
    }
    if (device.connection_protocol === "FIREBASE" && process.env.FIREBASE_BRIDGE_URL) {
      const response = await fetch(process.env.FIREBASE_BRIDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.FIREBASE_BRIDGE_TOKEN ?? ""}` },
        body: message,
      });
      return response.ok;
    }
    return false;
  }

  close() {
    this.mqttClient?.end(true);
    this.tcpServer?.close();
    for (const socket of this.sockets.values()) socket.destroy();
  }
}

export const transportHub = new TransportHub();
