"""Turn a Supabase dump into SQL that restores cleanly on Cloud SQL.

Usage: python3 -I prep_restore.py <backup dir>
The backup dir holds schema.sql, auth_schema.sql and data.sql from
`supabase db dump`; the result goes to <backup dir>/restore/00…04_*.sql,
to be run in order inside one transaction.
"""
import re
import sys
from pathlib import Path

backup = Path(sys.argv[1])
out = backup / "restore"
out.mkdir(exist_ok=True)

# Supabase's own roles and extension schema, so grants and policies apply.
(out / "00_bootstrap.sql").write_text("""
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','authenticator',
                           'supabase_admin','supabase_auth_admin','dashboard_user']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', r);
    END IF;
    EXECUTE format('GRANT %I TO postgres', r);
  END LOOP;
END $$;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
""")

# Supabase-only features Cloud SQL doesn't have.
unsupported = re.compile(r'supabase_vault|supabase_realtime|"vault"')

# postgres on Cloud SQL is not a superuser: objects it hands to these roles
# become unusable to it, so it keeps ownership itself.
supabase_owner = re.compile(r'OWNER TO "(supabase_admin|supabase_auth_admin)"')


def strip_unsupported(src: str) -> str:
    kept = (supabase_owner.sub('OWNER TO "postgres"', l)
            for l in src.splitlines() if not unsupported.search(l))
    return "\n".join(kept) + "\n"


# Cloud SQL forbids session_replication_role, so foreign keys and triggers are
# created after the data is loaded: COPY order can't break FKs and triggers
# can't rewrite rows (on_auth_user_created would duplicate public.users).
fk = re.compile(r'^ALTER TABLE ONLY [^\n]+\n\s+ADD CONSTRAINT [^\n]+ FOREIGN KEY [^\n]*;\n', re.M)
trigger = re.compile(r'^CREATE OR REPLACE TRIGGER [^\n]*\n', re.M)
post_data = []


def split_post_data(src: str) -> str:
    for pattern in (fk, trigger):
        post_data.extend(pattern.findall(src))
        src = pattern.sub("", src)
    return src


(out / "01_auth_schema.sql").write_text(split_post_data(strip_unsupported((backup / "auth_schema.sql").read_text())))
(out / "02_public_schema.sql").write_text(split_post_data(strip_unsupported((backup / "schema.sql").read_text())))
(out / "04_post_data.sql").write_text("\n".join(post_data))

# Keep only public/auth COPY blocks; storage metadata stays behind (the files
# themselves live in GCS).
lines = (backup / "data.sql").read_text().split("\n")
kept, skip = [], False
for l in lines:
    if l.startswith("COPY "):
        skip = not (l.startswith('COPY "public".') or l.startswith('COPY "auth".'))
    if not skip and l != "SET session_replication_role = replica;":
        kept.append(l)
    if skip and l == "\\.":
        skip = False
(out / "03_data.sql").write_text("\n".join(kept))

for f in sorted(out.iterdir()):
    print(f.name, f.stat().st_size)
