# Database Migrations

As of v1.6.0 this project uses **Prisma Migrate** instead of `prisma db push`.
The Heroku release phase runs `npx prisma migrate deploy`, which applies only
pending migration files from `prisma/migrations/` and never drops or rewrites
existing data on its own.

## ⚠️ Critical: local `.env` points at the PRODUCTION database

`.env` and `.env.local` currently contain the production `DATABASE_URL`
(the same Heroku Postgres instance the live app uses). Until a separate local
dev database is set up, **never run any of the following locally**:

- `prisma db push` — can silently drop production columns/data
- `prisma migrate dev` — may attempt to apply or even RESET the database
- `prisma migrate reset` — DELETES ALL DATA

## How to make a schema change

1. Edit `prisma/schema.prisma`.
2. Generate the migration SQL **without touching any database**:

   ```bash
   npx prisma migrate diff \
     --from-migrations prisma/migrations \
     --shadow-database-url "postgresql://daniel@localhost:5432/dragonai_shadow" \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/$(date +%Y%m%d%H%M%S)_describe_change/migration.sql
   ```

   (Requires local Postgres running: `brew services run postgresql@14` and a
   scratch database: `createdb dragonai_shadow`.)

3. Review the generated SQL by hand. Additive changes (new tables, new
   nullable columns) are safe; anything with `DROP` or `ALTER ... TYPE`
   needs careful thought.
4. Verify against a throwaway DB:

   ```bash
   createdb dragonai_migrate_test
   DATABASE_URL="postgresql://daniel@localhost:5432/dragonai_migrate_test" npx prisma migrate deploy
   dropdb dragonai_migrate_test
   ```

5. Run `npx prisma generate`, commit the migration folder with the code that
   uses it, and ship via the normal `/release` procedure. Heroku's release
   phase applies it before the new code boots.

## History

- `0_init` is a **baseline**: it records the schema as it existed in
  production at v1.5.5. It was marked as applied with
  `prisma migrate resolve --applied 0_init` and has never been executed
  against production.

## Rollbacks

Never roll back a deployed migration. Write a new forward migration that
undoes the change instead.
