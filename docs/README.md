# Kyzzle Developer Guide

Kyzzle is a small helper around PostgreSQL, Zod, and Kysely. It lets you describe tables, enums, and composite types in TypeScript, generate Zod schemas for runtime validation, and derive Kysely column types from the same source of truth. The API is heavily inspired by drizzle-orm while keeping the surface focused on schema modeling and validation.

## Install

```bash
npm install kyzzle zod
# optional: pg if you run queries during development
npm install pg
# optional: Kysely if you want its typings
npm install kysely
```

## Quick start

```ts
import {
  pgTable,
  pgEnumType,
  uuid,
  text,
  timestamptz,
  selectSchema,
  insertSchema,
  updateSchema,
  KyselyTables,
  primaryKey,
  index,
} from "kyzzle";

const Status = pgEnumType("auth.status", ["ACTIVE", "DISABLED"] as const);

const Users = pgTable(
  "auth.users",
  {
    id: uuid("id").primaryKey().notNull().default("uuid_generate_v4()"),
    email: text("email").notNull(),
    status: Status("status").notNull().default("ACTIVE"),
    updatedAt: timestamptz("updated_at")
      .notNull()
      .generatedAlwaysAs("CURRENT_TIMESTAMP"),
  },
  (t) => [
    primaryKey("users_pk").on(t.id),
    index("users_email_idx", { unique: true }).on(t.email),
  ],
);

// Zod schemas for runtime validation
const selectUser = selectSchema(Users);
const insertUser = insertSchema(Users);
const updateUser = updateSchema(Users);

// Kysely typings
type DB = KyselyTables<{ Users }>;
```

## Documentation map

- [Tables](./tables.md): defining tables and columns
- [Data types](./data-types.md): built-in column helpers, arrays, enums, composite types, custom types
- [Constraints & triggers](./constraints.md): primary keys, uniques, checks, foreign keys, indexes, triggers, runtime refinements
- [Zod schemas](./schemas.md): select/insert/update schema generation
- [Kysely types](./kysely.md): deriving database interfaces for queries
- [Utilities](./utilities.md): `sql` tag and schema overrides

If you only need a refresher, start with [Tables](./tables.md) and [Data types](./data-types.md).
