# Kysely Types

Kyzzle derives fully typed Kysely interfaces from your table definitions so you can query with confidence.

## Converting a single table

```ts
import { pgTable, uuid, text, type ToTableType } from "kyzzle";
import { type Selectable, type Insertable, type Updateable } from "kysely";

const Users = pgTable("auth.users", {
  id: uuid("id").primaryKey().notNull().default("uuid_generate_v4()"),
  email: text("email").notNull(),
  status: text("status").notNull().default("ACTIVE"),
});

type UsersTable = ToTableType<typeof Users>;

type User = Selectable<UsersTable>;
type CreateUser = Insertable<UsersTable>;
type UpdateUser = Updateable<UsersTable>;
```

Column modifiers flow into the resulting types:

- `.notNull()` makes the property required in `Selectable`.
- `.default(...)` makes the property optional in `Insertable`.
- `.generatedAlwaysAs(...)` or `.immutable()` removes the property from `Updateable`.
- Arrays preserve their inner nullability (`array(text("tags")).notNullableItems()` keeps `string[]`).

## Converting multiple tables

```ts
import { type KyselyTables } from "kyzzle";

const Tables = { Users, Accounts, Logs };
type DB = KyselyTables<typeof Tables>;

type UserRow = Selectable<DB["auth.users"]>;
type AccountInsert = Insertable<DB["billing.accounts"]>;
```

The keys in `DB` are fully qualified identifiers (`schema.table`), preventing collisions across schemas and keeping your database map precise.

## Type mapping details

- Kyzzle columns become Kysely `ColumnType<Select, Insert, Update>`; select types reflect nullability, insert types consider defaults, and update types drop immutable/generated fields.
- Enum and composite types flow into the select/insert/update slots with the exact Zod output types you defined (including overrides and refinements).
- Foreign keys and indexes are not required for the typings themselves but stay available for SQL generation and runtime refinements.

## Sample use case

```ts
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { type KyselyTables, selectSchema } from "kyzzle";
import { Users, Accounts } from "./tables";

type DB = KyselyTables<{ Users; Accounts }>;
const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString }) }),
});

// Fully typed query: status is validated at compile time
const activeUsers = await db
  .selectFrom("auth.users")
  .selectAll()
  .where("status", "=", "ACTIVE")
  .execute();

// Validate the result at runtime if desired
const userSchema = selectSchema(Users);
activeUsers.forEach((user) => userSchema.parse(user));
```
