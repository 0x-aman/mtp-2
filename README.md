# MAHALAXMI POWER TOOLS Inventory

Modern single-owner inventory management app built with Next.js 15, TypeScript, Prisma, PostgreSQL, Tailwind CSS, shadcn-style components, TanStack Table, Recharts, CSV import/export, and optional AI image extraction.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Replace the placeholder values for `DATABASE_URL`, `APP_PIN`, `SESSION_SECRET`, and optional OpenAI variables.
3. Install dependencies:

```bash
npm install
```

4. Create the database tables:

```bash
npm run prisma:migrate
```

5. Start the app:

```bash
npm run dev
```

The app is PIN-protected and has no user registration, roles, or multi-user authentication.
