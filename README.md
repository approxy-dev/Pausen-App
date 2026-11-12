# Pausen — Android App & APK

![Pausen — Make room for rest](assets/brand/social-preview.png)

**Download Pausen APK: A quiet, privacy-first Android app for bedtime plans, scroll pauses, and warm reading.**

[Download Pausen APK v1.10.2](https://github.com/approxy-dev/Pausen-App/releases/download/v1.10.2/Pausen-1.10.2.apk) · [Release notes](https://github.com/approxy-dev/Pausen-App/releases/tag/v1.10.2) · [Verify the download](downloads/SHA256SUMS.txt) · [Privacy & permissions](privacy.html)

Pausen runs on Android 10 and newer. Its plans and history stay on your phone; the app has no internet permission, ads, analytics, or account requirement.

- **Bedtime plans:** a warm wind-down, a scheduled curfew, and a morning unlock.
- **Scroll pauses:** breathing breaks and a 24-hour commitment to help interrupt long scrolling sessions.
- **Clear boundaries:** protection settings and permission explanations before you commit.

Developed by [Approxy-dev](https://github.com/approxy-dev).

## About this repository

The standalone showcase for Pausen v1.10.2 (Android code 8). Plain HTML, CSS, and JavaScript; no runtime packages or installation step. Everything needed for the website is inside this folder. The Android source, signing keys, credentials, App Bundle, and obfuscation maps are excluded.

## Run locally

From this folder, with Node.js 20 or newer:

```powershell
npm run dev
```

Open **http://127.0.0.1:4173**. Source changes appear on refresh. Stop with Ctrl+C. Set `PORT` to use another port.

```powershell
npm run check
npm run build
```

The build writes only public assets to `dist/`. The development server serves current source files and applies the same metadata/contact configuration. It binds to localhost and does not expose the Android project.

## What works

- Every download button serves the actual signed `downloads/Pausen-1.10.2.apk` (3,681,980 bytes).
- The phone switches between Bedtime and Scroll Pause. Its daily example countdown uses the visitor's local time: wind-down at 22:30, curfew at 23:00, and wake at 06:30. It is a website demonstration, not a live connection to an installed app.
- The three bedtime timeline points explain each stage.
- Breathing is opt-in and follows 4 seconds in, 2 hold, 6 out. Stop at any time. It stops when the page is hidden. Reduced-motion users get static circles and changing text.
- Mobile navigation supports Escape; phone tabs support arrow keys, Home, and End. Installation help uses native disclosures.
- The contact form validates input and opens an email draft addressed to `approxydev@gmail.com`. It never claims the message was sent. The entered text remains on the page if an email handler is unavailable. Nothing is stored in browser storage.

## GitHub and Vercel

This repository is [approxy-dev/Pausen-App](https://github.com/approxy-dev/Pausen-App). It contains the showcase website and signed APK. To work from a fresh checkout:

```powershell
git clone https://github.com/approxy-dev/Pausen-App.git
cd Pausen-App
npm run dev
```

In Vercel, import that repository using Framework Preset **Other**, Root Directory **./**, Build Command **node scripts/build.mjs**, and Output Directory **dist**. The tracked `vercel.json` sets the build/output settings, APK download headers, and browser security headers. No serverless function or paid service is needed for the website.

The small build step generates absolute metadata and sitemap URLs. It uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL` (or `VERCEL_URL` fallback). For a custom domain, set the public environment variable `SITE_URL` or configure it locally:

```powershell
npm run configure -- --url https://your-actual-domain.example
npm run build
```

That command's hostname is an example: use the real domain after it exists. With no public URL configured, local output is intentionally `noindex` and the sitemap contains no invented domain. Vercel preview deployments are also `noindex`; production builds with a resolved hostname are indexable. Canonical URLs, Open Graph URLs, Twitter image URLs, `sitemap.xml`, and `robots.txt` are generated together.

See Vercel's [build configuration](https://vercel.com/docs/builds/configure-a-build) and [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

## Optional Formgrid or Formspree

No form account or endpoint was supplied. Email drafts are the fully working default. Once you create an endpoint that forwards to your address, configure its public HTTPS URL:

```powershell
npm run configure -- --form https://your-real-form-endpoint.example/path
npm run build
```

Alternatively, use Vercel's `FORM_ENDPOINT` environment variable. The endpoint is public, not a secret. The build switches to a native HTML POST, changes the button to **Send message**, and updates the privacy notice. The form includes a honeypot. Provider-side success/error screens and spam filtering belong to the form provider; test a real submission yourself after configuring the account. No provider submission was sent during development.

Clear `formEndpoint` in `site.config.json` to return to email drafts, then rebuild. Never put private API keys or email credentials in this static site.

## Release integrity

APK SHA-256:

```text
05d24758639b4f58b31db3fafffef73840f8e5d8c7408d07618b8c3e3a5cf038
```

Signer: `CN=Approxy-dev`. Certificate SHA-256:

```text
66278ee90a47a6986d87ad3ea08f1cf3360dbbf437289e806711243428d0360b
```

Verified with Android build-tools 36.0.0 `apksigner`. The integrity check also verifies all local links/anchors, metadata generation, form modes, and the initial transfer budget. It does not substitute for installing on physical devices.

## Content decisions

- The supplied brief and the current Accessibility/Device Admin source include Settings and uninstall guards. An older `docs/release/privacy.html` says the opposite. This website's permission notice describes the current source; native app source and the older document were not changed.
- The public website repository is linked. The Android application's source is not included here; the “open source” marketing claim is omitted until a public app source repository and license are confirmed.
- Play Protect is kept enabled. The guide explains scans and conditional “Install anyway” wording without promising that every Android warning offers a bypass. Restricted-settings and Play Protect help link Google's [official settings guide](https://support.google.com/android/answer/12623953) and [Play Protect guidance](https://support.google.com/googleplay/answer/2812853).
- The bundled font is a Latin subset of Familjen Grotesk, served locally. Its SIL Open Font License is in `assets/fonts/OFL.txt`. Body text uses system fonts.
- The initial compressed transfer is approximately 25 KiB, including HTML, CSS, JavaScript, the font, and the logo. The APK is downloaded only on request; the metadata image is for social crawlers. Raw source is larger than 45 KiB. No third-party resources are fetched on page load.

## Verification evidence

The website was checked in Chromium at desktop, 393px, and 320px widths, including menu and tab keyboard controls, breathing phases, reduced motion, form validation, and operation with JavaScript disabled. The mobile Lighthouse snapshot audit reported 100 for accessibility, best practices, and SEO. APK signature and checksum verification passed.

Local screenshots and browser audit output are retained outside the published source in `evidence/`. Run `npm run check` to repeat the portable integrity and configuration checks. Physical Android installation and overnight protection were not tested as part of the website work. The local build does not deploy the website to Vercel.
