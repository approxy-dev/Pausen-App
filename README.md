# Pausen — Android Bedtime App & Scroll Pause App (APK)

![Pausen — Make room for rest](assets/brand/social-preview-wide.png)

[![Release](https://img.shields.io/badge/Release-v1.10.2-amber.svg)](https://github.com/approxy-dev/Pausen-App/releases/tag/v1.10.2)
[![Platform](https://img.shields.io/badge/Platform-Android%2010%2B-brightgreen.svg)](https://github.com/approxy-dev/Pausen-App)
[![APK Size](https://img.shields.io/badge/APK-3.7%20MB-blue.svg)](https://github.com/approxy-dev/Pausen-App/releases/download/v1.10.2/Pausen-1.10.2.apk)
[![Trackers](https://img.shields.io/badge/Trackers-0-success.svg)](privacy.html)
[![Internet Permission](https://img.shields.io/badge/Internet%20Permission-None-success.svg)](privacy.html)

**Download Pausen APK (v1.10.2): A quiet, privacy-first Android bedtime app and scroll pause app (formerly SleepGuardian APK).**

[Download Pausen APK v1.10.2](https://github.com/approxy-dev/Pausen-App/releases/download/v1.10.2/Pausen-1.10.2.apk) · [Release notes](https://github.com/approxy-dev/Pausen-App/releases/tag/v1.10.2) · [Verify the download](downloads/SHA256SUMS.txt) · [Privacy & permissions](privacy.html)

Pausen (formerly developed as SleepGuardian Mobile) runs on Android 10 and newer. Its plans and history stay on your phone; the app has no internet permission, ads, analytics, or account requirement.

### Why choose Pausen APK?
- 🌙 **Quiet Bedtime App:** scheduled evening wind-downs, warm screen tints, and strict bedtime curfews.
- 🧘 **Intentional Scroll Pause App:** 12-second box-breathing pauses and a 24-hour commitment lock to interrupt endless feeds in Instagram, TikTok, and YouTube.
- 🔒 **100% On-Device Security:** no internet permissions declared, zero analytics, zero ads, and all data stored strictly in a local SQLite database on your device.
- 🛡️ **Verifiable Integrity:** signed APK with SHA-256 checksums provided for every release.

Developed by [Approxy-dev](https://github.com/approxy-dev).

## Pausen APK Specifications

| Specification | Value |
|---|---|
| **App Name** | Pausen |
| **Package Format** | Signed APK (Android Package) |
| **Former Name** | SleepGuardian APK (SleepGuardian Android) |
| **Latest Release** | v1.10.2 (Build Code 8) |
| **File Size** | 3.7 MB (3,681,980 bytes) |
| **Supported OS** | Android 10.0+ (API 29, 30, 31, 32, 33, 34, 35+) |
| **Internet Access** | None (`INTERNET` permission omitted) |
| **Trackers / Ads** | Zero (100% Offline) |
| **SHA-256 Checksum** | `05d24758639b4f58b31db3fafffef73840f8e5d8c7408d07618b8c3e3a5cf038` |
| **Certificate Fingerprint** | `66278ee90a47a6986d87ad3ea08f1cf3360dbbf437289e806711243428d0360b` |

## About this repository

The standalone showcase for Pausen v1.10.2 (Android code 8) uses plain HTML, CSS, and JavaScript. The optional private feedback endpoint uses PostgreSQL. The Android source, signing keys, credentials, App Bundle, and obfuscation maps are excluded.

## Run locally

From this folder, with Node.js 20 or newer:

```powershell
npm ci
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
- The contact form opens an email draft by default. With private feedback enabled, it confirms delivery after the database accepts the message. It preserves the entered text on errors. Both modes work without browser storage.

## GitHub and Vercel

This repository is [approxy-dev/Pausen-App](https://github.com/approxy-dev/Pausen-App). It contains the showcase website and signed APK. To work from a fresh checkout:

```powershell
git clone https://github.com/approxy-dev/Pausen-App.git
cd Pausen-App
npm ci
npm run dev
```

In Vercel, import that repository using Framework Preset **Other**, Root Directory **./**, Build Command **node scripts/build.mjs**, and Output Directory **dist**. The tracked `vercel.json` sets the build/output settings, feedback function timeout, APK download headers, and browser security headers.

The small build step generates absolute metadata and sitemap URLs. It uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL` (or `VERCEL_URL` fallback). For a custom domain, set the public environment variable `SITE_URL` or configure it locally:

```powershell
npm run configure -- --url https://your-actual-domain.example
npm run build
```

That command's hostname is an example: use the real domain after it exists. With no public URL configured, local output is intentionally `noindex` and the sitemap contains no invented domain. Vercel preview deployments are also `noindex`; production builds with a resolved hostname are indexable. Canonical URLs, Open Graph URLs, Twitter image URLs, `sitemap.xml`, and `robots.txt` are generated together.

See Vercel's [build configuration](https://vercel.com/docs/builds/configure-a-build) and [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

## Search appearance

The homepage identifies Pausen, Approxy-dev, and the Android package `com.sleepguardian.app` in visible content and linked `WebSite`, `WebPage`, and `SoftwareApplication` metadata. Structured URLs follow the configured canonical origin. No unverified star ratings are published.

Both pages declare the existing 96×96 PNG favicon and root ICO at stable URLs. The preview serves these files with their image MIME types, and the build fails if required public assets cannot be copied. `npm run check` verifies icon dimensions, metadata relationships, and visible FAQ consistency.

The crawl-report fixes keep titles under 60 characters and descriptions under 155, give logo images descriptive alternatives and titles, and use a 1717×916 social preview for both Open Graph and X. `/index.html` permanently redirects to `/`; internal links use the canonical homepage. Multiple H2 headings are intentional sections beneath each page's single H1, not an SEO error.

After a production deployment, use Search Console's URL Inspection on `https://pausenapk.vercel.app/` to test the live URL and request indexing. Check that `https://pausenapk.vercel.app/sitemap.xml` is submitted. Google must recrawl before its cached favicon, site name, and snippets can change; this can take days or weeks. See Google's [favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search) and [site name guidance](https://developers.google.com/search/docs/appearance/site-names).

AI Overviews choose their own sources and wording. Clear, crawlable app information supports eligibility, but inclusion is not guaranteed. `llms.txt` is supplementary documentation; Google requires no special AI file or schema. See [Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features).

## Private website feedback

The Pausen website can send feedback through a Vercel function to the Supabase project `toufdniikzwrycrpfuoo`. Visitors submit a name, email address and message. Read and delete messages from the owner account in the Supabase Table Editor by choosing the `pausen_private` schema and `feedback` table. Keep dashboard membership limited to the intended owner and enable MFA. Leave the schema outside the Data API’s exposed schemas.

1. In the Pausen project's SQL Editor, apply `supabase/migrations/202611140001_private_feedback.sql` once. This creates new roles and tables in one transaction. The writer gets permission to call only the submission function. The tables have row level security enabled.
2. In the database dashboard, set a long password-manager-generated password on `pausen_feedback_writer` and enable LOGIN for that role. With `psql`, use `\password pausen_feedback_writer` and then `ALTER ROLE pausen_feedback_writer LOGIN`. Keep the project administrator password in your password manager.
3. In Supabase **Connect → Transaction pooler**, copy the hostname for this project. In the Pausen Vercel project’s **Production** environment, save `FEEDBACK_DATABASE_URL` as a secret using `postgresql://pausen_feedback_writer.toufdniikzwrycrpfuoo:<encoded-writer-password>@<project-pooler-host>:6543/postgres`. Percent-encode the password. The driver verifies TLS certificates. If a custom root is required, put the official Supabase PEM certificate in `FEEDBACK_DATABASE_CA`.
4. Save a separate random 32-byte value as the Production secret `FEEDBACK_RATE_LIMIT_SECRET`, encoded as 64 hex characters. Set `FEEDBACK_ENABLED=true`, clear any external `FORM_ENDPOINT`, then deploy. The build validates the configuration and publishes only the public form URL. Preview builds use email drafts.
5. Submit one synthetic message from the live website, confirm it appears in the private Table Editor, then delete the test message. Review and remove old support messages through the owner account. To switch back to email, set `FEEDBACK_ENABLED=false` and redeploy.

PostgreSQL enforces the limits across simultaneous Vercel instances. A visitor gets five submissions per hour and the site shares a budget of 500 per day. Keyed IP identifiers rotate daily and old counters are cleared on later submissions. The database stores message content only in the feedback table. The API returns a confirmation without exposing a message list or record contents. `npm run test:feedback` verifies the endpoint and database grants in an isolated PostgreSQL engine using synthetic data.

See the [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) and [role permissions](https://supabase.com/docs/guides/database/postgres/roles).

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
- The initial compressed transfer is approximately 28 KiB, including HTML, CSS, JavaScript, the font, and the logo. The APK is downloaded only on request; the metadata image is for social crawlers. Raw source is larger than 45 KiB. No third-party resources are fetched on page load.

## Verification evidence

The website was checked in Chromium at desktop, 393px, and 320px widths, including menu and tab keyboard controls, breathing phases, reduced motion, form validation, and operation with JavaScript disabled. The mobile Lighthouse snapshot audit reported 100 for accessibility, best practices, and SEO. APK signature and checksum verification passed.

Local screenshots and browser audit output are retained outside the published source in `evidence/`. Run `npm run check` to repeat the portable integrity and configuration checks. Physical Android installation and overnight protection were not tested as part of the website work. The local build does not deploy the website to Vercel.
