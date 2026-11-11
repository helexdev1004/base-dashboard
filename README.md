# Base dashboard

Front end for Base, our tool for running survey projects: the project list, project setup and fieldwork tracking, vendors, panels and their members, rewards, framework accounts and ratecards.

It's a static site: one HTML file per page, styled with CSS on top of Bootstrap 5.3 and Bootstrap Icons. The markup of every page is written out in its HTML file; a few small scripts only switch what's visible (tabs, menus, toggles) and show confirmation toasts. There's no build step and no backend yet, so nothing is saved, searched or sorted for real.

Live: https://helexdev1004.github.io/base-dashboard/

## Running it locally

Open `index.html` in a browser, or serve the folder (closer to how it's deployed):

```
python -m http.server 8000
```

Then open http://localhost:8000. Bootstrap, the icons, the flag icons and the Inter font come from CDNs, so you need to be online.

## What is here

```
index.html                  Projects (the project list)
project.html                a project, with all its tabs (project.html#vendors opens a tab)
project-new.html            New project
feasibility.html            MF+A Feasibility
exports.html                Exports
vendors.html                Vendors list         vendor.html, vendor-new.html
vendor-groups.html          Vendor groups
blacklist.html              Blacklisted RESPIDs
screener-library.html       Screener Library     screener-question.html, screener-question-new.html
first-surveys.html          First surveys
panels.html                 Panels               panel.html, panelist.html
rewards.html  redeem.html  translations.html  survey-points.html
profiling.html              Profiling: panel > country > surveys, and the question bank (#questions)
profiling-survey.html       a profiling survey: its questions, the bank, preview, publish (#settings)
recruiters.html             Recruiters           recruiter.html, recruiter-new.html
fw-accounts.html            FW - Accounts        fw-account.html, fw-account-new.html
fw-projects.html            FW - Active/Closed   fw-project.html (#targets for the Targets tab)
fw-ratecards.html           FW - Ratecard        fw-ratecard.html, fw-ratecard-new.html
fw-feasibilities.html       FW - Feasibilities
statistics.html             Statistics           user-statistics.html, my-statistics.html
users.html                  Users                user.html, user-new.html
clients.html  external-surveys.html                    "Coming soon" pages

assets/
  css/
    main.css                imports everything below in the right order
    base/                   theme tokens (8 themes) and the small-screen overrides
    layout/                 app frame, sidebar, top bar
    components/             buttons, modals, pagination, selects, toasts...
    pages/                  one file per page, project/ and panel-management/ have their own folders
  js/
    layout.js               every page: theme picker and sidebar (collapse, mobile drawer, menu groups)
    ui.js                   every page: tabs, toggles, menus, folding rows, two-step delete, toasts
    projects.js             index.html: KPI count-up, Progress chart tooltip, My projects, More filters
    project-chart.js        project.html: the Progress over time chart, redrawn to fit its width
  images/                   logos and favicon
docs/design/                screenshots of the dashboard
```

## Things worth knowing

- Every page repeats the same sidebar and top bar. When you add or rename a menu item, change it in every HTML file. The current page's link has `active` and `aria-current="page"`, and its menu group is open.
- Detail pages show one sample record each: every project row opens `project.html`, every vendor opens `vendor.html`, and so on.
- Profiling: every profiling survey has its own survey number (#4108), which respondents see once it's live. Questions live in a bank per panel and country with their own ID (Q45), and each answer has one too (Q45_1, Q45_2…). A survey combines questions from the bank; a question can be in several surveys and keeps its IDs. The sample is Gavenze · Netherlands.
- Modals, dropdowns and the More filters panel are plain Bootstrap markup in the page, opened with `data-bs-toggle`.
- `ui.js` reads a few `data-*` hooks in the markup:
  - `data-variant-of` / `data-variant`: blocks that replace each other in place (Live/Closed lists, Chart/Table, Hourly/Daily, a profiling survey's Draft/Live/Closed). The buttons that swap them have `data-variant-target="group:key"`; a form with it swaps them when it's submitted (Publish to live).
  - `data-hash`: a tab or button the address can open, e.g. `project.html#campaigns`.
  - `data-toast`, `data-toast-tone`: the message shown when the button is clicked or the form is saved.
  - `data-confirm`: a delete button that asks once, with `data-confirm-remove` (what to remove) or `data-confirm-href` (where to go).
  - `data-add-row` / `data-remove-row`: buttons that add a blank copy of the last row, or remove their own row. A `data-seq` label in the copy counts up by one (answer Q45_5 → Q45_6).
  - `data-move="up|down"`: moves its `[data-move-item]` past the next one; `[data-order]` numbers follow.
  - `data-href` on a table row: the whole row is a link.
  - `data-spin`, `data-shows`, `data-answers`: a refresh spin, a checkbox that shows a field, a question type that hides the answers.
- Themes are CSS variables keyed on `html[data-theme]`. The inline script in each page's `<head>` applies the saved theme before first paint so there's no flash. To add a theme, add its block to `base/themes.css`, its mode to that inline script, and its tile to the theme menu in every page.
- The theme and the collapsed sidebar are kept in localStorage.
