type MetricName = "api" | "db_write" | "html_regenerate";
const observations: Record<MetricName, number[]> = { api: [], db_write: [], html_regenerate: [] };
let webhookSuccess = 0;
let webhookFailure = 0;

export function observeGoLiveMetric(name: MetricName, milliseconds: number) {
  const values = observations[name];
  values.push(milliseconds);
  if (values.length > 1000) values.shift();
}

export function recordGoLiveWebhook(success: boolean) {
  if (success) webhookSuccess += 1;
  else webhookFailure += 1;
}

function quantile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor((sorted.length - 1) * ratio), sorted.length - 1)];
}

export function renderGoLiveMetrics() {
  const lines = [
    "# HELP go_live_progress_duration_milliseconds Processing duration by operation.",
    "# TYPE go_live_progress_duration_milliseconds gauge",
  ];
  for (const [operation, values] of Object.entries(observations)) {
    lines.push(`go_live_progress_duration_milliseconds{operation="${operation}",quantile="0.50"} ${quantile(values, .5).toFixed(2)}`);
    lines.push(`go_live_progress_duration_milliseconds{operation="${operation}",quantile="0.95"} ${quantile(values, .95).toFixed(2)}`);
    lines.push(`go_live_progress_observations_total{operation="${operation}"} ${values.length}`);
  }
  lines.push("# TYPE go_live_progress_webhooks_total counter");
  lines.push(`go_live_progress_webhooks_total{outcome="success"} ${webhookSuccess}`);
  lines.push(`go_live_progress_webhooks_total{outcome="failure"} ${webhookFailure}`);
  return `${lines.join("\n")}\n`;
}
