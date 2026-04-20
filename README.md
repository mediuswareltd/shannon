# Shannon

<p align="center">
  <img src="assets/logo-1024x1024.png" alt="Shannon logo" width="200px" height="200px" />
</p>

Desktop **monitor board** for developer activity. Today it connects to **GitHub**; the UI is built to add more sources (e.g. ClickUp) later.

Built with **Electron**, **React**, **TypeScript**, and **electron-vite**.

## Requirements

- **Node.js** 18+ (recommended: current LTS)
- npm (or a compatible client)

## Setup

```bash
npm install
```

## Run (development)

```bash
npm run dev
```

## Build

```bash
npm run build
```

Output is under `out/`. Use `npm run preview` to try the packaged layout as supported by electron-vite.

## GitHub access

1. Open **Settings** in the app.
2. Create a [Personal Access Token](https://github.com/settings/tokens) (classic or fine-grained with the right repo/org access).
3. Recommended classic scopes: **`repo`**, **`read:org`** (org-wide activity and org listing).
4. Paste the token and connect. Tokens are stored under the app user data path, using the OS keychain when available.

## Features (overview)

- Multiple GitHub accounts (PAT per account)
- Personal and **organization** event timelines merged into one feed
- Repositories list, analytics-style counts, optional commit message hints for pushes (API-dependent)
- **Light / dark** theme (persisted locally)
- Configurable **Board** panels (what to show on the home screen)
- **Help** menu: app version from `package.json`, plus links derived from `homepage` / `repository` / `bugs` in `package.json` (edit those fields for your fork)

## Repository metadata

Update `homepage`, `repository.url`, and `bugs.url` in `package.json` so in-app **Help → Repository / Issues / License / Readme** point at your real GitHub project. License/readme links assume the default branch is **`main`**; adjust `src/main/appLinks.ts` if needed.

## License

Add a `LICENSE` file in the repository root when you publish this project.
