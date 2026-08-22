import { pool } from "../lib/db";

export interface PropertyImage {
  id: string;
  property_id: string;
  tenant_id: string;
  room_type_id: string | null;
  room_type_name: string | null;
  file_name: string;
  mime_type: "image/png" | "image/jpeg" | "image/webp";
  data_url: string;
  created_by: string | null;
  created_at: Date;
}

export const propertyImagesRepo = {
  async list(propertyId: string): Promise<PropertyImage[]> {
    const { rows } = await pool.query<PropertyImage>(
      `SELECT pi.*, rt.name AS room_type_name
       FROM property_images pi
       LEFT JOIN room_types rt ON rt.id = pi.room_type_id
       WHERE pi.property_id = $1
       ORDER BY pi.created_at ASC`,
      [propertyId]
    );
    return rows;
  },

  async create(input: {
    propertyId: string;
    tenantId: string;
    roomTypeId: string | null;
    fileName: string;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    dataUrl: string;
    createdBy: string;
  }): Promise<PropertyImage> {
    const { rows } = await pool.query<PropertyImage>(
      `INSERT INTO property_images
        (id, property_id, tenant_id, room_type_id, file_name, mime_type, data_url, created_by)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7)
       RETURNING *, NULL::text AS room_type_name`,
      [input.propertyId, input.tenantId, input.roomTypeId, input.fileName, input.mimeType, input.dataUrl, input.createdBy]
    );
    return rows[0];
  },
};
