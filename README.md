# MAHALAXMI POWER TOOLS Inventory

Modern single-owner inventory management app built with Next.js 16, TypeScript, browser IndexedDB for fast local-first inventory writes, optional Postgres snapshot backups through Prisma, Tailwind CSS, shadcn-style components, TanStack Table, Recharts, CSV import/export, and optional AI image extraction.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to a Postgres database for backup snapshots, and replace the placeholder values for `APP_PIN`, `SESSION_SECRET`, and optional OpenAI variables.
3. Install dependencies:

```bash
npm install
```

4. Create the Postgres tables used for bootstrap and backup snapshots:

```bash
npm run prisma:migrate
```

5. Start the app:

```bash
npm run dev
```

The app is PIN-protected and has no user registration, roles, or multi-user authentication.

## Storage model

- IndexedDB in the browser is the primary app database for products, sales, rentals, inventory logs, and display settings.
- Postgres is used for optional cloud snapshots and one-time bootstrap from existing server data.
- If Postgres is unavailable, the app remains usable; only cloud backup/restore is affected.
- Use Settings -> Backup and Restore to sync now, export a JSON backup, restore a JSON backup, or restore the latest cloud snapshot.
