// Need refs: N1/N2. Samples are daily consumption deltas, never cumulative register totals.
export type PilotSample = { room_id: string; measured_date: string; occupied: boolean; kwh: string | number; source: string };
export function evaluatePilot(pilot: { baseline_from: string; baseline_to: string; observation_from: string; observation_to: string; tariff_vnd: string | number }, roomIds: string[], samples: PilotSample[], now = new Date()) {
  const day = (value: string) => Date.parse(value.slice(0, 10) + "T00:00:00Z");
  const days = (a: string, b: string) => Math.round((day(b) - day(a)) / 86400000) + 1;
  const baseline = samples.filter(s => s.source !== "SIMULATOR" && day(s.measured_date) >= day(pilot.baseline_from) && day(s.measured_date) <= day(pilot.baseline_to));
  const observed = samples.filter(s => s.source !== "SIMULATOR" && day(s.measured_date) >= day(pilot.observation_from) && day(s.measured_date) <= day(pilot.observation_to));
  const baselineDays = days(pilot.baseline_from, pilot.baseline_to);
  const observationDays = days(pilot.observation_from, pilot.observation_to);
  const expected = roomIds.length * (baselineDays + observationDays);
  const coverage = expected ? (baseline.length + observed.length) / expected : 0;
  let comparable = 0, expectedKwh = 0, actualKwh = 0;
  for (const sample of observed) {
    const matched = baseline.filter(b => b.room_id === sample.room_id && b.occupied === sample.occupied);
    if (!matched.length) continue;
    comparable++;
    expectedKwh += matched.reduce((sum, b) => sum + Number(b.kwh), 0) / matched.length;
    actualKwh += Number(sample.kwh);
  }
  const perRoomCoverage = roomIds.map(roomId => ({ room_id: roomId,
    baseline: baseline.filter(s => s.room_id === roomId).length / baselineDays,
    observed: observed.filter(s => s.room_id === roomId).length / observationDays }));
  const checks = {
    ten_rooms: roomIds.length >= 10,
    baseline_seven_days: baselineDays >= 7,
    observation_thirty_days: observationDays >= 30,
    period_completed: now.getTime() >= day(pilot.observation_to) + 86400000,
    coverage_90_percent: coverage >= .9 && perRoomCoverage.every(r => r.baseline >= .9 && r.observed >= .9),
    comparable_90_percent: observed.length > 0 && comparable / observed.length >= .9,
    meter_evidence_only: baseline.length + observed.length > 0 && [...baseline, ...observed].every(s => s.source === "METER"),
  };
  return { checks, data_ready: Object.values(checks).every(Boolean), physical_acceptance: "PENDING_SIGNOFF", coverage_pct: coverage * 100,
    expected_samples: expected, valid_samples: baseline.length + observed.length, comparable_samples: comparable, per_room_coverage: perRoomCoverage,
    baseline_normalized_kwh: expectedKwh, observed_comparable_kwh: actualKwh,
    estimated_savings_vnd: comparable ? (expectedKwh - actualKwh) * Number(pilot.tariff_vnd) : null,
    method: "So sánh cùng phòng và trạng thái có khách/trống; số âm là chi phí tăng. Chưa loại trừ ảnh hưởng thời tiết." };
}
