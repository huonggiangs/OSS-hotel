import fs from "node:fs";
import path from "node:path";

const roots = [
  "webadmin/apps/web/src",
  "smart-hotel-os/property-web/apps/web/src",
  "smart-hotel-os/apps/edge-node/public",
];
const extensions = new Set([".tsx", ".jsx", ".html"]);
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) inspect(full);
  }
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function inspect(file) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/<button\b([^>]*)>/gi)) {
    const attrs = match[1];
    const type = attrs.match(/\btype\s*=\s*["'](button|submit|reset)["']/i)?.[1]?.toLowerCase();
    const handler = /\bonClick\s*=|\bonclick\s*=/i.test(attrs);
    if (!type) findings.push(`${file}:${lineOf(source, match.index)} nút thiếu type rõ ràng`);
    if (type === "button" && !handler) findings.push(`${file}:${lineOf(source, match.index)} nút type=button thiếu hành động`);
  }
  for (const match of source.matchAll(/<(ButtonPrimary|ButtonGhost)\b([^>]*)>/g)) {
    if (!/\bonClick\s*=/.test(match[2])) findings.push(`${file}:${lineOf(source, match.index)} ${match[1]} thiếu hành động`);
  }
  for (const match of source.matchAll(/href\s*=\s*["']#["']/g)) {
    findings.push(`${file}:${lineOf(source, match.index)} liên kết href=# không có đích`);
  }
}

for (const root of roots) walk(root);
if (findings.length) {
  console.error(`Phát hiện ${findings.length} điều khiển không an toàn:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log("UI action audit: tất cả nút có loại và hành động rõ ràng.");
