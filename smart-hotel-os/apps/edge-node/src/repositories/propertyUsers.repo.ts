import { pool } from "../lib/db";
import type { PropertyUser } from "../types/domain";

export const propertyUsersRepo = {
  async findByUsernameOrEmail(identifier: string): Promise<PropertyUser | null> {
    const { rows } = await pool.query<PropertyUser>(
      `SELECT * FROM property_users WHERE username = $1 OR email = $1`,
      [identifier]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<PropertyUser | null> {
    const { rows } = await pool.query<PropertyUser>(`SELECT * FROM property_users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async countAll(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM property_users`);
    return Number(rows[0]?.count ?? 0);
  },

  // updateProfileFromCloud — GIỚI HẠN CÓ CHỦ ĐÍCH (xem README.md mục "Đồng bộ
  // property_users"): endpoint GET /api/v1/users của Cloud property-web KHÔNG
  // (và KHÔNG NÊN) trả về password_hash ra ngoài (đúng — property-web/apps/api/
  // src/routes/users.routes.ts cố tình loại field này khỏi mọi response). Vì
  // vậy Edge Node KHÔNG THỂ đồng bộ mật khẩu thật từ Cloud xuống qua API công
  // khai hiện có — chỉ đồng bộ các trường KHÔNG nhạy cảm (họ tên/vai trò/trạng
  // thái) cho user đã tồn tại cục bộ (khớp theo username), KHÔNG BAO GIỜ đụng
  // tới password_hash, và KHÔNG tự tạo user mới cục bộ nếu chưa có mật khẩu.
  // Tài khoản demo cục bộ được seed sẵn khi bootstrap (cùng mật khẩu demo với
  // Cloud) để đăng nhập offline hoạt động ngay — xem embeddedBootstrap.ts.
  //
  // Theo dõi: muốn đồng bộ mật khẩu thật an toàn cần 1 endpoint nội bộ riêng ở
  // property-web (bảo vệ bằng internal-service-key/mTLS, CHỈ Edge Node đã xác
  // thực gọi được) — chưa làm ở bản này, ghi trong PROGRESS.md/README.md.
  async updateProfileFromCloud(user: {
    username: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
  }): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE property_users SET email = $2, full_name = $3, role = $4, status = $5, updated_at = now()
       WHERE username = $1`,
      [user.username, user.email, user.full_name, user.role, user.status]
    );
    return (rowCount ?? 0) > 0;
  },
};
