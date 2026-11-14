# CyberHub · Career & Lab Command Center

A responsive, offline-ready personal dashboard for cybersecurity practice. Plain HTML, CSS and JavaScript; no build step, backend, external fonts or CDN dependencies.

## Features

- Ten starter platforms: TryHackMe, Hack The Box, LetsDefend, OverTheWire, HackerOne, Bugcrowd, LinkedIn, GitHub, Credly and Medium.
- Add, edit, search and filter platforms. Save profile URLs, usernames, ranks, notes and status.
- Editable CCNA, Security+, eJPT and OSCP roadmaps with module checklists, exam dates and progress. These are personal study outlines, not official exam objectives.
- Date-based task logs with priorities, completion tracking and study streaks. A streak counts consecutive calendar days with at least one completed task and can continue from yesterday.
- Local browser storage, validated JSON export/import, and manual cross-device GitHub Gist upload/download.
- Optional device-local PIN screen using salted SHA-256. This hides the UI; it does not encrypt localStorage or provide server authentication.
- Installable PWA and offline application shell after the initial successful online visit.

## GitHub Pages

1. Upload all files in this folder directly to the `main` branch root of `Sharu-Sk-HexSec/cyberhub`.
2. In repository **Settings → Pages**, select **Deploy from a branch**.
3. Choose **main** and **/ (root)**, then **Save**.
4. Wait for the Pages deployment to finish. The expected address is https://sharu-sk-hexsec.github.io/cyberhub/ . This address is usable only after deployment succeeds.

No build command is needed. Relative paths support the `/cyberhub/` project path. A separate purchased domain is optional; no `CNAME` file is needed for the free GitHub Pages address.

## Other static hosts

For Cloudflare Pages or Vercel, import the repository as a plain static site, leave the build command empty, and publish the repository root.

## Using the app

Open the deployed HTTPS URL. Data belongs to that browser and origin. Export a JSON backup before clearing browser data, changing domain, or replacing data from another device. Private/incognito sessions may discard storage.

To sync, create a GitHub token with Gist permission yourself, then enter it under **Sync & Backup**. First upload creates an unlisted Gist; copy the Gist ID to your other device and download there. The app retains only the Gist ID in browser storage. The token is held in the current page's memory and cleared when you lock or close the page. Unlisted Gists are not encrypted; anyone with the link can read them. Do not store secrets in your workspace. Upload/download replaces data and is not an automatic merge. Export/import is available without a token.

Install using the browser's install button, or **Add to Home Screen** on mobile. Revisit online after a code update to refresh the app shell. Offline mode supports local features; opening external platforms and Gist sync require internet access.

If you forget a PIN, it cannot be recovered. Clear this site's browser data to reset the workspace, then restore an exported JSON backup. Clearing site data also removes unsaved local progress.
