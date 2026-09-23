const baseUrl = "https://dwiss-demo-preview.vercel.app";
const forceFailure = process.argv.includes("--force-failure");
const checks = [
  ["/welcome", "Give DWISS the shipment documents"],
  ["/demo", "One sample shipment. No account. No real data."],
];

const failures = [];
for (const [path, expected] of checks) {
  try {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "DWISS-public-demo-monitor/1.0" },
    });
    const body = await response.text();
    if (forceFailure)
      failures.push({ path, reason: "controlled alert-route test" });
    else if (response.status !== 200)
      failures.push({ path, reason: `HTTP ${response.status}` });
    else if (!body.includes(expected))
      failures.push({ path, reason: "expected marker missing" });
  } catch (error) {
    failures.push({
      path,
      reason: error instanceof Error ? error.name : "request failed",
    });
  }
}

const result = {
  status: failures.length === 0 ? "pass" : "fail",
  checkedAt: new Date().toISOString(),
  baseUrl,
  checks: checks.map(([path]) => path),
  ...(failures.length > 0 ? { failures } : {}),
};
console.log(JSON.stringify(result));
if (failures.length > 0) process.exitCode = 1;
