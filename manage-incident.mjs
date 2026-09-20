const failed = process.argv.includes("--failed");
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const runUrl = `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`;
if (!repository || !token)
  throw new Error("GitHub workflow context is required.");

const [owner, repo] = repository.split("/");
const pendingTitle = "[monitor:pending] DWISS demo availability check failed";
const incidentTitle = "[monitor] Public demo unavailable";
const issues = await api(
  `/repos/${owner}/${repo}/issues?state=open&per_page=100`,
);
const pending = issues.find((issue) => issue.title === pendingTitle);
const incident = issues.find((issue) => issue.title === incidentTitle);
const timestamp = new Date().toISOString();

if (!failed) {
  for (const issue of [pending, incident].filter(Boolean)) {
    await api(`/repos/${owner}/${repo}/issues/${issue.number}/comments`, {
      method: "POST",
      body: JSON.stringify({
        body: `Recovered at ${timestamp}. Healthy check: ${runUrl}`,
      }),
    });
    await api(`/repos/${owner}/${repo}/issues/${issue.number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed", state_reason: "completed" }),
    });
  }
  console.log(
    incident || pending
      ? "Recovery recorded and incident closed."
      : "Healthy; no incident open.",
  );
  process.exit(0);
}

if (incident) {
  await api(`/repos/${owner}/${repo}/issues/${incident.number}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: `Availability still failing at ${timestamp}. Run: ${runUrl}`,
    }),
  });
  console.error(`Open incident updated: ${incident.html_url}`);
  process.exit(1);
}

if (pending) {
  const escalated = await api(
    `/repos/${owner}/${repo}/issues/${pending.number}`,
    {
      method: "PATCH",
      body: JSON.stringify({ title: incidentTitle, assignees: [owner] }),
    },
  );
  await api(`/repos/${owner}/${repo}/issues/${pending.number}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: `@${owner} two consecutive checks failed. Investigate or roll back the preview alias. Second failure: ${timestamp}. Run: ${runUrl}`,
    }),
  });
  console.error(
    `Incident escalated after two consecutive failures: ${escalated.html_url}`,
  );
  process.exit(1);
}

const created = await api(`/repos/${owner}/${repo}/issues`, {
  method: "POST",
  body: JSON.stringify({
    title: pendingTitle,
    body: [
      "The first consecutive public-demo availability check failed.",
      "",
      `Observed: ${timestamp}`,
      `Run: ${runUrl}`,
      "",
      "A second consecutive failure will assign and escalate this issue. No response body, visitor data or credentials are collected.",
    ].join("\n"),
  }),
});
console.log(`First failure recorded without escalation: ${created.html_url}`);

async function api(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "DWISS-public-demo-monitor/1.0",
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error(`GitHub API ${response.status} for ${path}`);
  return response.status === 204 ? undefined : response.json();
}
