# Implementation Plan: Personal Dashboard

## Overview

Implement a zero-dependency, single-page Personal Dashboard as three static files (`index.html`, `css/style.css`, `js/app.js`). All state is persisted to `localStorage`. The implementation follows the module pattern with a global `Dashboard` namespace. Tasks are ordered so each step builds on the previous one — storage utilities first, then each widget module, then tests, then wiring.

---

## Tasks

- [x] 1. Scaffold project structure and static shell
  - Create `index.html` with the five widget section placeholders (`#greeting-section`, `#timer-section`, `#tasks-section`, `#links-section`, `#theme-toggle`), the anti-flash `<script>` block in `<head>`, and `<link>` / `<script>` tags pointing to `css/style.css` and `js/app.js`
  - Create `css/style.css` with CSS custom properties for both light and dark themes (`:root` and `:root.dark` blocks) and base layout/typography rules
  - Create `js/app.js` with the `window.Dashboard` namespace object and a `DOMContentLoaded` listener that will call each module's `init()` — leave `init` stubs empty for now
  - Create `test/run.js` test runner that `require`s each test file and reports pass/fail counts; create `test/unit/` directory with empty placeholder files
  - _Requirements: 10.1, 10.2, 10.4, 8.4_

- [x] 2. Implement `Dashboard.storage` — localStorage wrapper
  - [x] 2.1 Write the `Dashboard.storage` module (`get`, `set`, `remove`) inside `js/app.js`
    - `get(key)`: `JSON.parse(localStorage.getItem(key))` wrapped in try/catch returning `null` on error
    - `set(key, value)`: `localStorage.setItem(key, JSON.stringify(value))` wrapped in try/catch swallowing `QuotaExceededError`
    - `remove(key)`: `localStorage.removeItem(key)` — no-op if absent
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 2.2 Write unit tests for `Dashboard.storage` in `test/unit/` (example-based)
    - Test `get` returns `null` for missing key
    - Test `get` returns `null` on malformed JSON
    - Test `set` + `get` round-trip for object, array, and primitive values
    - Test `remove` leaves key absent
    - Test `set` does not throw when storage throws `QuotaExceededError` (mock `setItem`)
    - _Requirements: 9.2_

- [x] 3. Implement `Dashboard.theme` — Theme_Toggle module
  - [x] 3.1 Write the `Dashboard.theme` module (`init`, `toggle`) in `js/app.js`
    - `init()`: reads `dashboard_theme` from storage; if `'dark'` adds `dark` class to `document.documentElement`; registers click listener on `#theme-toggle`
    - `toggle()`: flips `dark` class on `document.documentElement`; writes new theme string (`'dark'` or `'light'`) to `dashboard_theme` via `Dashboard.storage.set`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 3.2 Write property test for theme toggle in `test/unit/links.test.js` (or a dedicated `theme.test.js`)
    - **Property 25: Theme toggle persists the opposite theme**
    - **Validates: Requirements 8.3**
    - Test that calling `toggle()` from `'light'` → stores `'dark'`; calling again → stores `'light'`
    - _Requirements: 8.3_

- [x] 4. Implement `Dashboard.greeting` — Greeting_Widget module
  - [x] 4.1 Write pure helper functions `formatTime(date)`, `formatDate(date)`, `getGreeting(hour)`, and `buildGreeting(hour, name)` in `js/app.js`
    - `formatTime`: returns `HH:MM:SS` (zero-padded, 24-hour)
    - `formatDate`: returns `"Weekday, Month Day, Year"` using `toLocaleDateString` fields
    - `getGreeting(hour)`: hour 5–11 → `"Good Morning"`, 12–17 → `"Good Afternoon"`, 18–20 → `"Good Evening"`, 21–23 + 0–4 → `"Good Night"`
    - `buildGreeting(hour, name)`: returns `getGreeting(hour) + ", " + name.trim()` when name is non-empty, else just `getGreeting(hour)`
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.2 Write property tests for greeting helpers in `test/unit/greeting.test.js`
    - **Property 1: Time format validity** — `formatTime(date)` matches `/^\d{2}:\d{2}:\d{2}$/` for any Date
    - **Validates: Requirements 1.1**
    - **Property 2: Date format validity** — `formatDate(date)` is non-empty and contains weekday, month, day, year for any Date
    - **Validates: Requirements 1.2**
    - **Property 3: Time-based greeting exhaustive coverage** — `getGreeting(hour)` returns one of the four valid strings for every integer in [0, 23]
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - **Property 4: Greeting name concatenation** — `buildGreeting(hour, name)` starts with `getGreeting(hour)` and contains `name.trim()` for any valid hour and non-empty name
    - **Validates: Requirements 2.5**
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.3 Write the `Dashboard.greeting` widget module (`init`, `render`, `setName`) in `js/app.js`
    - `init()`: reads `dashboard_username` from storage into `state.userName`; calls `render()`; starts `setInterval(render, 1000)` stored in `clockInterval`
    - `render()`: reads `new Date()`; updates `#clock`, `#date`, `#greeting-text` DOM nodes using the pure helpers; calls `buildGreeting` with `state.userName` when set
    - `setName(name)`: trims `name`; if length ≥ 1 saves to `dashboard_username` via storage, else calls `storage.remove('dashboard_username')`; sets `state.userName`; calls `render()`
    - Wire the name input field (`#name-input` or inline edit button) to `setName`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.4 Write property and unit tests for username persistence in `test/unit/username.test.js`
    - **Property 5: User_Name save and load round-trip** — `setUserName(s)` → `getUserName()` returns `s.trim()` for any 1–50 char string
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - **Property 6: Whitespace User_Name clears the stored key** — `setUserName(s)` where `s.trim().length === 0` → `dashboard_username` absent, `getUserName()` returns `null`
    - **Validates: Requirements 3.5**
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement `Dashboard.timer` — Focus_Timer module
  - [x] 5.1 Write pure helpers `formatTimer(seconds)` and the internal `tick(state)` function in `js/app.js`
    - `formatTimer(seconds)`: converts total seconds to `MM:SS` zero-padded string
    - `tick(state)`: returns new state with `remaining - 1`; if new `remaining <= 0` sets `remaining = 0` and `running = false`
    - _Requirements: 4.2, 4.6, 4.7_

  - [ ]* 5.2 Write property tests for timer helpers in `test/unit/timer.test.js`
    - **Property 7: Timer tick decrements remaining by exactly one** — single `tick()` call while `running === true` reduces `remaining` by 1 for any `remaining` in [1, 1500]
    - **Validates: Requirements 4.2**
    - **Property 8: Timer halts at zero and never goes negative** — after 1500 `tick()` calls from `remaining=1500`, `remaining === 0` and `running === false`; no intermediate value < 0
    - **Validates: Requirements 4.6**
    - **Property 9: Timer display format validity** — `formatTimer(seconds)` matches `/^\d{2}:\d{2}$/` and correctly represents total seconds for any integer in [0, 1500]
    - **Validates: Requirements 4.7**
    - **Property 10: Timer reset invariant** — `reset()` sets `remaining = 1500` and `running = false` for any timer state
    - **Validates: Requirements 4.1, 4.5**
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.7_

  - [x] 5.3 Write the `Dashboard.timer` widget module (`init`, `start`, `stop`, `reset`) in `js/app.js`
    - `init()`: sets `state = { remaining: 1500, running: false, intervalId: null }`; calls `render()`; registers click listeners on Start/Stop/Reset buttons
    - `start()`: guard if `running === true`; sets `running = true`; starts `setInterval(tickTimer, 1000)` where `tickTimer` calls `tick`, updates state, calls `render()`; when `remaining === 0` shows `#timer-notification`, starts 5-second `setTimeout` to hide it
    - `stop()`: clears interval; sets `running = false`; calls `render()`
    - `reset()`: clears interval and any pending notification `setTimeout`; sets `remaining = 1500, running = false`; hides notification; calls `render()`
    - `render()`: updates timer display element with `formatTimer(state.remaining)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 5.4 Write unit (example-based) tests for Focus_Timer in `test/unit/timer.test.js`
    - Test `init()` produces `remaining=1500, running=false`
    - Test start → stop retains `remaining`
    - Test reset from running state returns to 1500
    - Test completion notification appears when `remaining` reaches 0
    - _Requirements: 4.1, 4.3, 4.5, 4.8_

- [x] 6. Checkpoint — storage, theme, greeting, and timer complete
  - Ensure all tests pass with `node test/run.js`, ask the user if questions arise.

- [x] 7. Implement `Dashboard.tasks` — Task_Manager module
  - [x] 7.1 Write pure helper functions for task operations in `js/app.js`
    - `generateId()`: returns `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - `addTask(tasks, text)`: validates `text.trim().length >= 1` and `<= 500`; returns new array with appended `{ id, text: text.trim(), done: false, createdAt: Date.now() }`; throws or returns `null` on invalid input
    - `deleteTask(tasks, id)`: returns new array with the matching id removed
    - `toggleComplete(tasks, id)`: returns new array with the matching task's `done` flipped
    - `saveEdit(tasks, id, newText)`: validates `newText.trim()` non-empty; returns updated array; returns original array unchanged on invalid input
    - `sortTasks(tasks, mode)`: returns a new sorted array without mutating input; `'all'` → creation order; `'active'` → incomplete first then complete, each group by `createdAt` asc; `'completed'` → complete first then incomplete
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 5.9, 5.10, 6.1, 6.2_

  - [ ]* 7.2 Write property tests for task operations in `test/unit/tasks.test.js`
    - **Property 11: Task add round-trip** — `addTask([], text)` returns array of length 1 with `text === text.trim()` and `done === false` for any 1–500 char string
    - **Validates: Requirements 5.2, 9.4**
    - **Property 12: Whitespace task descriptions are rejected** — `addTask(tasks, t)` where `t.trim().length === 0` leaves list length unchanged
    - **Validates: Requirements 5.9**
    - **Property 13: Task completion toggle round-trip** — `toggleComplete(toggleComplete(tasks, id), id)` equals original `done` value; all other fields unchanged
    - **Validates: Requirements 5.3, 5.4**
    - **Property 14: Task delete reduces list by exactly one** — `deleteTask(tasks, id)` reduces length by 1; id no longer present
    - **Validates: Requirements 5.7**
    - **Property 15: Task edit round-trip** — `saveEdit(tasks, id, newText)` updates matching task's `text` to `newText.trim()`; all other fields and list length unchanged
    - **Validates: Requirements 5.6**
    - **Property 16: Whitespace edit is rejected** — `saveEdit(tasks, id, newText)` where `newText.trim().length === 0` leaves the task's `text` field unchanged
    - **Validates: Requirements 5.10**
    - **Property 17: Sort does not mutate stored task order** — `sortTasks(tasks, mode)` returns a new array; original `tasks` array reference is unchanged
    - **Validates: Requirements 6.2**
    - **Property 18: Active sort places incomplete tasks before complete tasks** — after `sortTasks(tasks, 'active')`, every incomplete task has a lower index than every complete task
    - **Validates: Requirements 6.1**
    - **Property 19: Completed sort places complete tasks before incomplete tasks** — after `sortTasks(tasks, 'completed')`, every complete task has a lower index than every incomplete task
    - **Validates: Requirements 6.1**
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 5.9, 5.10, 6.1, 6.2, 9.4_

  - [x] 7.3 Write the `Dashboard.tasks` widget module (`init`, `addTask`, `deleteTask`, `toggleComplete`, `beginEdit`, `saveEdit`, `setSortMode`) in `js/app.js`
    - `init()`: loads `dashboard_tasks` array from storage (default `[]`); sets `state.sortMode = 'all'`; calls `render()`; registers listener on add-task form
    - `render()`: computes display list via `sortTasks(state.tasks, state.sortMode)`; rebuilds `#tasks-section` list via `innerHTML`; each item has complete-toggle, edit button, and delete button
    - `addTask(text)`: calls pure `addTask`; on success updates `state.tasks`, writes to storage, re-renders; on failure shows inline error message in `#tasks-error`
    - `deleteTask(id)` / `toggleComplete(id)` / `beginEdit(id)` / `saveEdit(id, text)`: call pure helpers, update state, persist, re-render; `saveEdit` shows inline error on whitespace input
    - `setSortMode(mode)`: updates `state.sortMode`; re-renders (does NOT write to storage)
    - Wire sort control buttons to `setSortMode`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 9.4_

  - [ ]* 7.4 Write unit (example-based) tests for Task_Manager in `test/unit/tasks.test.js`
    - Test default sort mode is `'all'` on init
    - Test adding a task with a 501-character string is rejected
    - Test `localStorage` key `dashboard_tasks` is written immediately on task add (Requirements 9.4)
    - _Requirements: 5.11, 6.4, 9.4_

- [x] 8. Checkpoint — task module complete
  - Ensure all tests pass with `node test/run.js`, ask the user if questions arise.

- [x] 9. Implement `Dashboard.links` — Quick_Links module
  - [x] 9.1 Write pure helper functions for link operations in `js/app.js`
    - `normaliseUrl(url)`: returns `url` unchanged if it matches `/^https?:\/\//i`; otherwise prepends `"https://"`
    - `addLink(links, label, url)`: validates `label.trim().length >= 1`, `url.trim().length >= 1`, `url.trim().length <= 2048`, `label.trim().length <= 50`, and `links.length < 50`; returns new array with appended `{ id: generateId(), label: label.trim(), url: normaliseUrl(url.trim()) }`; returns `null` on invalid input
    - `deleteLink(links, id)`: returns new array with matching id removed
    - _Requirements: 7.2, 7.4, 7.6, 7.7_

  - [x] 9.2 Write property tests for link operations in `test/unit/links.test.js`
    - **Property 20: Quick link add and URL normalisation round-trip** — `addLink(links, l, u)` where links.length < 50 stores `label === l.trim()` and url starts with `http://` or `https://`
    - **Validates: Requirements 7.2, 7.7**
    - **Property 21: URL scheme is always normalised to https when absent** — any URL not starting with `http://` or `https://` is stored as `"https://" + u`
    - **Validates: Requirements 7.7**
    - **Property 22: Link cap is enforced at 50 entries** — `addLink` with a 50-entry list returns `null`; list length stays at 50
    - **Validates: Requirements 7.2**
    - **Property 23: Link delete reduces list by exactly one** — `deleteLink(links, id)` reduces length by 1; id no longer present
    - **Validates: Requirements 7.4**
    - **Property 24: Invalid link (empty label or URL) is rejected** — `addLink` with empty label or empty URL leaves list unchanged
    - **Validates: Requirements 7.6**
    - _Requirements: 7.2, 7.4, 7.6, 7.7_

  - [x] 9.3 Write the `Dashboard.links` widget module (`init`, `addLink`, `deleteLink`) in `js/app.js`
    - `init()`: loads `dashboard_links` from storage (default `[]`); calls `render()`; registers listener on add-link form
    - `render()`: rebuilds `#links-section` link grid; each link renders as `<a href="{url}" target="_blank" rel="noopener noreferrer">`; each item has a delete button
    - `addLink(label, url)`: calls pure `addLink`; on success updates `state.links`, writes `dashboard_links` to storage, re-renders; on failure shows inline error in `#links-error`
    - `deleteLink(id)`: calls pure `deleteLink`; updates state, persists, re-renders
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 9.4 Write unit (example-based) tests for Quick_Links in `test/unit/links.test.js`
    - Test link with `http://` scheme is not double-prefixed
    - Test link with uppercase `HTTP://` scheme is not double-prefixed (case-insensitive check)
    - Test adding a link with a label > 50 chars is rejected
    - Test `dashboard_links` key is written immediately on link add (Requirements 9.4)
    - _Requirements: 7.6, 7.7, 9.4_

- [x] 10. Checkpoint — links module complete
  - Ensure all tests pass with `node test/run.js`, ask the user if questions arise.

- [x] 11. Wire all modules and finalise `index.html` markup
  - [x] 11.1 Write complete HTML markup for all five widget sections in `index.html`
    - `#greeting-section`: `#clock`, `#date`, `#greeting-text`, `#name-input` (inline text input + submit)
    - `#timer-section`: timer display `#timer-display`, Start/Stop/Reset buttons, `#timer-notification` (hidden by default)
    - `#tasks-section`: add-task form, `#tasks-error`, sort mode buttons, `#task-list` container
    - `#links-section`: add-link form (label + url inputs), `#links-error`, `#link-grid` container
    - `#theme-toggle`: header button with light/dark icon
    - _Requirements: 10.4_

  - [x] 11.2 Complete `css/style.css` with widget-specific layout rules, input/button styles, error message styles, task strikethrough for `.done`, and responsive layout for screens ≥ 320 px width
    - Ensure all interactive controls meet minimum 44×44 px touch target size
    - _Requirements: 5.3, 10.3_

  - [x] 11.3 Verify `DOMContentLoaded` handler in `js/app.js` calls all five `init()` functions in order: `theme.init()`, `greeting.init()`, `timer.init()`, `tasks.init()`, `links.init()`
    - Theme must be initialised first to prevent flash; all other modules in any order after
    - _Requirements: 8.4, 10.4_

- [x] 12. Final checkpoint — full integration
  - Ensure all tests pass with `node test/run.js`, ask the user if questions arise.
  - Verify `index.html` opens via `file://` in Chrome and all five widgets render and respond to input.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all 25 correctness properties have corresponding `*`-marked sub-tasks.
- Each property-based test should run with `{ numRuns: 100 }` as the minimum iteration count.
- The pure helper functions (4.1, 5.1, 7.1, 9.1) must be extracted so they are accessible to the test harness without importing DOM globals — keep them at the top of `app.js` and expose them on `Dashboard` or export them via a testable wrapper in `test/harness.js`.
- `localStorage` is unavailable in Node.js; the test harness (`test/run.js`) must mock `localStorage` before requiring any module that uses it.
- Checkpoints at tasks 6, 8, 10, and 12 provide natural stopping points for incremental validation.
- All tasks reference specific requirements for traceability.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3"] },
    { "id": 8, "tasks": ["7.4", "9.1"] },
    { "id": 9, "tasks": ["9.2", "9.3"] },
    { "id": 10, "tasks": ["9.4", "11.1"] },
    { "id": 11, "tasks": ["11.2", "11.3"] }
  ]
}
```
