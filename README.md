# KM Transport Member and Vehicle Records

A web application for tracking KM Transport members, their vehicle records, renewal dates, and payments.

## Records tracked

- **Members:** name, ID number, and other IDs for authorized drivers.
- **Vehicles:** plate number, engine number, chassis number, MV file number, and case number.
- **Renewals:** PAMI renewal date and LTO registration renewal date.
- **Payments:** membership fee, franchise processing fee, monthly dues, GPS dues, and other payments for IDs, uniforms, corporate jackets, and T-shirts.
- **Payment entries:** amount, payment date, status, and notes.
- **Member documents:** PDF, JPEG, PNG, GIF, or WebP uploads (up to 8 MB), with search, preview, download, and delete controls on each member profile.

## Technology and database

The app is built with Next.js, React, and TypeScript. Keep using TypeScript/JavaScript for this project; switching the app to Python would require replacing its existing web stack and is not needed to use a database.

PostgreSQL is the recommended database because member, vehicle, renewal, and payment records are related data that benefit from relational tables and constraints. The app supports Neon Serverless PostgreSQL through `DATABASE_URL`. Without that variable, it stores records locally in `data/local-db.json` for development.

To connect Neon, create a PostgreSQL database and set its connection string in an untracked `.env.local` file:

```env
DATABASE_URL="postgresql://..."
```

The app creates/updates its tables when the database is first used. Do not commit the connection string. Local JSON records are not automatically copied to Neon; export or migrate them before switching a live installation to cloud storage.

Without `DATABASE_URL`, all records and uploaded document contents are stored locally in `data/local-db.json`. This file survives development-server restarts on the same computer and is ignored by Git because it can contain personal IDs and vehicle documents. Local uploads are not remotely accessible or backed up; use properly configured hosting and shared object storage before multiple computers need access.

## Authentication and access roles

The app has no public registration. Its one-time first-admin page is public only while the database contains no users; afterward setup permanently closes. It uses server-validated, database-backed sessions; passwords are stored as salted scrypt hashes and session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.

`DATABASE_URL` is the required server environment variable:

- Use the pooled connection string copied from Neon, preserving its SSL query parameters. The optional `NEXT_PUBLIC_APP_URL` entry in `.env.example` is unused.

The first administrator is created on the web at `/setup`. This intentionally has no bootstrap token because this simpler first-run flow was requested. **There is a real claim risk before the first account exists:** anyone who can reach the public site during that window could create the first administrator. Upload the source and configure `DATABASE_URL`, but keep the SnapDeploy service stopped until you are ready to do setup. When ready, start it and open `/setup` immediately, create the `admin` username and choose a strong, unique password, then sign in at `/login`. Do not rely on an obscure URL as protection.

Setup is one-time and race-safe for Neon: the app atomically claims its single bootstrap row only while there are no users, and only the winning request can insert the first Administrator. Once created, `/setup` reports completion and no further accounts can be created there. Normal account creation is Administrator-only.

The first request initializes the additive `app_users`, `app_sessions`, and `app_auth_settings` tables alongside the existing app tables; the Neon role must be allowed to create tables. Existing member, vehicle, payment, and document records are not deleted or imported by this change. Local JSON data is not automatically copied to Neon.

Administrators can create accounts, assign roles, set a new password for any account, and deactivate access at `/users`. Existing passwords are never displayed; new passwords must be 12–128 characters, and resetting one revokes that user's sessions. Share the replacement password through a separate secure channel. Editors can view and manage records. Viewers have read-only access. At least one active administrator must always remain. Sessions expire after seven days; password resets and account deactivation revoke the affected user's sessions.

When multiple computers use the same Neon database, the dashboard, member, payment, and member-document views check for updates about every 30 seconds and refresh when the browser tab regains focus. This is lightweight polling, not an instant push notification. Uploaded document files remain local for now and are not shared across computers until shared file storage is configured.

Do not enter real member IDs or documents in an unauthenticated deployment. Deploy these authentication changes and complete the first-admin setup before using real records. Production use should be over HTTPS with `DATABASE_URL` configured; the local JSON fallback is not durable on most serverless hosts.

## Run locally

```powershell
npm install
npm run dev
```

Set `DATABASE_URL` in `.env.local` before starting the server. Open `http://localhost:3000/setup`, create the `admin` account with a new password of at least 12 characters, then sign in at `http://localhost:3000/login`. To create a production build, run `npm run build`.

The upload-validation and authentication security tests use Node's built-in TypeScript stripping and require Node 22.6 or later:

```powershell
npm test
```
