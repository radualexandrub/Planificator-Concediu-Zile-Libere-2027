# Planificator concediu - Zile libere 2027

A static Angular app that lists the legal public holidays in Romania for 2027 and shows them on a continuous year calendar. You can also plan your own company leave on top of it: pick single days or date ranges, track how many leave days you have left, and see the resulting working days for every month.

There is no backend and no server-side dependency. The build output is plain HTML, CSS and JS, so it runs on any static host such as GitHub Pages.

Built with Angular 20. Node version used: 24.

```bash
npm -v
# 11.19.0
node -v
# v24.20.0
```

<br/>

## Features

- **Legal holidays list**: all 17 legal free days of 2027 with date, weekday and name. Weekend rows are greyed out, and the summary sentence ("8 în weekend și 9 în timpul săptămânii") is computed from the data.
- **Personal leave planner**: choose a start date ("De la") and an end date ("Până la"), then press **Adaugă**.
  - Picking the start date fills the end date automatically, so a single day takes one pick.
  - For a range, every working day between the two dates is added as its own entry.
  - Weekends, legal holidays and days you already chose are skipped, so they never use up your leave.
  - Each added day can be removed individually.
- **Leave allowance counter**: set the total number of leave days per year (default 21). A sticky bar at the top shows how many are left, with a progress bar, and it updates with every day you add or remove. If a range has more working days than you have left, nothing is added and you are told why.
- **Two lists side by side**: once you add a leave day, a second list "Zilele mele de concediu" appears next to the legal holidays. On mobile the two lists are stacked.
- **Continuous year calendar**: one scrollable grid of Monday-to-Sunday weeks for the whole year, with no gaps in the day numbering when a month ends.
  - Weekends are hatched, legal holidays are filled and labelled, and your leave days use the same colour with the hue rotated by 60 degrees.
  - Months alternate between two slightly different backgrounds, and the first and last day of each month carry a small label.
  - Each month starts with a banner showing its number of working days (for example "21 din 31"), plus the number left after your leave.
  - The weekday header stays pinned while you scroll, and the month buttons scroll smoothly to their month.
- **Saved in your browser**: your leave days and allowance are stored in `localStorage`, so they survive a page refresh. Nothing is sent anywhere.
- **Fully static and responsive**: works on desktop and mobile, with no hosted services.

<br/>

## Running the app

Requires Node.js 24 (any version from 20.19 works). Install the dependencies once:

```bash
npm install
```

Run Development:

```bash
npm start
```

Build:

```bash
npm run build
```

The production build is written to `dist/zile-libere/browser`. It uses a relative base path (`<base href="./">`), so it can be served from the root of a domain or from a sub-path such as `https://<user>.github.io/<repo>/`.

<br/>

## Deploying to GitHub Pages

A workflow is included in `.github/workflows/deploy.yml`. It installs dependencies with Node 24, builds the app and publishes the output.

1. Push the project to a GitHub repository on the `main` branch. Commit `package-lock.json`, because the workflow uses `npm ci`.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` now redeploys the site.

<br/>

## Project structure

```text
src/
  index.html          Page shell and relative base href
  styles.css          Global colour variables (theme)
  app/
    holidays.ts       Year and list of legal holidays
    app.ts            State and logic (signals)
    app.html          Template
    app.css           Component styles
.github/workflows/
  deploy.yml          GitHub Pages deployment
```

<br/>

## Customising

- **Theme colour**: change `--hue-primary` in `src/styles.css`. The leave colour is derived from it as `--hue-user: calc(var(--hue-primary) - 120)`
- **Default allowance**: change `DEFAULT_ALLOWANCE` in `src/app/app.ts` (currently 21 days)
- **Holidays or year**: edit `YEAR` and the `HOLIDAYS` list in `src/app/holidays.ts`, and update the page title in `src/index.html`. The saved data is stored per year, so changing the year starts with a clean planner

<br/>

## License

Copyright (c) 2026 Radu-Alexandru Bulai

Released under MIT License