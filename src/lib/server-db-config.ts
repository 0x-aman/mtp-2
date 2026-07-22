export function getPostgresConfigError() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return "DATABASE_URL is missing. Set it to your Postgres connection string for server import and cloud backups.";
  }

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    return "DATABASE_URL must be a Postgres URL for server import and cloud backups. The live app data still stays in browser IndexedDB.";
  }

  if (databaseUrl.includes("USER:PASSWORD@HOST") || databaseUrl.includes("replace")) {
    return "DATABASE_URL is still a placeholder. Set it to the real Postgres connection string for server import and cloud backups.";
  }

  return null;
}
