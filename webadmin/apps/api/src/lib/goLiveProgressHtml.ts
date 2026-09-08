import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { goLiveProgressRepo, type GoLiveProgressLog } from "../repositories/goLiveProgress.repo";
import { observeGoLiveMetric } from "./goLiveMetrics";

const readiness = [
  ["N1 · Tăng lợi nhuận", 33, "Giá, dịch vụ, đặt phòng đã có; OTA thật và lợi nhuận hợp nhất còn thiếu."],
  ["N2 · Giảm chi phí", 33, "Có lệnh điện và sổ kWh; chưa có công tơ thật/baseline."],
  ["N3 · Giảm phụ thuộc nhân sự", 44, "PMS vận hành được; CRM đa kênh và client offline đầy đủ còn thiếu."],
  ["N4 · Quản lý từ xa", 29, "HQ/heartbeat/cảnh báo đã có; MFA, VPN, thông báo và HA chưa nghiệm thu."],
  ["N5 · Giảm rủi ro", 33, "RBAC/audit/backup có nền tảng; pentest, restore drill và SLA thật còn thiếu."],
  ["Module", 43, "0/7 module đạt đầy đủ mọi tiêu chí; 6 đang sẵn sàng kiểm thử, 1 còn thiếu."],
  ["Acceptance Criteria", 45, "9/20 đạt; 7/20 cần thêm bằng chứng; 4/20 còn thiếu."],
] as const;

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}
function statusMeta(status: GoLiveProgressLog["status"]) {
  if (status === "DONE") return ["Đã xong", "done"];
  if (status === "IN_PROGRESS") return ["Đang làm", "working"];
  return ["Còn thiếu", "missing"];
}
function evidence(value: string) {
  const safe = escapeHtml(value);
  const first = value.split(/[;,]/)[0].trim().replace(/\\/g, "/");
  let href=first;
  if(first.startsWith("smart-hotel-os/docs/")) href=first.slice("smart-hotel-os/docs/".length);
  else if(first.startsWith("webadmin/") || first.startsWith(".github/")) href=`../../${first}`;
  if (/^[\w./() -]+\.(md|html|sql|ts|tsx|yml|yaml)$/i.test(first)) return `<a href="${escapeHtml(href)}">${safe}</a>`;
  return safe;
}
function rowsHtml(logs: GoLiveProgressLog[]) {
  return logs.map(log => {
    const [label, css] = statusMeta(log.status);
    const time = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit" }).format(new Date(log.completed_at));
    return `<tr><td>${escapeHtml(time)}</td><td>${escapeHtml(log.session_description)}</td><td>${escapeHtml(log.related_items.join(", "))}</td><td><span class="badge ${css}">${label}</span></td><td>${evidence(log.evidence)}</td><td>${escapeHtml(log.performed_by)}</td><td>${escapeHtml(log.notes ?? "—")}</td></tr>`;
  }).join("\n");
}

export async function regenerateGoLiveProgressHtml() {
  const started = performance.now();
  const logs = await goLiveProgressRepo.all();
  const target = process.env.GO_LIVE_PROGRESS_HTML_PATH ?? path.resolve(process.cwd(), "../../../smart-hotel-os/docs/GO_LIVE_PROGRESS.html");
  const cards = readiness.map(([label,pct,note]) => `<article><h3>${escapeHtml(label)}</h3><strong>${pct}%</strong><div class="bar"><i style="width:${pct}%"></i></div><p>${escapeHtml(note)}</p></article>`).join("\n");
  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Theo dõi tiến trình Go-live — Smart Hotel OS</title><style>
:root{--ink:#172033;--muted:#5b6578;--line:#dfe5ef;--brand:#165dce;--done:#087443;--warn:#a35a00;--gray:#667085}*{box-sizing:border-box}body{margin:0;background:#f1f4f9;color:var(--ink);font:14px/1.5 system-ui,"Segoe UI",sans-serif}main{max-width:1440px;margin:auto;padding:28px 18px 60px}h1{margin:0;font-size:29px}h2{margin:30px 0 12px}.lead{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.grid article,.callout{background:#fff;border:1px solid var(--line);border-radius:13px;padding:15px}.grid strong{font-size:24px;color:var(--brand)}.grid h3{margin:0 0 8px}.grid p{color:var(--muted);font-size:12px}.bar{height:7px;background:#e9edf4;border-radius:9px;overflow:hidden}.bar i{display:block;height:100%;background:var(--brand)}.table-wrap{overflow:auto;background:#fff;border:1px solid var(--line);border-radius:13px}table{border-collapse:collapse;min-width:1200px;width:100%}th,td{padding:10px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}th{background:#eef3fb;position:sticky;top:0}.badge{display:inline-block;padding:2px 8px;border-radius:999px;white-space:nowrap;font-weight:700}.done{background:#dff7ea;color:var(--done)}.working{background:#fff0d8;color:var(--warn)}.missing{background:#e9edf4;color:var(--gray)}a{color:var(--brand)}code{background:#f3f5f8;padding:2px 5px;border-radius:4px}@media(max-width:700px){main{padding:18px 10px}h1{font-size:23px}}
</style></head><body><main><h1>Theo dõi tiến trình Go-live — Smart Hotel OS</h1><p class="lead">Nguồn chính: PostgreSQL <code>go_live_progress_logs</code>. Cập nhật mới nhất được hiển thị trước. Phần trăm là tỷ lệ đạt nghiêm ngặt theo bằng chứng hiện có, không phải tỷ lệ hoàn thành kế hoạch.</p>
<h2>Tổng quan mức sẵn sàng</h2><section class="grid">${cards}</section>
<h2>Cập nhật mới nhất</h2><div class="table-wrap"><table><thead><tr><th>Thời gian hoàn thành</th><th>Phiên làm việc / Mô tả</th><th>Hạng mục liên quan</th><th>Trạng thái</th><th>Bằng chứng</th><th>Người thực hiện</th><th>Ghi chú</th></tr></thead><tbody>${rowsHtml(logs)}</tbody></table></div>
<div class="callout"><strong>Nguyên tắc:</strong> chỉ chuyển “Đã xong” khi có file, commit hoặc kết quả kiểm thử cụ thể. Thiết bị thật, credential đối tác và KPI trước/sau vẫn ở “Đang làm” cho tới khi nghiệm thu.</div>
</main></body></html>\n`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
  const durationMs = performance.now() - started;
  observeGoLiveMetric("html_regenerate", durationMs);
  return { path: target, rows: logs.length, durationMs };
}
