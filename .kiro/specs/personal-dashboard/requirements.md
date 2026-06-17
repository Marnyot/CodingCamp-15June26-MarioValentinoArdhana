# Requirements Document

## Introduction

The Personal Dashboard is a client-side web application designed to serve as a browser new tab page or standalone web app. It provides a unified, minimal interface for productivity and quick access to frequently used resources. The application requires no backend server; all data is persisted using the browser's Local Storage API. The dashboard includes a greeting with live time and date, a Pomodoro-style focus timer, a task manager, a quick-links panel, and a light/dark mode toggle. Users can personalize the greeting with a custom name.

## Glossary

- **Dashboard**: The main single-page web application rendered in the browser.
- **Greeting_Widget**: The UI component that displays the current time, date, and a personalized greeting message.
- **Focus_Timer**: The UI component implementing a 25-minute countdown timer with start, stop, and reset controls.
- **Task_Manager**: The UI component that allows users to create, edit, complete, sort, and delete tasks.
- **Task**: A single to-do item consisting of a text description and a completion status.
- **Quick_Links**: The UI component that displays a collection of user-defined URL shortcuts as clickable buttons.
- **Link**: A single quick-link entry consisting of a label and a URL.
- **Theme_Toggle**: The UI control that switches the Dashboard between light mode and dark mode.
- **Local_Storage**: The browser's `localStorage` API used for all client-side data persistence.
- **User_Name**: A string entered by the user to personalize the greeting.

---

## Requirements

---

### Requirement 1: Live Time and Date Display

**User Story:** As a user, I want to see the current time and date on my dashboard, so that I can stay aware of the time without switching tabs.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM:SS format using the user's local timezone as reported by the browser, updated every second.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, Month Day, Year" (e.g., "Monday, July 14, 2025"), derived from the user's local timezone.
3. WHEN the Dashboard loads, THE Greeting_Widget SHALL begin updating the displayed time within 1 second without requiring user interaction.

---

### Requirement 2: Time-Based Greeting

**User Story:** As a user, I want to see a greeting that reflects the time of day, so that the dashboard feels personalized and contextual.

#### Acceptance Criteria

1. WHEN the local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good Morning".
2. WHEN the local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
3. WHEN the local hour is between 18:00 and 20:59, THE Greeting_Widget SHALL display the greeting "Good Evening".
4. WHEN the local hour is between 21:00 and 04:59, THE Greeting_Widget SHALL display the greeting "Good Night".
5. WHEN a User_Name has been saved, THE Greeting_Widget SHALL append the User_Name to the greeting (e.g., "Good Morning, Alex").

---

### Requirement 3: Custom Name in Greeting

**User Story:** As a user, I want to set my name in the greeting, so that the dashboard feels personally mine.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an inline input field that allows the user to enter a User_Name of 1 to 50 non-whitespace characters.
2. WHEN the user submits a User_Name that contains at least one non-whitespace character, THE Dashboard SHALL trim leading and trailing whitespace and save the trimmed value to Local_Storage.
3. WHEN the Dashboard loads and a User_Name exists in Local_Storage, THE Greeting_Widget SHALL retrieve and display the saved User_Name.
4. WHEN the user updates the User_Name with a valid non-empty value, THE Dashboard SHALL update Local_Storage with the trimmed new value and reflect the change in the Greeting_Widget within the same render cycle.
5. IF the user submits an empty or whitespace-only value in the User_Name field, THEN THE Dashboard SHALL remove the User_Name entry from Local_Storage and revert the Greeting_Widget to display only the time-based greeting without a name.

---

### Requirement 4: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with basic controls, so that I can work in focused intervals.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialize with a duration of 25 minutes (1500 seconds) each time the Dashboard loads or after a reset.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down at a rate of one second per real second.
3. WHEN the Focus_Timer is counting down and the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
4. WHEN the Focus_Timer is paused and the user activates the Start control, THE Focus_Timer SHALL resume the countdown from the retained remaining time.
5. WHEN the user activates the Reset control from either a running or paused state, THE Focus_Timer SHALL stop the countdown and reset the displayed time to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display an on-screen notification message that persists for at least 5 seconds to notify the user.
7. THE Focus_Timer SHALL display the remaining time in MM:SS format throughout all timer states (initial, running, paused, and completed).
8. WHEN the on-screen completion notification is displayed, THE Dashboard SHALL dismiss it automatically after 5 seconds or immediately upon any user interaction with the Dashboard.

---

### Requirement 5: Task Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks, so that I can track my work directly from the dashboard.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide an input field, limited to 500 characters, for the user to enter the text description of a new Task.
2. WHEN the user submits a new Task description, THE Task_Manager SHALL add the Task to the task list and save the updated list to Local_Storage.
3. WHEN the user marks a Task as done, THE Task_Manager SHALL update the Task's completion status to complete and apply a strikethrough text style as the visual completion indicator.
4. WHEN the user marks a completed Task as undone, THE Task_Manager SHALL update the Task's completion status to incomplete and remove the strikethrough text style.
5. THE Task_Manager SHALL provide an Edit control for each Task that allows the user to modify the Task's text description.
6. WHEN the user saves an edited Task description, THE Task_Manager SHALL update the Task in the task list and save the updated list to Local_Storage.
7. WHEN the user activates the Delete control for a Task, THE Task_Manager SHALL remove that Task from the task list and save the updated list to Local_Storage.
8. WHEN the Dashboard loads and tasks exist in Local_Storage, THE Task_Manager SHALL retrieve and display all saved tasks with their correct completion statuses.
9. IF the user submits an empty or whitespace-only Task description via the add input, THEN THE Task_Manager SHALL reject the input, display a visible error message, and not add a Task to the list.
10. IF the user saves an empty or whitespace-only text in the edit field, THEN THE Task_Manager SHALL reject the edit, display a visible error message, and retain the Task's previous description.
11. THE Task_Manager SHALL enforce a maximum of 500 characters for all Task text input fields (both add and edit).

---

### Requirement 6: Task Sorting

**User Story:** As a user, I want to sort my task list, so that I can prioritize and organize tasks to suit my workflow.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide a sort control that allows the user to sort tasks by the following options: All (creation order, oldest first), Active (incomplete tasks first, with ties broken by creation order), Completed (complete tasks first, with ties broken by creation order).
2. WHEN the user selects a sort option, THE Task_Manager SHALL reorder the displayed task list according to the selected option without modifying the stored order in Local_Storage.
3. WHEN a new Task is added or an existing Task is deleted while a sort option other than "All" is active, THE Task_Manager SHALL re-apply the current sort option to the updated task list.
4. WHEN the Dashboard loads, THE Task_Manager SHALL default the sort control to the "All" option regardless of the previously selected sort option.

---

### Requirement 7: Quick Links Management

**User Story:** As a user, I want to add and open quick-access links to my favorite websites, so that I can navigate to them with a single click.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide input fields for the user to enter a label (maximum 50 characters) and a URL (maximum 2048 characters) for a new Link.
2. WHEN the user submits a new Link and the total number of saved links is fewer than 50, THE Quick_Links SHALL add the Link to the links panel as a clickable button and save the updated links list to Local_Storage.
3. WHEN a Link button is clicked, THE Dashboard SHALL open the corresponding URL in a new browser tab.
4. WHEN the user activates the Delete control for a Link, THE Quick_Links SHALL remove that Link from the panel and save the updated links list to Local_Storage.
5. WHEN the Dashboard loads and links exist in Local_Storage, THE Quick_Links SHALL retrieve and display all saved links.
6. IF the user submits a Link with an empty label or an empty URL, THEN THE Quick_Links SHALL reject the input, display a visible error indication, and not add the Link.
7. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Quick_Links SHALL prepend "https://" to the URL before saving.

---

### Requirement 8: Light/Dark Mode Toggle

**User Story:** As a user, I want to switch between light and dark modes, so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Theme_Toggle control that switches between light mode and dark mode.
2. WHEN the user activates the Theme_Toggle, THE Dashboard SHALL apply the selected theme to the entire Dashboard immediately without a page reload.
3. WHEN the user activates the Theme_Toggle, THE Dashboard SHALL save the selected theme preference to Local_Storage.
4. WHEN the Dashboard loads and a theme preference exists in Local_Storage, THE Dashboard SHALL apply the saved theme before rendering the visible UI to prevent a flash of the wrong theme.
5. WHEN no theme preference exists in Local_Storage, THE Dashboard SHALL default to light mode.

---

### Requirement 9: Data Persistence

**User Story:** As a user, I want my tasks, links, name, and preferences to be saved automatically, so that my data is available every time I open the dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL save Task data, Link data, User_Name, and theme preference exclusively to Local_Storage with no external network requests.
2. WHEN Local_Storage is unavailable or a read/write operation fails, THE Dashboard SHALL catch the error, display the Dashboard with a default empty state, and continue to function without crashing.
3. THE Dashboard SHALL use distinct, documented Local_Storage keys for each data category: one key for tasks, one key for links, one key for User_Name, and one key for theme preference.
4. WHEN any task, link, User_Name, or theme preference is created, updated, or deleted, THE Dashboard SHALL immediately write the updated state to Local_Storage within the same event handler before returning control to the browser.

---

### Requirement 10: Performance and Compatibility

**User Story:** As a user, I want the dashboard to load quickly and work reliably in my browser, so that it is a seamless part of my daily workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no external frameworks, libraries, or backend servers, including no CDN-fetched scripts or stylesheets.
2. THE Dashboard SHALL consist of exactly one CSS file located in the `css/` directory and exactly one JavaScript file located in the `js/` directory.
3. THE Dashboard SHALL render correctly and all interactive controls SHALL be responsive in Chrome 110+, Firefox 110+, Edge 110+, and Safari 16+.
4. WHEN the Dashboard is opened via the file:// protocol with zero outbound network requests, THE Dashboard SHALL display all widgets with all click and input event handlers registered within 2 seconds of the page load event firing.
