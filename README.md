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

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. To create a production build, run `npm run build`.

The upload-validation tests use Node's built-in TypeScript stripping and require Node 22.6 or later:

```powershell
npm test
```
