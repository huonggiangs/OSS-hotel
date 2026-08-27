"use client";

import type { LegendItem } from "@/lib/room-status";
import { Donut, buildConicGradient } from "@/components/ui/Donut";

export interface RoomFilters {
  zone: string;
  floor: string;
  type: string;
  status: string;
}

// 4 panel donut "Khu vực / Theo sơ đồ tầng / Trạng thái phòng / Theo loại phòng" —
// pixel-perfect theo khối đầu `isRooms` (dòng 627-691 trong bản gốc). Bấm vào 1 mục
// legend để lọc lưới phòng bên dưới; bấm lại vào chính giữa donut để bỏ lọc.
export function RoomFilterPanels({
  zoneLegend,
  floorLegend,
  statusLegend,
  typeLegend,
  roomTotal,
  filters,
  onChange,
}: {
  zoneLegend: LegendItem[];
  floorLegend: LegendItem[];
  statusLegend: (LegendItem & { key: string })[];
  typeLegend: LegendItem[];
  roomTotal: number;
  filters: RoomFilters;
  onChange: (next: RoomFilters) => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Panel title="Khu vực" count={zoneLegend.length} unit="khu vực" total={undefined}>
        <Donut
          gradient={buildConicGradient(zoneLegend)}
          onClick={() => onChange({ ...filters, zone: "all" })}
          title="Bấm để xem tất cả khu vực"
        >
          <b className="text-[15px]">{zoneLegend.length}</b>
          <span className="text-[9px] text-pms-muted">khu vực</span>
        </Donut>
        {zoneLegend.map((z) => (
          <LegendRow key={z.label} item={z} active={filters.zone === z.label} onClick={() => onChange({ ...filters, zone: filters.zone === z.label ? "all" : z.label })} />
        ))}
      </Panel>

      <Panel title="Theo sơ đồ tầng">
        <Donut
          gradient={buildConicGradient(floorLegend)}
          onClick={() => onChange({ ...filters, floor: "all" })}
          title="Bấm để xem tất cả tầng"
        >
          <b className="text-[15px]">{floorLegend.length}</b>
          <span className="text-[9px] text-pms-muted">tầng</span>
        </Donut>
        {floorLegend.map((f) => {
          const floorValue = f.label.replace("Tầng ", "");
          return (
            <LegendRow key={f.label} item={f} active={filters.floor === floorValue} onClick={() => onChange({ ...filters, floor: filters.floor === floorValue ? "all" : floorValue })} />
          );
        })}
      </Panel>

      <Panel title="Trạng thái phòng">
        <Donut
          gradient={buildConicGradient(statusLegend)}
          onClick={() => onChange({ ...filters, status: "all" })}
          title="Bấm để xem tất cả trạng thái"
        >
          <b className="text-[15px]">{roomTotal}</b>
          <span className="text-[9px] text-pms-muted">phòng</span>
        </Donut>
        {statusLegend.map((s) => (
          <LegendRow key={s.key} item={s} active={filters.status === s.key} onClick={() => onChange({ ...filters, status: filters.status === s.key ? "all" : s.key })} />
        ))}
      </Panel>

      <Panel title="Theo loại phòng">
        <Donut
          gradient={buildConicGradient(typeLegend)}
          onClick={() => onChange({ ...filters, type: "all" })}
          title="Bấm để xem tất cả loại phòng"
        >
          <b className="text-[15px]">{typeLegend.length}</b>
          <span className="text-[9px] text-pms-muted">loại</span>
        </Donut>
        {typeLegend.map((t) => (
          <LegendRow key={t.label} item={t} active={filters.type === t.label} onClick={() => onChange({ ...filters, type: filters.type === t.label ? "all" : t.label })} />
        ))}
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; count?: number; unit?: string; total?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-[18px] shadow-card">
      <h3 className="mb-3 text-[14px] font-semibold">{title}</h3>
      <div className="flex flex-col items-center gap-3">{children}</div>
    </div>
  );
}

function LegendRow({ item, active, onClick }: { item: LegendItem; active: boolean; onClick: () => void }) {
  return (
    <div className="w-full">
      <div
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] hover:bg-pms-divider"
        style={{ background: active ? "#EEF1FB" : "transparent" }}
        onClick={onClick}
      >
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: item.color }} />
        {item.label} <b>{item.count}</b> <span className="text-pms-muted">({item.pct}%)</span>
      </div>
    </div>
  );
}
