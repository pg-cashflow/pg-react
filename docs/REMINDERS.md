# Rent reminders

## UI (this repo)

`/owner/reminders` builds rows from **open dues** (`pending` / `partial`):

- **Send on** = due date minus 3 calendar days
- **Send now** calls `POST /api/owner/dues/:id/token` and opens the WhatsApp (`wa_me`) intent with amount + due code
- Failures: missing tenant phone, inactive tenant, or token API error — shown inline

Scheduled auto-send (emails firing without tapping Send now) is **not** in pg-react. It needs a **pg-go cron/worker** that writes `reminder_sent_at` and emits `DueReminderSent` on `/owner/events`.

Until that lands, the page states: _Scheduled — sends automatically when server automation is enabled._
