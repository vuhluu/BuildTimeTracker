# BuildTimeTracker — Browser QA Script

Run this end-to-end when you want a browser-driving agent (gstack / qa skill / Playwright-in-Claude) to validate the app against a live ActivityWatch instance. Each step has an **Action** and an **Assert** — if any assert fails, stop and report.

## Preconditions

- [ ] ActivityWatch is running. Probe `http://localhost:5600/api/0/buckets/` and confirm JSON that includes a key starting with `aw-watcher-window_`. If not, abort: "ActivityWatch not running."
- [ ] From `app/`, start the dev server in the background: `npm run dev`. Wait until the log contains `Local:   http://localhost:5173/`.
- [ ] Probe `http://localhost:5173/aw/api/0/buckets/`. **Assert:** response is 200 and JSON contains the same bucket IDs returned directly from :5600 (this proves the Vite `/aw` proxy is wired).
- [ ] Open `http://localhost:5173/` in the headless browser. Clear `localStorage` (`localStorage.clear()`) and reload once, so each QA run starts from a clean slate.

## 1. Empty-state render

- [ ] **Assert:** page title is `BuildTimeTracker`. Background is near-black (`rgb(10,10,10)` ish) and text is light — i.e. dark theme is on.
- [ ] **Assert:** the header shows two tabs — `Today` (selected, emerald background) and `Aggregate`.
- [ ] **Assert:** the task-input field with placeholder `What are you working on?` is visible. The `Start` button is disabled (gray / 40% opacity). No `Stop` button is visible.
- [ ] **Assert:** no red error banner at the top of the page. If one appears saying "ActivityWatch: …", note the message and continue — it means the bucket lookup failed.
- [ ] Take a screenshot labeled `01-empty-state`.

## 2. Start a task, live timer ticks

- [ ] **Action:** type `qa smoke test` into the task input.
- [ ] **Assert:** the `Start` button becomes enabled (full opacity, emerald).
- [ ] **Action:** click `Start`.
- [ ] **Assert:** the input clears. A `Stop` button (red) appears next to `Start`. A status row appears beneath the input showing `Tracking  qa smoke test` and an elapsed time in monospace emerald (e.g. `0:00`).
- [ ] **Action:** wait ~3 seconds, then re-read the elapsed label.
- [ ] **Assert:** the elapsed time increments from `0:00` to `0:03` (±1s) without reloading.
- [ ] Take a screenshot labeled `02-task-running`.

## 3. Recent-tasks chip appears after one task cycle

- [ ] **Action:** click `Stop`.
- [ ] **Assert:** the `Tracking …` row disappears. A `Completed today` section appears below with one row containing `qa smoke test`, a duration around `0:03`–`0:05`, and start/end clock times.
- [ ] **Assert:** below the start input, a `Recent` section now lists one chip button: `qa smoke test`.
- [ ] Take a screenshot labeled `03-one-completed`.

## 4. Auto-stop when starting a new task

- [ ] **Action:** type `second task` into the input and press `Enter` (not click).
- [ ] **Assert:** a new tracking row shows `Tracking  second task`. The previous task (`qa smoke test`) still appears in `Completed today` with a finalized duration.
- [ ] **Action:** wait ~5 seconds, then click the `Recent` chip labeled `qa smoke test`.
- [ ] **Assert:** the tracking row updates to `Tracking  qa smoke test`. The `second task` session has been added to `Completed today` with a ~5s duration (auto-stopped when the chip was clicked).
- [ ] Take a screenshot labeled `04-auto-stop-and-resume`.
- [ ] **Action:** click `Stop` so nothing is active going into the next step.

## 5. App-breakdown shows real ActivityWatch data

- [ ] **Assert:** each completed task row in `Completed today` has, below it, an `App breakdown` list. Each list entry shows an app name (e.g. `Code`, `Safari`, `Cursor`), a percentage, a colored horizontal bar, and a duration. **If every completed task shows "No app events."**, ActivityWatch returned an empty window — note this and check the red error banner; otherwise continue.
- [ ] **Assert:** the sum of the percentages for any one task is ~100% (±1% rounding).
- [ ] Take a screenshot labeled `05-app-breakdown`.

## 6. Drag-reorder persists across reload

- [ ] Pick the completed task with the **most** apps in its breakdown. Remember its current order (top to bottom), e.g. `[Code, Safari, Slack]`.
- [ ] **Action:** focus the `⋮⋮` handle on the **bottom** row (use Tab or `element.focus()` on the `[aria-label="Reorder <app>"]` button). Press `Space` to pick up, `ArrowUp` twice, `Space` to drop.
- [ ] **Assert:** the visible row order has changed — the previously-bottom app is now on top.
- [ ] **Action:** reload the page (`window.location.reload()`).
- [ ] **Assert:** the same custom order is still displayed after reload. (This verifies the `appOrder` persisted to `localStorage` under `buildtimetracker:v1`.)
- [ ] Take a screenshot labeled `06-reorder-persisted`.

## 7. Timeline (Gantt) renders

- [ ] Scroll to the `Timeline` section.
- [ ] **Assert:** an SVG with `role="img"` and `aria-label="Daily timeline"` is present. Its width is around 900px.
- [ ] **Assert:** each completed task produces one row in the SVG: a muted bar on top and, directly below, smaller colored rectangles for each AW event.
- [ ] **Assert:** time-axis tick labels (HH:MM) appear along the top in `#737373`.
- [ ] Hover over one of the event rectangles and read the `<title>` tooltip. **Assert:** it contains the app name and a duration.
- [ ] Take a screenshot labeled `07-timeline`.

## 8. Daily summary numbers

- [ ] Scroll to `Daily summary`.
- [ ] **Assert:** the three stat cards are present — `Total tracked`, `Tasks completed`, `Total context switches`. Values are non-empty and numeric-looking.
- [ ] **Assert:** the per-task rows below list every completed task with duration, `N switches`, and `longest: <app> <duration>` (or `—` if no events).
- [ ] Take a screenshot labeled `08-daily-summary`.

## 9. Import / Export round-trip

- [ ] **Action:** click `Export JSON`. A file download starts — capture the downloaded file and parse it as JSON.
- [ ] **Assert:** the JSON has top-level keys `sessions` (array of length ≥ 2), `activeSessionId` (null), `settings` (object).
- [ ] **Assert:** each `sessions[i]` has `id`, `name`, `startedAt`, `endedAt`, `events`.
- [ ] **Action:** in devtools, clear `localStorage` and reload the page. **Assert:** the app is back to the empty state (no `Completed today`, no `Recent` chips).
- [ ] **Action:** click `Import JSON` and upload the file you captured. **Assert:** the completed-task list and recent chips are fully restored, including the custom app-breakdown order from step 6.
- [ ] Take a screenshot labeled `09-import-restored`.

## 10. Aggregate tab

- [ ] **Action:** click the `Aggregate` tab.
- [ ] **Assert:** `From` and `To` datetime-local inputs default to today-00:00 and now. A `Task filter` dropdown lists `All tasks` plus each unique task name.
- [ ] **Assert:** a list of task rows is visible below, sorted by total duration descending. Each row shows: name, a stacked horizontal bar segmented by app color, and a trailing `<duration> · Nx` label.
- [ ] **Action:** change `Task filter` to `qa smoke test`. **Assert:** only the matching row is shown.
- [ ] **Action:** set `Task filter` back to `All tasks`.
- [ ] **Action:** change the `From` input to 5 years in the past and `To` to 1 year in the future — a range guaranteed to contain everything. **Assert:** the row counts and durations match the untouched case.
- [ ] **Action:** change `From` to 5 years in the future. **Assert:** the list becomes "No sessions overlap the selected range."
- [ ] Reset `From` / `To` to defaults.
- [ ] Take a screenshot labeled `10-aggregate-view`.

## 11. CSV export

- [ ] **Action:** scroll to the `Table` section and click `Export CSV`. Capture the downloaded file.
- [ ] **Assert:** the CSV's first line starts with `Task,Total,Sessions,Avg session,` and has additional columns per app (e.g. `Code %`, `Safari %`).
- [ ] **Assert:** there's one data row per unique task name from the Aggregate list, and the `Total` cell matches the duration shown in the UI for that task.
- [ ] **Assert:** the HTML table rendered on the page has the same rows and columns as the CSV.

## 12. Graceful degradation when ActivityWatch is unreachable

- [ ] **Action:** stop ActivityWatch (`killall aw-qt aw-server 2>/dev/null || true`, or whatever stops it on your system). Verify `curl http://localhost:5600/api/0/buckets/` now fails.
- [ ] **Action:** in the app, switch to the `Today` tab, type `offline test` and click `Start`.
- [ ] **Action:** wait ~3 seconds and click `Stop`.
- [ ] **Assert:** the `offline test` session appears in `Completed today` with a duration around `0:03`, and its app-breakdown shows `No app events.`
- [ ] **Assert:** the red error banner at the top says something like `ActivityWatch: Failed to reach ActivityWatch…` (message may vary, but it must mention ActivityWatch). There is a `dismiss` button.
- [ ] **Action:** click `dismiss`. **Assert:** the banner disappears.
- [ ] Take a screenshot labeled `12-offline-degradation`.
- [ ] Restart ActivityWatch before finishing.

## Teardown

- [ ] Close all browser tabs opened for this run.
- [ ] Kill the dev server (`kill <vite-pid>`).
- [ ] Produce a short report:
  - Which steps passed / failed.
  - For any failure: the step number, what was expected, what was actually observed, and the screenshot filename.
  - If a red error banner ever appeared unexpectedly, include its exact text.
