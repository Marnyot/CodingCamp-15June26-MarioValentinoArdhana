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
   Dashboard.tasks — Task_Manager module
   (implementation added in Task 7)
   ========================================================================== */
Dashboard.tasks = {
  init: function () {
    // stub — implemented in Task 7
  },
  addTask: function (text) {
    // stub — implemented in Task 7
  },
  deleteTask: function (id) {
    // stub — implemented in Task 7
  },
  toggleComplete: function (id) {
    // stub — implemented in Task 7
  },
  beginEdit: function (id) {
    // stub — implemented in Task 7
  },
  saveEdit: function (id, text) {
    // stub — implemented in Task 7
  },
  setSortMode: function (mode) {
    // stub — implemented in Task 7
  }
};

/* ==========================================================================
   Dashboard.links — Quick_Links module
   (implementation added in Task 9)
   ========================================================================== */
Dashboard.links = {
  init: function () {
    // stub — implemented in Task 9
  },
  addLink: function (label, url) {
    // stub — implemented in Task 9
  },
  deleteLink: function (id) {
    // stub — implemented in Task 9
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
