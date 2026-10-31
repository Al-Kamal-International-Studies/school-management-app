# Prospect briefing: how the Al Kamal school app is built

A cheat-sheet for answering a prospective client's questions about the app. No passwords or keys are in this file; the demo logins are handed out separately.

## The one-paragraph answer

It's a **web app** (works in any browser and installs to a phone's home screen like an app) built with **Next.js** and **React**, hosted on **Vercel**. All data lives in **Supabase**, a managed **PostgreSQL** database that also handles sign-in, file storage and live updates. There are no servers to maintain: Vercel runs the website and its server code, and Supabase runs the database. It's bilingual (English and Arabic, right-to-left), and every table is protected at the database level, so each user can only ever read what their role allows.

## The pieces

| Layer | What it uses | What it does |
|---|---|---|
| Front end (what users see) | **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS**, Framer Motion animations | Pages, dashboards, forms, animations. English and Arabic with full right-to-left layout. |
| Server code ("back end") | The same Next.js app: **Server Components**, **Server Actions** and two API routes, running as **serverless functions on Vercel** | Checks who you are, enforces the rules, talks to the database. No separate API server. |
| Database | **Supabase PostgreSQL**: 47 tables, 48 versioned migrations | Students, classes, timetable, attendance, grades, exams, assignments, chats, admissions, and more. |
| Security in the database | **Row Level Security** on every table | The database itself refuses to return rows a user isn't allowed to see, even if the screen code had a bug. |
| Sign-in | **Supabase Auth**, email + password; **passkeys** (Face ID / fingerprint, WebAuthn); **2-factor (TOTP)** required for admins | Also: max 3 devices per account, lockout after 3 wrong passwords, password-reset requests reviewed by admin. |
| Files | **Supabase Storage** | Profile photos, documents (report cards, policies), admission attachments. Private files are only reachable through 60-second signed links. |
| Live chat | **Supabase Realtime** (WebSockets) | WhatsApp-style messaging; a group per class subject; read receipts. |
| Notifications | **Web Push** (VAPID standard, built into browsers) plus an in-app bell | No third-party push service or account. |
| Emails | **Resend** (only for admission forms) | Optional, switched on by an API key. |
| PDFs | **pdf-lib** and **MuPDF** | Student ID cards and admission forms generated inside the app. |
| Message safety filter | A small machine-learning model **trained in Python** and **run inside the app in TypeScript** | Screens chat messages for unsafe content and alerts admins. No outside AI service, so nothing typed leaves the app. |
| Help chatbot | Rule-based, bilingual | Answers "how do I…" questions. No outside AI service. |

## "How many servers is it connected to?"

Two cloud platforms, both managed:

1. **Vercel** serves the website from its global edge network and runs the server code (region: Seoul, `icn1`). It scales automatically; nothing to patch or restart.
2. **Supabase** is one managed PostgreSQL database plus its Auth, Storage and Realtime services (region: Seoul).

Plus the domain: **alkamal.app**, registered at Namecheap and pointed at Vercel (HTTPS is automatic). Resend for admission emails is the only other outside service.

How a request flows: **browser → Vercel (Next.js page or Server Action) → Supabase (database / auth / storage) → back to the browser**. Live chat messages travel over a direct, permission-checked WebSocket between the browser and Supabase Realtime.

## What each role can do

- **Admin:** users, classes and subjects; timetable builder (prevents clashes automatically); announcements and events; documents; digital admission forms with PDF; ID cards; leave requests; monthly progress reports; feedback inbox; message-safety review; audit log; password-reset requests.
- **Teacher:** attendance, grades, exams and quizzes, assignments (with submissions), remarks and behaviour log, monthly progress reports, timetable and timetable builder, students' ID cards, chat with their students and those students' parents.
- **Student:** timetable, attendance, grades, exams, assignments, leave requests, digital ID card, chat with their teachers.
- **Parent:** one dashboard per child (multi-child switcher), grades, attendance, leave requests, ID card, chat with the child's teachers.
- **Everyone:** calendar, documents, messages, help chatbot, profile and settings (language, theme), feedback, installable app.

## Likely questions

- **Is it a mobile app?** It's a web app that installs to the home screen (PWA) and sends push notifications. No App Store or Play Store needed.
- **Is the data safe?** Database-level access rules on every table; HTTPS everywhere; passkeys and 2FA; device limits; account lockout; strict browser security headers (CSP); rate limiting; an audit log of admin actions.
- **Can it scale?** Vercel and Supabase both scale on demand. The app currently runs on their free tiers. For a paying client you'd move to the paid plans (Vercel Pro and Supabase Pro, roughly US$20 and US$25 a month at the time of writing; check current pricing). Vercel's free plan is for non-commercial use only.
- **Can it serve more than one school?** The database already scopes data per school ("center"). The demo you're using runs as its own walled-off school inside the same system.
- **Who owns the data?** It sits in the school's own Supabase project and can be exported as a standard PostgreSQL database at any time.

## About the demo the prospect is using

- They get a **teacher**, a **student** and a **parent** login in a made-up school ("Grade 6 A" and "Grade 3 B", with fake staff, students, grades, attendance and chats). There is deliberately no admin login: admin screens show the real school.
- The demo school is walled off **in the database itself** (migration `0048_demo_center.sql`), so the demo logins can't read or change any real data, even with technical tools.
- If a login gets locked (3 wrong passwords) or hits the 3-device limit, run `node scripts/demo-school.mjs --reset`. To remove the demo completely: `node scripts/demo-school.mjs --delete`.
