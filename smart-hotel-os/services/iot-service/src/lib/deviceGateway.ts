import { devicesRepo } from "../repositories/devices.repo";
import { commandsRepo } from "../repositories/commands.repo";
import { heartbeatsRepo } from "../repositories/heartbeats.repo";
import { verifyDeviceKey } from "./deviceCredentials";
import type { Device, DeviceCommand } from "../types/domain";

export type GatewayTransport = "HTTP" | "MQTT" | "TCP" | "FIREBASE";

async function requireDevice(assetCode: string, deviceKey: string): Promise<Device> {
  const device = await devicesRepo.findByAssetCode(assetCode);
  if (!device || !(await verifyDeviceKey(deviceKey, device.credential_hash))) {
    throw new Error("DEVICE_AUTH_FAILED");
  }
  return device;
}

export const deviceGateway = {
  authenticate: requireDevice,

  async heartbeat(assetCode: string, deviceKey: string, transport: GatewayTransport, payload: unknown = {}) {
    const device = await requireDevice(assetCode, deviceKey);
    const updated = await devicesRepo.touchHeartbeat(device.id);
    const window = await heartbeatsRepo.record({
      tenantId: device.tenant_id,
      propertyId: device.property_id,
      deviceId: device.id,
      online: true,
      powerState: device.power_state,
    });
    await devicesRepo.recordEvent(device.id, "HEARTBEAT", transport, payload);
    return { device: updated, window };
  },

  async telemetry(assetCode: string, deviceKey: string, transport: GatewayTransport, payload: unknown) {
    const device = await requireDevice(assetCode, deviceKey);
    return devicesRepo.recordTelemetry(device.id, transport, payload);
  },

  async pendingCommands(assetCode: string, deviceKey: string) {
    const device = await requireDevice(assetCode, deviceKey);
    const commands = await commandsRepo.listByDevice(device.id, "PENDING");
    return { device, commands };
  },

  async acknowledge(
    assetCode: string,
    deviceKey: string,
    commandId: string,
    transport: GatewayTransport,
    result: { success: boolean; message?: string; data?: unknown }
  ): Promise<DeviceCommand> {
    const device = await requireDevice(assetCode, deviceKey);
    const command = await commandsRepo.findById(commandId);
    if (!command || command.device_id !== device.id) throw new Error("COMMAND_NOT_FOUND");
    if (command.status === "ACKED") return command;
    const checked = await commandsRepo.expireIfOverdue(command);
    if (checked.status === "TIMEOUT") throw new Error("COMMAND_TIMEOUT");
    const acked = await commandsRepo.markAcked(commandId, result);
    if (!acked) throw new Error("COMMAND_NOT_PENDING");
    if (result.success && (command.command_type === "POWER_ON" || command.command_type === "CHECKIN")) await devicesRepo.updatePowerState(device.id, "ON");
    if (result.success && (command.command_type === "POWER_OFF" || command.command_type === "CHECKOUT")) await devicesRepo.updatePowerState(device.id, "OFF");
    await devicesRepo.touchHeartbeat(device.id);
    await devicesRepo.recordEvent(device.id, "COMMAND_ACK", transport, { commandId, result });
    return acked;
  },
};
