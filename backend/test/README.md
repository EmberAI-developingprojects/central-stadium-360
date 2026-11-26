# Backend tests

Integration tests run the app in-process against a real Postgres and a fake QPay.

```bash
# one-time: Postgres 17 in Docker, restored from a backup, plus every migration
docker run -d --name cs360-pg -e POSTGRES_PASSWORD=localdev -p 55432:5432 postgres:17
docker exec cs360-pg psql -U postgres -c "create database cs360"
# restore ~/Documents/cs360-backups/<dump>/restore/00..04 into cs360, then apply
# supabase/migrations/0033+ in order, then snapshot it as the template:
docker exec cs360-pg psql -U postgres -c "create database cs360_tmpl template cs360"

pnpm --filter @cs360/backend test
```

Each test file clones `cs360_tmpl` into its own throwaway database
(`TEST_PG_ADMIN_URL`, `TEST_PG_TEMPLATE` override the defaults) and drops it at the end.
SMS uses the `dev` provider (logged, never sent); QPay is a local fake server.
