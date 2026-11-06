# Base dashboard

Front end for Base, our tool for running survey projects: the project list, project setup and fieldwork tracking, vendors, panels and their members, rewards, framework accounts and ratecards.

It's a static site. Plain HTML, CSS and JavaScript on top of Bootstrap 5.3 and Bootstrap Icons, with no build step and no backend yet. All the data you see is sample data generated in the browser from a fixed seed, so every reload shows the same numbers.

Live: https://helexdev1004.github.io/base-dashboard/

## Running it locally

Any static file server will do. From the project folder:

```
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk mostly works too, but a server is closer to how it's deployed.

Bootstrap, the icons, the flag icons and the Inter font come from CDNs, so you need to be online.

## Layout

```
index.html                  the app shell: sidebar, top bar, page containers, shared modal
assets/
  css/
    main.css                imports everything below in the right order
    base/                   theme tokens (8 themes) and the small-screen overrides
    layout/                 app frame, sidebar, top bar
    components/             buttons, modals, pagination, selects, toasts...
    pages/                  one file per page, project/ and panel-management/ have their own folders
  js/
    core/utils.js           DOM helpers, seeded random numbers, formatting
    data/                   countries, clients, PMs and the sample project list
    components/             toast, pagination, form modal, multi-select, combo box, file upload
    layout/                 theme picker and sidebar
    app/router.js           hash routes, which page renders where, unsaved-changes guard
    app/main.js             start-up, loads last
    pages/                  one file per page
      projects/             project list: KPI cards, progress chart, table
      project/              a single project and its tabs (Main, Vendors, Exclusions, Campaigns...)
      panel-management/     panels, members, panelists, rewards, redeem, translations, survey points
      framework/            FW accounts, active/closed projects, ratecards, feasibilities
  images/                   logos and favicon
docs/design/                screenshots of the dashboard
```

## Things worth knowing

- The scripts are plain `<script>` tags that share globals, so the order in `index.html` matters. Shared stuff first, then pages, then `app/main.js`. If something needs a function at load time (lookup tables like `RENDERERS` or `PAGE_RENDERERS`), the file that defines it has to come earlier.
- Routing is hash based (`#/project/8650/vendors`, `#/panels/gavenze` and so on). Every page registers its render function in `PAGE_RENDERERS` in `app/router.js`.
- Themes are CSS variables keyed on `html[data-theme]`. The inline script in `index.html` applies the saved theme before first paint so there's no flash. To add a theme, add its block to `base/themes.css` and an entry to `THEMES` in `layout/themes.js`.
- The theme, the collapsed sidebar and the saved feasibility templates are kept in localStorage. Everything else resets on reload.
- Menu items without a page yet (Clients, Profiling, External surveys) open a shared "Coming soon" page.
