# DWISS public demo monitor

Privacy-safe availability checks for the synthetic DWISS product demo.

- Target: <https://dwiss-demo-preview.vercel.app>
- Frequency: every five minutes
- Checks: HTTP 200 plus fixed public text on `/welcome` and `/demo`
- Owner: [`@vkrwth`](https://github.com/vkrwth)
- Escalation: repository issue assigned after two consecutive failures
- Recovery: the next healthy check comments on and closes the open monitor issue

The monitor sends no cookies, credentials, shipment data or user identifiers and stores no response
bodies. Logs contain only timestamps, paths, bounded failure reasons and workflow URLs. It uses the
standard GitHub-hosted public-repository runner; no secrets or paid monitoring account are required.

## Controlled alert test

Run the workflow twice with `force_failure=true`. The first run creates a pending issue. The second
assigns and escalates it. Run once with `force_failure=false` to prove recovery and close the issue.

## Disable or transfer

Disable the workflow in **Actions → DWISS public demo availability**, or remove the schedule from
`.github/workflows/availability.yml`. Before transferring ownership, run the controlled alert test
with the new owner and confirm that the recovered issue closes.

GitHub automatically disables scheduled workflows in public repositories after 60 days without
repository activity. The release owner must review the monitor weekly during an active evaluation
and re-enable it if GitHub reports it disabled.
