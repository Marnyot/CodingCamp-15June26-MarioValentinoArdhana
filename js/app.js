/**
 * Personal Dashboard — app.js
 *
 * Single-file, zero-dependency JavaScript application.
 * All modules live on the global `window.Dashboard` namespace.
 *
 * localStorage keys:
 *   dashboard_tasks    — Task[]  (JSON)
 *   dashboard_links    — Link[]  (JSON)
 *   dashboard_username — string  (JSON)
 *   dashboard_theme    — 'light' | 'dark' (JSON)
 */

/* ==========================================================================
   Dashboard Namespace
   ========================================================================== */
window.Dashboard = window.Dashboard || {};

/* ==========================================================================
   Dashboard.storage — localStorage wrapper
   Requirements: 9.1, 9.2, 9.3
   ========================================================================== */
Dashboard.storage = {
  /**
   * Retrieve and JSON-parse a value from localStorage.
   * Returns null if the key does not exist or the stored value is not valid JSON.
   * @param {string} key
   * @returns {*} parsed value or null
   */
  get: function (key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  },

  /**
   * JSON-stringify a value and write it to localStorage.
   * Silently swallows any error, including QuotaExceededError.
   * @param {string} key
   * @param {*} value
   */
  set: function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Silently ignore QuotaExceededError and any other storage errors.
    }
  },

  /**
   * Remove a key from localStorage.
   * No-op if the key does not exist.
   * @param {string} key
   */
  remove: function (key) {
    localStorage.removeItem(key);
  }
};

/* ==========================================================================
   Dashboard.theme — Theme_Toggle module
   Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   ========================================================================== */
Dashboard.theme = {
  /**
   * Read the saved theme from storage and apply it; then register the
   * click listener on the #theme-toggle button.
   * Must run before any UI is rendered to prevent a flash of wrong theme.
   */
  init: function () {
    var saved = Dashboard.storage.get('dashboard_theme');

    // Apply saved dark theme; default (no key or 'light') leaves light mode.
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    }

    // Update button label to reflect current mode.
    Dashboard.theme._updateButton();

    // Register toggle listener on the #theme-toggle button.
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        Dashboard.theme.toggle();
      });
    }
  },

  /**
   * Flip the current theme:
   *   dark  → remove 'dark' class, save 'light'
   *   light → add    'dark' class, save 'dark'
   * Then persist the new value and update the button label.
   */
  toggle: function () {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      Dashboard.storage.set('dashboard_theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      Dashboard.storage.set('dashboard_theme', 'dark');
    }
    Dashboard.theme._updateButton();
  },

  /**
   * Internal helper — update the #theme-toggle button's text content to
   * reflect the NEXT action the user can take:
   *   currently dark  → show 🌙 (switch to light)   … wait, per spec:
   *   light mode      → button shows 🌙 (clicking will go dark)
   *   dark mode       → button shows ☀️ (clicking will go light)
   * @private
   */
  _updateButton: function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) { return; }
    if (document.documentElement.classList.contains('dark')) {
      // Currently dark — offer to switch to light
      btn.textContent = '☀️';
      btn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      // Currently light — offer to switch to dark
      btn.textContent = '🌙';
      btn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }
};

/* ==========================================================================
   Pure helper functions — Greeting_Widget helpers
   Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5
   ========================================================================== */

/**
 * Format a Date as a zero-padded HH:MM:SS string using 24-hour local time.
 * @param {Date} date
 * @returns {string} e.g. "09:05:03"
 */
function formatTime(date) {
  var hh = String(date.getHours()).padStart(2, '0');
  var mm = String(date.getMinutes()).padStart(2, '0');
  var ss = String(date.getSeconds()).padStart(2, '0');
  return hh + ':' + mm + ':' + ss;
}

/**
 * Format a Date as "Weekday, Month Day, Year" using local timezone.
 * @param {Date} date
 * @returns {string} e.g. "Monday, July 14, 2025"
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Return the appropriate time-based greeting for the given hour (0–23).
 * @param {number} hour  Integer in [0, 23]
 * @returns {string} One of "Good Morning", "Good Afternoon", "Good Evening", "Good Night"
 */
function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) {
    return 'Good Morning';
  } else if (hour >= 12 && hour <= 17) {
    return 'Good Afternoon';
  } else if (hour >= 18 && hour <= 20) {
    return 'Good Evening';
  } else {
    // hours 21–23 and 0–4
    return 'Good Night';
  }
}

/**
 * Build a full greeting string, optionally including a name.
 * @param {number} hour  Integer in [0, 23]
 * @param {string} [name]  Optional user name
 * @returns {string} e.g. "Good Morning, Alex" or "Good Morning"
 */
function buildGreeting(hour, name) {
  var greeting = getGreeting(hour);
  if (name && name.trim().length >= 1) {
    return greeting + ', ' + name.trim();
  }
  return greeting;
}

// Expose pure helpers on Dashboard namespace for testability
Dashboard.formatTime    = formatTime;
Dashboard.formatDate    = formatDate;
Dashboard.getGreeting   = getGreeting;
Dashboard.buildGreeting = buildGreeting;

/* ==========================================================================
   Dashboard.greeting — Greeting_Widget module
   Requirements: 1.1, 1.2, 1.3, 2.1–2.5, 3.1–3.5
   ========================================================================== */

var _greetingState = { userName: null };
var _clockInterval = null;

Dashboard.greeting = {
  /**
   * Initialise the greeting widget:
   *   - Load saved username from localStorage
   *   - Render immediately
   *   - Start 1-second clock interval
   *   - Register name-form submit handler
   *   - Pre-populate name input with saved value
   */
  init: function () {
    // Load saved username
    _greetingState.userName = Dashboard.storage.get('dashboard_username');

    // Initial render
    Dashboard.greeting.render();

    // Start clock interval — updates every second
    _clockInterval = setInterval(Dashboard.greeting.render, 1000);

    // Register name-form submit handler
    var form = document.getElementById('name-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = document.getElementById('name-input');
        var rawValue = input ? input.value : '';
        Dashboard.greeting.setName(rawValue);
        // Update the input field to show the trimmed name (or clear if empty)
        if (input) {
          input.value = _greetingState.userName !== null ? _greetingState.userName : '';
        }
      });
    }

    // Pre-populate name input with saved value if it exists
    if (_greetingState.userName) {
      var nameInput = document.getElementById('name-input');
      if (nameInput) {
        nameInput.value = _greetingState.userName;
      }
    }
  },

  /**
   * Render the current time, date, and greeting to the DOM.
   * All DOM accesses are guarded with null checks for test environments.
   */
  render: function () {
    var now = new Date();

    var clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = formatTime(now);
    }

    var dateEl = document.getElementById('date');
    if (dateEl) {
      dateEl.textContent = formatDate(now);
    }

    var greetingEl = document.getElementById('greeting-text');
    if (greetingEl) {
      greetingEl.textContent = buildGreeting(now.getHours(), _greetingState.userName);
    }
  },

  /**
   * Save and apply a new username.
   * Trims the input:
   *   - 1–50 chars: persist trimmed value, update state
   *   - 0 chars (empty/whitespace): remove key, clear state
   *   - >50 chars: silently truncate to 50, then persist
   * Always calls render() after updating state.
   * @param {string} name
   */
  setName: function (name) {
    var trimmed = String(name).trim();

    if (trimmed.length === 0) {
      // Empty or whitespace-only — clear stored name
      Dashboard.storage.remove('dashboard_username');
      _greetingState.userName = null;
    } else {
      // Silently truncate to 50 chars if over the limit
      if (trimmed.length > 50) {
        trimmed = trimmed.slice(0, 50);
      }
      Dashboard.storage.set('dashboard_username', trimmed);
      _greetingState.userName = trimmed;
    }

    Dashboard.greeting.render();
  }
};

/* ==========================================================================
   Pure helper functions — Focus_Timer helpers
   Requirements: 4.2, 4.6, 4.7
   ========================================================================== */

/**
 * Convert a total number of seconds to a zero-padded "MM:SS" string.
 * @param {number} seconds  Integer in [0, 1500]
 * @returns {string} e.g. "25:00", "01:30", "00:00"
 */
function formatTimer(seconds) {
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/**
 * Pure timer tick — returns a new state object, never mutates the input.
 * - If not running:         returns state unchanged
 * - If remaining <= 1:      returns { remaining: 0, running: false }
 * - Otherwise:              returns { remaining: state.remaining - 1, running: true }
 * @param {{ remaining: number, running: boolean }} state
 * @returns {{ remaining: number, running: boolean }}
 */
function tick(state) {
  if (!state.running) {
    return { remaining: state.remaining, running: false };
  }
  if (state.remaining <= 1) {
    return { remaining: 0, running: false };
  }
  return { remaining: state.remaining - 1, running: true };
}

// Expose pure helpers on Dashboard namespace for testability
Dashboard.formatTimer = formatTimer;
Dashboard.tick        = tick;

/* ==========================================================================
   Dashboard.timer — Focus_Timer module
   Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
   ========================================================================== */

/** Module-level timer state */
var _timerState = { remaining: 1500, running: false, intervalId: null };
/** Handle for the 5-second auto-dismiss timeout after completion */
var _timerNotifyTimeout = null;

/**
 * Internal render — updates #timer-display text to the formatted remaining time.
 * @private
 */
function _timerRender() {
  var el = document.getElementById('timer-display');
  if (el) {
    el.textContent = formatTimer(_timerState.remaining);
  }
}

Dashboard.timer = {
  /**
   * Initialise the timer widget:
   *   - Reset state to 1500 s, not running
   *   - Render the display
   *   - Register click listeners on Start / Stop / Reset buttons
   *   - Register click + keydown listeners on document to dismiss notification
   * Requirements: 4.1, 4.7, 4.8
   */
  init: function () {
    _timerState = { remaining: 1500, running: false, intervalId: null };
    _timerRender();

    var startBtn = document.getElementById('timer-start');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        Dashboard.timer.start();
      });
    }

    var stopBtn = document.getElementById('timer-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        Dashboard.timer.stop();
      });
    }

    var resetBtn = document.getElementById('timer-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        Dashboard.timer.reset();
      });
    }

    // Dismiss notification on any user interaction (Requirement 4.8)
    function _dismissNotification() {
      var notif = document.getElementById('timer-notification');
      if (notif) {
        notif.classList.add('hidden');
      }
    }

    document.addEventListener('click', _dismissNotification);
    document.addEventListener('keydown', _dismissNotification);
  },

  /**
   * Start or resume the countdown.
   * No-op if already running (Requirement 4.4 guard).
   * Requirements: 4.2, 4.4, 4.6
   */
  start: function () {
    // Guard: no-op if already running
    if (_timerState.running === true) {
      return;
    }

    _timerState.running = true;

    _timerState.intervalId = setInterval(function () {
      // Advance the state by one tick
      _timerState = tick(_timerState);
      _timerRender();

      // Check for completion
      if (_timerState.remaining === 0) {
        clearInterval(_timerState.intervalId);
        _timerState.intervalId = null;

        // Show completion notification (Requirement 4.6)
        var notif = document.getElementById('timer-notification');
        if (notif) {
          notif.classList.remove('hidden');
        }

        // Auto-dismiss after 5 seconds (Requirement 4.6, 4.8)
        _timerNotifyTimeout = setTimeout(function () {
          var n = document.getElementById('timer-notification');
          if (n) {
            n.classList.add('hidden');
          }
          _timerNotifyTimeout = null;
        }, 5000);
      }
    }, 1000);
  },

  /**
   * Pause the countdown, retaining remaining time.
   * Requirements: 4.3
   */
  stop: function () {
    clearInterval(_timerState.intervalId);
    _timerState.running = false;
    _timerState.intervalId = null;
    _timerRender();
  },

  /**
   * Stop the countdown, cancel any pending notification timeout,
   * reset remaining to 1500, and hide the notification.
   * Requirements: 4.1, 4.5
   */
  reset: function () {
    clearInterval(_timerState.intervalId);
    clearTimeout(_timerNotifyTimeout);
    _timerNotifyTimeout = null;

    _timerState = { remaining: 1500, running: false, intervalId: null };

    // Hide any visible notification immediately (Requirement 4.8)
    var notif = document.getElementById('timer-notification');
    if (notif) {
      notif.classList.add('hidden');
    }

    _timerRender();
  }
};

/* ==========================================================================
   Pure helper functions — Task_Manager helpers
   Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 5.9, 5.10, 6.1, 6.2
   ========================================================================== */

/**
 * Generate a lightweight unique string ID.
 * Combines the current timestamp in base-36 with random base-36 characters.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Pure function — return a new tasks array with one item appended, or null if
 * the text is invalid (empty/whitespace or exceeds 500 chars).
 * Does NOT mutate the input array.
 * @param {Array}  tasks  Current task list
 * @param {string} text   Raw input from the user
 * @returns {Array|null}  New array on success, null on validation failure
 * Requirements: 5.2, 5.9
 */
function addTask(tasks, text) {
  var trimmed = String(text).trim();
  if (trimmed.length < 1 || trimmed.length > 500) {
    return null;
  }
  return tasks.concat([{
    id:        generateId(),
    text:      trimmed,
    done:      false,
    createdAt: Date.now()
  }]);
}

/**
 * Pure function — return a new tasks array with the task matching `id` removed.
 * Does NOT mutate the input array.
 * @param {Array}  tasks
 * @param {string} id
 * @returns {Array}
 * Requirements: 5.7
 */
function deleteTask(tasks, id) {
  return tasks.filter(function (task) {
    return task.id !== id;
  });
}

/**
 * Pure function — return a new tasks array with the matching task's `done`
 * field flipped. All other fields and all other tasks are unchanged.
 * Does NOT mutate the input array.
 * @param {Array}  tasks
 * @param {string} id
 * @returns {Array}
 * Requirements: 5.3, 5.4
 */
function toggleComplete(tasks, id) {
  return tasks.map(function (task) {
    if (task.id === id) {
      return { id: task.id, text: task.text, done: !task.done, createdAt: task.createdAt };
    }
    return task;
  });
}

/**
 * Pure function — return a new tasks array with the matching task's `text`
 * updated to newText.trim(). Returns the original array unchanged (same or
 * equivalent) when newText is empty/whitespace or exceeds 500 chars.
 * Does NOT mutate the input array.
 * @param {Array}  tasks
 * @param {string} id
 * @param {string} newText
 * @returns {Array}
 * Requirements: 5.6, 5.10
 */
function saveEdit(tasks, id, newText) {
  var trimmed = String(newText).trim();
  if (trimmed.length < 1 || trimmed.length > 500) {
    // Validation failed — return a shallow copy to keep immutability contract
    return tasks.slice();
  }
  return tasks.map(function (task) {
    if (task.id === id) {
      return { id: task.id, text: trimmed, done: task.done, createdAt: task.createdAt };
    }
    return task;
  });
}

/**
 * Pure function — return a new sorted array for display purposes.
 * NEVER mutates the input tasks array.
 *
 *   'all'       → creation order (as stored)
 *   'active'    → incomplete (done===false) first, then complete (done===true);
 *                 ties within each group sorted by createdAt ascending
 *   'completed' → complete (done===true) first, then incomplete (done===false);
 *                 ties within each group sorted by createdAt ascending
 *
 * @param {Array}  tasks
 * @param {string} mode  'all' | 'active' | 'completed'
 * @returns {Array}
 * Requirements: 6.1, 6.2
 */
function sortTasks(tasks, mode) {
  if (mode === 'all') {
    return tasks.slice(); // preserve creation order
  }

  // For 'active': primary sort key — done===false before done===true (false=0, true=1)
  // For 'completed': primary sort key — done===true before done===false (true=0 means first)
  var copy = tasks.slice();
  copy.sort(function (a, b) {
    var aKey, bKey;
    if (mode === 'active') {
      // false (0) sorts before true (1) — incomplete first
      aKey = a.done ? 1 : 0;
      bKey = b.done ? 1 : 0;
    } else {
      // 'completed': true (0) sorts before false (1) — complete first
      aKey = a.done ? 0 : 1;
      bKey = b.done ? 0 : 1;
    }
    if (aKey !== bKey) {
      return aKey - bKey;
    }
    // Tie-break by createdAt ascending (oldest first within each group)
    return a.createdAt - b.createdAt;
  });
  return copy;
}

// Expose pure task helpers on Dashboard namespace for testability
Dashboard.generateId     = generateId;
Dashboard.addTask        = addTask;
Dashboard.deleteTask     = deleteTask;
Dashboard.toggleComplete = toggleComplete;
Dashboard.saveEdit       = saveEdit;
Dashboard.sortTasks      = sortTasks;

/* ==========================================================================
   Dashboard.tasks — Task_Manager module
   Requirements: 5.1–5.11, 6.1–6.4, 9.4
   ========================================================================== */

/** Module-level task state */
var _tasksState = { tasks: [], sortMode: 'all' };

/**
 * Internal render — rebuilds #task-list and updates sort button active states.
 * Not exposed on the public API.
 * @private
 */
function _tasksRender() {
  var list = document.getElementById('task-list');
  if (!list) { return; }

  var displayTasks = sortTasks(_tasksState.tasks, _tasksState.sortMode);

  // Rebuild the task list HTML
  var html = '';
  for (var i = 0; i < displayTasks.length; i++) {
    var task = displayTasks[i];
    var doneClass = task.done ? ' done' : '';
    var checkedAttr = task.done ? ' checked' : '';
    html +=
      '<li class="task-item" data-task-id="' + task.id + '">' +
        '<input type="checkbox" class="task-checkbox" aria-label="Mark complete"' + checkedAttr + '>' +
        '<span class="task-text' + doneClass + '">' + _escapeHtml(task.text) + '</span>' +
        '<button class="btn btn-small task-edit-btn" type="button" aria-label="Edit task">Edit</button>' +
        '<button class="btn btn-small btn-secondary task-delete-btn" type="button" aria-label="Delete task">Delete</button>' +
      '</li>';
  }
  list.innerHTML = html;

  // Attach event listeners to each task item
  var items = list.querySelectorAll('li[data-task-id]');
  for (var j = 0; j < items.length; j++) {
    (function (li) {
      var id = li.getAttribute('data-task-id');

      var checkbox = li.querySelector('.task-checkbox');
      if (checkbox) {
        checkbox.addEventListener('change', function () {
          Dashboard.tasks.toggleComplete(id);
        });
      }

      var editBtn = li.querySelector('.task-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          Dashboard.tasks.beginEdit(id);
        });
      }

      var deleteBtn = li.querySelector('.task-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          Dashboard.tasks.deleteTask(id);
        });
      }
    })(items[j]);
  }

  // Update sort button active states
  var sortAll       = document.getElementById('sort-all');
  var sortActive    = document.getElementById('sort-active');
  var sortCompleted = document.getElementById('sort-completed');

  if (sortAll)       { sortAll.classList.toggle('btn-sort-active',       _tasksState.sortMode === 'all'); }
  if (sortActive)    { sortActive.classList.toggle('btn-sort-active',    _tasksState.sortMode === 'active'); }
  if (sortCompleted) { sortCompleted.classList.toggle('btn-sort-active', _tasksState.sortMode === 'completed'); }

  // Clear any existing error on successful render
  var errorEl = document.getElementById('tasks-error');
  if (errorEl) { errorEl.textContent = ''; }
}

/**
 * Escape HTML special characters to prevent XSS in innerHTML.
 * @param {string} str
 * @returns {string}
 * @private
 */
function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

Dashboard.tasks = {
  /**
   * Initialise the Task_Manager widget:
   *   - Load saved tasks from localStorage (default [])
   *   - Set default sort mode to 'all'
   *   - Render the task list
   *   - Register the add-form submit handler
   *   - Wire the sort buttons
   * Requirements: 5.2, 5.8, 6.4, 9.4
   */
  init: function () {
    var saved = Dashboard.storage.get('dashboard_tasks');
    _tasksState.tasks    = Array.isArray(saved) ? saved : [];
    _tasksState.sortMode = 'all';

    _tasksRender();

    // Register add-form submit handler
    var form = document.getElementById('task-add-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = document.getElementById('task-input');
        var value = input ? input.value : '';
        var result = Dashboard.tasks.addTask(value);
        // Clear the input only on success (addTask returns truthy on success)
        if (result !== false && input) {
          input.value = '';
        }
      });
    }

    // Wire sort buttons
    var sortAllBtn = document.getElementById('sort-all');
    if (sortAllBtn) {
      sortAllBtn.addEventListener('click', function () {
        Dashboard.tasks.setSortMode('all');
      });
    }

    var sortActiveBtn = document.getElementById('sort-active');
    if (sortActiveBtn) {
      sortActiveBtn.addEventListener('click', function () {
        Dashboard.tasks.setSortMode('active');
      });
    }

    var sortCompletedBtn = document.getElementById('sort-completed');
    if (sortCompletedBtn) {
      sortCompletedBtn.addEventListener('click', function () {
        Dashboard.tasks.setSortMode('completed');
      });
    }
  },

  /**
   * Add a new task to the list.
   * Shows an error in #tasks-error if text is empty/whitespace.
   * Persists and re-renders on success.
   * @param {string} text
   * @returns {boolean} true on success, false on validation failure
   * Requirements: 5.2, 5.9, 5.11, 9.4
   */
  addTask: function (text) {
    var result = addTask(_tasksState.tasks, text);
    if (result === null) {
      var errorEl = document.getElementById('tasks-error');
      if (errorEl) { errorEl.textContent = 'Task cannot be empty'; }
      return false;
    }
    _tasksState.tasks = result;
    Dashboard.storage.set('dashboard_tasks', _tasksState.tasks);
    _tasksRender();
    return true;
  },

  /**
   * Remove a task by id. Persists and re-renders.
   * @param {string} id
   * Requirements: 5.7, 9.4
   */
  deleteTask: function (id) {
    _tasksState.tasks = deleteTask(_tasksState.tasks, id);
    Dashboard.storage.set('dashboard_tasks', _tasksState.tasks);
    _tasksRender();
  },

  /**
   * Toggle the completion status of a task by id. Persists and re-renders.
   * @param {string} id
   * Requirements: 5.3, 5.4, 9.4
   */
  toggleComplete: function (id) {
    _tasksState.tasks = toggleComplete(_tasksState.tasks, id);
    Dashboard.storage.set('dashboard_tasks', _tasksState.tasks);
    _tasksRender();
  },

  /**
   * Replace the task list item for the given id with an inline edit field.
   * The edit field is pre-filled with the current task text.
   * @param {string} id
   * Requirements: 5.5, 5.6
   */
  beginEdit: function (id) {
    var list = document.getElementById('task-list');
    if (!list) { return; }

    var li = list.querySelector('li[data-task-id="' + id + '"]');
    if (!li) { return; }

    // Find the current task text
    var task = null;
    for (var i = 0; i < _tasksState.tasks.length; i++) {
      if (_tasksState.tasks[i].id === id) {
        task = _tasksState.tasks[i];
        break;
      }
    }
    if (!task) { return; }

    // Replace li contents with inline edit UI
    li.innerHTML =
      '<input type="text" class="text-input task-edit-input" maxlength="500" aria-label="Edit task text" value="' + _escapeHtml(task.text) + '">' +
      '<button class="btn btn-small task-save-btn" type="button">Save</button>' +
      '<button class="btn btn-small btn-secondary task-cancel-btn" type="button">Cancel</button>' +
      '<span class="error-msg task-edit-error"></span>';

    var editInput  = li.querySelector('.task-edit-input');
    var saveBtn    = li.querySelector('.task-save-btn');
    var cancelBtn  = li.querySelector('.task-cancel-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var val = editInput ? editInput.value : '';
        Dashboard.tasks.saveEdit(id, val);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        _tasksRender();
      });
    }

    // Focus the input for immediate typing
    if (editInput) {
      editInput.focus();
      // Place cursor at end
      var len = editInput.value.length;
      editInput.setSelectionRange(len, len);
    }
  },

  /**
   * Save an edited task description.
   * Shows an error near the edit field if text is empty/whitespace.
   * Persists and re-renders on success.
   * @param {string} id
   * @param {string} text
   * Requirements: 5.6, 5.10, 5.11, 9.4
   */
  saveEdit: function (id, text) {
    var trimmed = String(text).trim();
    if (trimmed.length < 1 || trimmed.length > 500) {
      // Show error near the edit field
      var list = document.getElementById('task-list');
      if (list) {
        var li = list.querySelector('li[data-task-id="' + id + '"]');
        if (li) {
          var errEl = li.querySelector('.task-edit-error');
          if (errEl) { errEl.textContent = 'Task cannot be empty'; }
        }
      }
      return;
    }
    var result = saveEdit(_tasksState.tasks, id, text);
    _tasksState.tasks = result;
    Dashboard.storage.set('dashboard_tasks', _tasksState.tasks);
    _tasksRender();
  },

  /**
   * Change the active sort mode and re-render.
   * Does NOT write to localStorage — sort is view-only.
   * @param {string} mode  'all' | 'active' | 'completed'
   * Requirements: 6.1, 6.2, 6.3
   */
  setSortMode: function (mode) {
    _tasksState.sortMode = mode;
    _tasksRender();
  }
};

/* ==========================================================================
   Pure helper functions — Quick_Links helpers
   Requirements: 7.2, 7.4, 7.6, 7.7
   ========================================================================== */

/**
 * Normalise a URL by prepending "https://" if it does not already have an
 * http:// or https:// scheme (case-insensitive).
 * @param {string} url
 * @returns {string}
 * Requirements: 7.7
 */
function normaliseUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return 'https://' + url;
}

/**
 * Pure function — return a new links array with one item appended, or null if
 * any validation fails:
 *   - label.trim().length >= 1 and <= 50
 *   - url.trim().length >= 1 and <= 2048
 *   - links.length < 50 (cap at 50 entries)
 * Does NOT mutate the input array.
 * @param {Array}  links  Current links list
 * @param {string} label  Raw label input
 * @param {string} url    Raw URL input
 * @returns {Array|null}  New array on success, null on validation failure
 * Requirements: 7.2, 7.6, 7.7
 */
function addLink(links, label, url) {
  var trimmedLabel = String(label).trim();
  var trimmedUrl   = String(url).trim();

  if (
    trimmedLabel.length < 1 ||
    trimmedLabel.length > 50 ||
    trimmedUrl.length < 1 ||
    trimmedUrl.length > 2048 ||
    links.length >= 50
  ) {
    return null;
  }

  return links.concat([{
    id:    generateId(),
    label: trimmedLabel,
    url:   normaliseUrl(trimmedUrl)
  }]);
}

/**
 * Pure function — return a new links array with the link matching `id` removed.
 * Does NOT mutate the input array.
 * @param {Array}  links
 * @param {string} id
 * @returns {Array}
 * Requirements: 7.4
 */
function deleteLink(links, id) {
  return links.filter(function (link) {
    return link.id !== id;
  });
}

// Expose pure link helpers on Dashboard namespace for testability
Dashboard.normaliseUrl = normaliseUrl;
Dashboard.addLink      = addLink;
Dashboard.deleteLink   = deleteLink;

/* ==========================================================================
   Dashboard.links — Quick_Links module
   Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
   ========================================================================== */

/** Module-level links state */
var _linksState = { links: [] };

/**
 * Internal render — rebuilds #link-grid from current state.
 * Not exposed on the public API.
 * @private
 */
function _linksRender() {
  var grid = document.getElementById('link-grid');
  if (!grid) { return; }

  var html = '';
  for (var i = 0; i < _linksState.links.length; i++) {
    var link = _linksState.links[i];
    html +=
      '<div class="link-item">' +
        '<a href="' + _escapeHtml(link.url) + '" target="_blank" rel="noopener noreferrer" class="link-btn">' +
          _escapeHtml(link.label) +
        '</a>' +
        '<button class="btn btn-icon btn-small" type="button" data-link-id="' + _escapeHtml(link.id) + '" aria-label="Delete link">✕</button>' +
      '</div>';
  }
  grid.innerHTML = html;

  // Attach delete listeners
  var deleteBtns = grid.querySelectorAll('button[data-link-id]');
  for (var j = 0; j < deleteBtns.length; j++) {
    (function (btn) {
      var id = btn.getAttribute('data-link-id');
      btn.addEventListener('click', function () {
        Dashboard.links.deleteLink(id);
      });
    })(deleteBtns[j]);
  }

  // Clear error on successful render
  var errorEl = document.getElementById('links-error');
  if (errorEl) { errorEl.textContent = ''; }
}

Dashboard.links = {
  /**
   * Initialise the Quick_Links widget:
   *   - Load saved links from localStorage (default [])
   *   - Render the link grid
   *   - Register submit listener on #link-add-form
   * Requirements: 7.1, 7.5
   */
  init: function () {
    var saved = Dashboard.storage.get('dashboard_links');
    _linksState.links = Array.isArray(saved) ? saved : [];

    _linksRender();

    var form = document.getElementById('link-add-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var labelInput = document.getElementById('link-label-input');
        var urlInput   = document.getElementById('link-url-input');
        var label = labelInput ? labelInput.value : '';
        var url   = urlInput   ? urlInput.value   : '';

        var ok = Dashboard.links.addLink(label, url);
        if (ok) {
          if (labelInput) { labelInput.value = ''; }
          if (urlInput)   { urlInput.value   = ''; }
        }
      });
    }
  },

  /**
   * Add a new link to the list.
   * Shows an error in #links-error if validation fails.
   * Shows a specific error if the 50-link cap is reached.
   * Persists and re-renders on success.
   * @param {string} label
   * @param {string} url
   * @returns {boolean} true on success, false on validation failure
   * Requirements: 7.2, 7.6, 7.7
   */
  addLink: function (label, url) {
    // Check cap first for a specific error message
    if (_linksState.links.length >= 50) {
      var capErrorEl = document.getElementById('links-error');
      if (capErrorEl) { capErrorEl.textContent = 'Maximum 50 links reached'; }
      return false;
    }

    var result = addLink(_linksState.links, label, url);
    if (result === null) {
      var errorEl = document.getElementById('links-error');
      if (errorEl) { errorEl.textContent = 'Invalid link — check label and URL'; }
      return false;
    }

    _linksState.links = result;
    Dashboard.storage.set('dashboard_links', _linksState.links);
    _linksRender();
    return true;
  },

  /**
   * Remove a link by id. Persists and re-renders.
   * @param {string} id
   * Requirements: 7.4, 9.4
   */
  deleteLink: function (id) {
    _linksState.links = deleteLink(_linksState.links, id);
    Dashboard.storage.set('dashboard_links', _linksState.links);
    _linksRender();
  }
};

/* ==========================================================================
   Application bootstrap
   Initialisation order matters: theme MUST run first to prevent flash.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function () {
  Dashboard.theme.init();
  Dashboard.greeting.init();
  Dashboard.timer.init();
  Dashboard.tasks.init();
  Dashboard.links.init();
});
