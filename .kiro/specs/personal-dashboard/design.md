# Design Document: Personal Dashboard

## Overview

The Personal Dashboard is a zero-dependency, single-page web application delivered as a set of static files — one HTML file, one CSS file, and one JavaScript file. It runs entirely in the browser with no build step, no package manager, and no server. All state is persisted to `localStorage`.

The app exposes five widgets on a single screen:

| Widget | Responsibility |
|---|---|
| Greeting_Widget | Live clock, date, time-based greeting, custom name |
| Focus_Timer | 25-minute Pomodoro countdown with start/stop/reset |
| Task_Manager | Add, edit, complete, delete, and sort tasks |
| Quick_Links | Add, delete, and open URL shortcuts |
| Theme_Toggle | Switch and persist light / dark mode |

Because there is no framework, the architecture is a hand-written module pattern — each widget owns its own DOM subtree, its own `localStorage` key, and a thin interface that the application shell calls to initialise and tear down event listeners.

---

## Architecture

### Module Pattern

Each widget is a self-contained IIFE (Immediately Invoked Function Expression) module exported onto a single global `Dashboard` namespace object. The application shell (`main.js`) calls each module's `init()` function on `DOMContentLoaded`.

```
window.Dashboard
  .greeting.init()
  .timer.init()
  .tasks.init()
  .links.init()
  .theme.init()
```

This avoids ES module syntax (which requires a server or `type="module"` + CORS headers that break `file://`) while still providing clear encapsulation.

### File Structure

```
personal-dashboard/
├── index.html          ← single HTML entry-point
├── css/
│   └── style.css       ← single stylesheet
└── js/
    └── app.js          ← single JavaScript file (all modules concatenated)
```

### Rendering Model

There is no virtual DOM. Each widget function re-renders its own list elements when its state changes:

1. **Event fires** → handler is called.
2. Handler **updates in-memory state** (plain JS objects / arrays).
3. Handler **writes to `localStorage`**.
4. Handler calls **`render()`** which rebuilds the relevant DOM subtree via `innerHTML` or targeted `createElement` calls.

This is intentionally simple: the largest data structures (task list, link list) are capped at 50 items, so full re-renders are imperceptibly fast.

### Tick Loop

A single `setInterval` drives the clock and checks timer state once per second. It is started in `greeting.init()` and `timer.init()` respectively. Both intervals are stored in module-level variables so they can be cleared on reset.

```
// greeting tick — every 1 000 ms
clockInterval = setInterval(updateClock, 1000);

// timer tick — every 1 000 ms, only runs when timer is active
timerInterval = setInterval(tickTimer, 1000);
```

### Theme Application Strategy

To prevent a flash of the wrong theme the theme module reads `localStorage` **synchronously** from a `<script>` block placed in `<head>`, before any CSS or body content is parsed:

```html
<head>
  <script>
    (function() {
      var t = localStorage.getItem('dashboard_theme');
      if (t === 'dark') document.documentElement.classList.add('dark');
    })();
  </script>
  <link rel="stylesheet" href="css/style.css">
</head>
```

CSS selectors then use `:root.dark` to define dark-mode custom property overrides, making the entire theme a single class toggle on `<html>`.

---

## Components and Interfaces

### Greeting_Widget

**DOM target:** `#greeting-section`

**Public interface:**
```js
Dashboard.greeting = {
  init()          // registers clock interval, reads name from localStorage
  render()        // updates #clock, #date, #greeting-text DOM nodes
  setName(name)   // validates, persists, and re-renders
}
```

**Internal state:**
```js
{ userName: string | null }
```

**Clock update cycle:** `setInterval(render, 1000)` — render reads `new Date()` on every tick.

**Greeting logic:**
```
hour in [05, 11] → "Good Morning"
hour in [12, 17] → "Good Afternoon"
hour in [18, 20] → "Good Evening"
hour in [21, 23] or [00, 04] → "Good Night"
```

---

### Focus_Timer

**DOM target:** `#timer-section`

**Public interface:**
```js
Dashboard.timer = {
  init()     // sets remaining = 1500, renders display, registers button listeners
  start()    // starts or resumes interval
  stop()     // pauses interval, retains remaining
  reset()    // clears interval, remaining = 1500, re-renders
}
```

**Internal state:**
```js
{
  remaining: number,   // seconds remaining (0–1500)
  running:   boolean,
  intervalId: number | null
}
```

**Completion:** When `remaining` reaches 0, the interval is cleared, a `#timer-notification` element is made visible, and a 5-second `setTimeout` hides it automatically. Any click/keydown on the dashboard also hides it.

---

### Task_Manager

**DOM target:** `#tasks-section`

**Public interface:**
```js
Dashboard.tasks = {
  init()               // loads from localStorage, renders
  addTask(text)        // validates, appends, persists, re-renders
  deleteTask(id)       // removes by id, persists, re-renders
  toggleComplete(id)   // flips status, persists, re-renders
  beginEdit(id)        // replaces task item DOM with inline edit field
  saveEdit(id, text)   // validates, updates, persists, re-renders
  setSortMode(mode)    // 'all' | 'active' | 'completed' — re-renders
}
```

**Internal state:**
```js
{
  tasks: Task[],        // source-of-truth array (creation order)
  sortMode: string      // current display sort
}
```

**Task object:**
```js
{ id: string, text: string, done: boolean, createdAt: number }
```

**ID generation:** `Date.now().toString(36) + Math.random().toString(36).slice(2)` — lightweight unique string, no external library.

**Sort logic (view-only, does not mutate `tasks` array):**
```
'all'       → [...tasks]                                    (creation order)
'active'    → incomplete tasks first, then complete, each group by createdAt asc
'completed' → complete tasks first, then incomplete, each group by createdAt asc
```

---

### Quick_Links

**DOM target:** `#links-section`

**Public interface:**
```js
Dashboard.links = {
  init()               // loads from localStorage, renders
  addLink(label, url)  // validates, appends (≤50 cap), persists, re-renders
  deleteLink(id)       // removes, persists, re-renders
}
```

**Internal state:**
```js
{ links: Link[] }
```

**Link object:**
```js
{ id: string, label: string, url: string }
```

**URL normalisation:** If submitted URL does not start with `http://` or `https://` (case-insensitive), prepend `https://`.

**Link button rendering:** Each link renders as `<a href="{url}" target="_blank" rel="noopener noreferrer">`.

---

### Theme_Toggle

**DOM target:** `#theme-toggle` (button in header)

**Public interface:**
```js
Dashboard.theme = {
  init()    // reads localStorage, applies class, registers click listener
  toggle()  // flips class on <html>, persists to localStorage
}
```

**Mechanism:** Toggle `dark` class on `document.documentElement`. All theme differences are expressed in CSS custom properties:

```css
:root {
  --bg: #ffffff;
  --text: #111111;
  /* ... */
}
:root.dark {
  --bg: #1a1a2e;
  --text: #e0e0e0;
  /* ... */
}
```

---

### localStorage Module

A thin wrapper used by all modules to safely handle quota errors and unavailability:

```js
Dashboard.storage = {
  get(key)        // returns parsed JSON or null; catches SyntaxError
  set(key, value) // JSON.stringify + setItem; catches QuotaExceededError
  remove(key)     // removeItem; no-op if key doesn't exist
}
```

---

## Data Models

### localStorage Keys

| Key | Type | Description |
|---|---|---|
| `dashboard_tasks` | `Task[]` (JSON) | Ordered array of task objects |
| `dashboard_links` | `Link[]` (JSON) | Ordered array of link objects |
| `dashboard_username` | `string` (JSON) | Trimmed user name or absent |
| `dashboard_theme` | `"light" \| "dark"` (JSON) | Theme preference |

### Task

```ts
interface Task {
  id:        string;   // unique opaque id
  text:      string;   // 1–500 characters, trimmed
  done:      boolean;  // completion status
  createdAt: number;   // Unix timestamp ms (for stable sort ordering)
}
```

### Link

```ts
interface Link {
  id:    string;  // unique opaque id
  label: string;  // 1–50 characters, trimmed
  url:   string;  // valid http/https URL, max 2048 characters
}
```

### Validation Rules Summary

| Field | Rule |
|---|---|
| `User_Name` | 1–50 chars after trim; empty/whitespace → remove key |
| `Task.text` (add) | 1–500 chars after trim; empty/whitespace → reject with error |
| `Task.text` (edit) | 1–500 chars after trim; empty/whitespace → reject, retain previous |
| `Link.label` | Non-empty after trim, max 50 chars |
| `Link.url` | Non-empty, max 2048 chars; auto-prepend `https://` if no scheme |
| Links total | Max 50 links; reject addition beyond cap |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Time format validity

*For any* `Date` object, the `formatTime(date)` function SHALL return a string that matches the pattern `HH:MM:SS` (two digits, colon, two digits, colon, two digits) using 24-hour values derived from the date's local timezone.

**Validates: Requirements 1.1**

---

### Property 2: Date format validity

*For any* `Date` object, the `formatDate(date)` function SHALL return a non-empty string that contains a day-of-week name, a month name, a numeric day, and a four-digit year — all consistent with the date's local timezone values.

**Validates: Requirements 1.2**

---

### Property 3: Time-based greeting exhaustive coverage

*For any* integer hour in the range [0, 23], the `getGreeting(hour)` function SHALL return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, with no hour left unhandled and no hour mapped to more than one greeting. Specifically:
- Hours 5–11 → `"Good Morning"`
- Hours 12–17 → `"Good Afternoon"`
- Hours 18–20 → `"Good Evening"`
- Hours 21–23 and 0–4 → `"Good Night"`

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

### Property 4: Greeting name concatenation

*For any* integer hour in [0, 23] and any non-empty, non-whitespace string `name`, the `buildGreeting(hour, name)` function SHALL return a string that starts with `getGreeting(hour)` and contains `name.trim()`.

**Validates: Requirements 2.5**

---

### Property 5: User_Name save and load round-trip

*For any* string `s` where `s.trim().length >= 1` and `s.trim().length <= 50`, calling `setUserName(s)` followed by `getUserName()` SHALL return a value strictly equal to `s.trim()`.

**Validates: Requirements 3.2, 3.3, 3.4**

---

### Property 6: Whitespace User_Name clears the stored key

*For any* string `s` where `s.trim().length === 0` (the empty string or any all-whitespace string), calling `setUserName(s)` SHALL result in the `dashboard_username` key being absent from `localStorage`, and `getUserName()` SHALL return `null`.

**Validates: Requirements 3.5**

---

### Property 7: Timer tick decrements remaining by exactly one

*For any* integer `remaining` in the range [1, 1500], a single call to the timer's internal `tick()` function while `running === true` SHALL produce a new `remaining` value equal to the original minus 1.

**Validates: Requirements 4.2**

---

### Property 8: Timer halts at zero and never goes negative

*For any* starting `remaining` value of 1500, after exactly 1500 calls to `tick()`, `remaining` SHALL equal 0 and `running` SHALL equal `false`. The value of `remaining` SHALL never be less than 0 at any intermediate step.

**Validates: Requirements 4.6**

---

### Property 9: Timer display format validity

*For any* integer `seconds` in the range [0, 1500], the `formatTimer(seconds)` function SHALL return a string matching the pattern `MM:SS` (two digit minutes, colon, two digit seconds) that correctly represents the total seconds value.

**Validates: Requirements 4.7**

---

### Property 10: Timer reset invariant

*For any* timer state (running or paused, with any `remaining` value in [0, 1500]), calling `reset()` SHALL set `remaining` to 1500 and `running` to `false`.

**Validates: Requirements 4.1, 4.5**

---

### Property 11: Task add round-trip

*For any* string `t` where `t.trim().length >= 1` and `t.trim().length <= 500`, calling `addTask(t)` SHALL result in the tasks array in `localStorage` containing exactly one new entry with `text === t.trim()` and `done === false`, and no other entries modified.

**Validates: Requirements 5.2, 9.4**

---

### Property 12: Whitespace task descriptions are rejected

*For any* string `t` where `t.trim().length === 0`, calling `addTask(t)` SHALL leave the task list length and contents identical to what they were before the call — no new entry is written to `localStorage`.

**Validates: Requirements 5.9**

---

### Property 13: Task completion toggle round-trip

*For any* task with any `done` value, calling `toggleComplete(id)` twice in succession SHALL return the task's `done` field to its original value, with all other task fields and the overall list length unchanged.

**Validates: Requirements 5.3, 5.4**

---

### Property 14: Task delete reduces list by exactly one

*For any* non-empty task list, calling `deleteTask(id)` for any existing task `id` SHALL reduce the task list length by exactly 1, and the task with that `id` SHALL no longer be present in the list stored in `localStorage`.

**Validates: Requirements 5.7**

---

### Property 15: Task edit round-trip

*For any* existing task and any string `newText` where `newText.trim().length >= 1` and `newText.trim().length <= 500`, calling `saveEdit(id, newText)` SHALL update the matching task's `text` field to `newText.trim()` in `localStorage`, leaving all other task fields and list length unchanged.

**Validates: Requirements 5.6**

---

### Property 16: Whitespace edit is rejected

*For any* existing task and any string `newText` where `newText.trim().length === 0`, calling `saveEdit(id, newText)` SHALL leave the task's `text` field identical to its value before the call.

**Validates: Requirements 5.10**

---

### Property 17: Sort does not mutate the stored task order

*For any* task list and any sort mode (`'all'`, `'active'`, `'completed'`), calling `setSortMode(mode)` SHALL NOT change the order or contents of the tasks array in `localStorage` — only the in-memory view order changes.

**Validates: Requirements 6.2**

---

### Property 18: Active sort places incomplete tasks before complete tasks

*For any* task list containing at least one incomplete and one complete task, after setting sort mode to `'active'`, every incomplete task SHALL appear at a lower index than every complete task in the rendered order.

**Validates: Requirements 6.1**

---

### Property 19: Completed sort places complete tasks before incomplete tasks

*For any* task list containing at least one incomplete and one complete task, after setting sort mode to `'completed'`, every complete task SHALL appear at a lower index than every incomplete task in the rendered order.

**Validates: Requirements 6.1**

---

### Property 20: Quick link add and URL normalisation round-trip

*For any* non-empty label `l` (≤50 chars) and non-empty URL string `u` (≤2048 chars) when the links list has fewer than 50 entries, calling `addLink(l, u)` SHALL result in the links array in `localStorage` containing a new entry with `label === l.trim()` and a `url` that begins with `http://` or `https://`.

**Validates: Requirements 7.2, 7.7**

---

### Property 21: URL scheme is always normalised to https when absent

*For any* URL string `u` that does not begin with `http://` or `https://` (case-insensitive), the URL stored by `addLink` SHALL equal `"https://" + u`.

**Validates: Requirements 7.7**

---

### Property 22: Link cap is enforced at 50 entries

*For any* links list already containing exactly 50 entries, calling `addLink` with any valid label and URL SHALL leave the list length at 50 — no 51st entry is written to `localStorage`.

**Validates: Requirements 7.2**

---

### Property 23: Link delete reduces list by exactly one

*For any* non-empty links list, calling `deleteLink(id)` for any existing link `id` SHALL reduce the links list length by exactly 1, and the link with that `id` SHALL no longer be present in `localStorage`.

**Validates: Requirements 7.4**

---

### Property 24: Invalid link (empty label or URL) is rejected

*For any* call to `addLink(label, url)` where `label.trim().length === 0` OR `url.trim().length === 0`, the links list length and contents SHALL remain identical to what they were before the call.

**Validates: Requirements 7.6**

---

### Property 25: Theme toggle persists the opposite theme

*For any* current theme value (`'light'` or `'dark'`), calling `toggle()` SHALL write the opposite theme value to `localStorage` under the `dashboard_theme` key, and calling `toggle()` again SHALL restore the original value.

**Validates: Requirements 8.3**

---

## Error Handling

### localStorage Unavailability

`Dashboard.storage.set` wraps every `setItem` in a `try/catch`. If `QuotaExceededError` or any other storage error is thrown:

- The error is silently caught.
- The in-memory state remains valid and the UI continues to function.
- No crash, no alert dialog.

`Dashboard.storage.get` catches `SyntaxError` from malformed JSON and returns `null`, triggering default empty state.

### Input Validation Errors

Each module displays inline error messages in dedicated `<p class="error-msg">` elements adjacent to the offending input field. Errors are cleared on the next valid submission or when the input field is focused again.

### Timer Edge Cases

- If `setInterval` fires more than once in rapid succession (tab backgrounded, then foregrounded), the timer will skip seconds. This is acceptable browser behaviour — no correction is applied. The countdown will simply reflect the elapsed real time on the next tick.
- Calling `start()` when `running === true` is a no-op (guarded by state check).

### Notification Auto-Dismiss

The completion notification `setTimeout` handle is stored in a module variable. If `reset()` is called while the notification is visible, `clearTimeout` cancels the auto-dismiss and the notification is hidden immediately.

---

## Testing Strategy

### Applicability of Property-Based Testing

This feature contains a significant amount of pure business logic (greeting selection, validation, sort ordering, URL normalisation, timer arithmetic, storage round-trips) that is well-suited to property-based testing. PBT is used for all universally-quantified properties above.

The UI rendering layer (CSS, HTML structure, visual appearance) is not covered by PBT — snapshot tests or manual review are appropriate there.

### Property-Based Testing Library

**[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript) is used for all property-based tests. It provides:

- Arbitrary generators for strings, integers, arrays, objects
- Automatic shrinking of failing examples
- Configurable run count (minimum 100 iterations per property)

### Test Organisation

Tests live in a `test/` directory adjacent to the source. Because the source is vanilla JS (no ES modules), a thin test harness (`test/harness.js`) exposes pure functions extracted from `app.js` into testable units:

```
test/
  unit/
    greeting.test.js    — Properties 1–4  (formatTime, formatDate, getGreeting, buildGreeting)
    username.test.js    — Properties 5–6  (setUserName / getUserName round-trip)
    timer.test.js       — Properties 7–10 (tick, formatTimer, reset)
    tasks.test.js       — Properties 11–19 (addTask, toggleComplete, deleteTask, saveEdit, setSortMode)
    links.test.js       — Properties 20–25 (addLink, deleteLink, URL normalisation)
```

### Property Test Configuration

Each property-based test is tagged with a comment referencing the design property and runs a minimum of 100 iterations:

```js
// Feature: personal-dashboard, Property 11: Task add round-trip
fc.assert(
  fc.property(
    fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
    (text) => {
      const list = addTask([], text);
      return list.length === 1
        && list[0].text === text.trim()
        && list[0].done === false;
    }
  ),
  { numRuns: 100 }
);

// Feature: personal-dashboard, Property 3: Time-based greeting exhaustive coverage
fc.assert(
  fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
    const greeting = getGreeting(hour);
    const valid = ['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night'];
    return valid.includes(greeting);
  }),
  { numRuns: 100 }
);
```

### Unit / Example Tests

Example-based tests cover concrete scenarios not addressed by the property generators:

| Test | Covers |
|---|---|
| `init()` produces `remaining=1500, running=false` | Requirements 4.1 |
| Start → stop → check `remaining` retained | Requirements 4.3 |
| Timer reset from running state | Requirements 4.5 |
| Completion notification appears and hides after 5 s | Requirements 4.8 |
| `localStorage` unavailability → no crash | Requirements 9.2 |
| Default sort mode is `'all'` on init | Requirements 6.4 |
| Theme defaults to light when no key in storage | Requirements 8.5 |
| Theme applies saved value on load | Requirements 8.4 |

### Smoke Tests (Manual Browser Verification)

Run once per browser (Chrome 110+, Firefox 110+, Edge 110+, Safari 16+):

1. Open `index.html` via `file://` — all five widgets render within 2 seconds.
2. Reload with existing `localStorage` data — tasks, links, name, and theme all restored.
3. Toggle theme — no flash; dark/light class on `<html>` persists across reload.
4. Complete a full Pomodoro cycle — notification appears and auto-dismisses at 5 seconds.
5. Add 50 links — 51st is rejected with a visible error.
6. Set name, close tab, reopen — name persists in greeting.

### Test Execution

```bash
# Run all property and unit tests (single pass, no watch mode)
node test/run.js
```
