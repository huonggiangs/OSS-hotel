// Need refs: N4, N5. Bounded per-process admission, not a distributed quota.
export function boundedInteger(value: string | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) throw new Error("Invalid runtime limit");
  return number;
}

export class AdmissionGate {
  private active = 0;
  private draining = false;
  constructor(readonly limit: number) {}
  enter(): (() => void) | null {
    if (this.draining || this.active >= this.limit) return null;
    this.active++;
    let released = false;
    return () => { if (!released) { released = true; this.active--; } };
  }
  drain() { this.draining = true; }
  get ready() { return !this.draining; }
  get inFlight() { return this.active; }
}
