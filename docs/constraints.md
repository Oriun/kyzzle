# Constraints, Indexes, and Triggers

Attach relational metadata through the optional callback passed to `pgTable`. The callback receives the typed table columns and should return an array of constraint, index, or trigger definitions.

```ts
import {
  pgTable,
  uuid,
  text,
  primaryKey,
  unique,
  check,
  foreignKey,
  index,
  trigger,
  tableRefinement,
  insertSchema,
} from "kyzzle";

const Accounts = pgTable(
  "billing.accounts",
  {
    id: uuid("id").notNull(),
    ownerId: uuid("owner_id"),
    email: text("email").notNull(),
    status: text("status").notNull(),
  },
  (t) => [
    primaryKey("accounts_pk").on(t.id),
    unique("accounts_email_key").on(t.email),
    check("status_allowed", "status in ('ACTIVE','DISABLED')"),
    foreignKey("accounts_owner_fk")
      .on(t.ownerId)
      .setReferences("auth.users", ["id"], { onDelete: "SET NULL" }),
    index("accounts_status_idx").on(t.status),
    trigger({
      name: "accounts_updated_at",
      when: "BEFORE",
      action: ["UPDATE"],
      execute: "billing.touch_updated_at",
    }),
  ],
);
```

## Available helpers

- `primaryKey(name?)` and `unique(name?)` require `.on(colA, colB, ...)`; calling `.on` twice throws to prevent accidental overrides.
- `check(name, expression, predicate?)` accepts a SQL expression string or template literal. Optionally provide a JS predicate to mirror the check at runtime (see below). Missing expressions throw immediately.
- `foreignKey(name?).on(columns).setReferences(table, refColumns, { onDelete?, onUpdate? })` defines relationships. The number of referenced columns must match the source columns, identifiers must be fully qualified, and both source and referenced column names are validated.
- `index(name?, { unique?, using?, include?, where? })` builds additional indexes beyond primary/unique constraints. Use `includeColumns(...)` to add non-key columns and `where` for partial indexes.
- `trigger({ name, when/timing, action/events, execute, with?, condition?, forEach? })` describes triggers. `execute` may include a schema (`logs.touch()`), `with` passes arguments, and `condition` adds a `WHEN (...)` clause.

### Sample constraint set

```ts
import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamptz,
  primaryKey,
  foreignKey,
  check,
  index,
  trigger,
  sql,
} from "kyzzle";

const Orders = pgTable(
  "sales.orders",
  {
    id: uuid("id").notNull(),
    customerId: uuid("customer_id").notNull(),
    status: text("status").notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamptz("created_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
  },
  (t) => [
    primaryKey("orders_pk").on(t.id),
    foreignKey("orders_customer_fk")
      .on(t.customerId)
      .setReferences("crm.customers", ["id"], { onDelete: "CASCADE" }),
    check(
      "status_allowed",
      sql`status in ('PENDING','PAID','CANCELLED')`,
      (row) => ["PENDING", "PAID", "CANCELLED"].includes(row.status as string),
    ),
    index("orders_status_idx", { where: sql`status != 'CANCELLED' }).on(
      t.status,
    ),
    trigger({
      name: "orders_touch",
      when: "BEFORE",
      action: ["UPDATE"],
      execute: "sales.touch_updated_at",
      condition: sql`NEW.status is distinct from OLD.status`,
    }),
  ],
);
```

## Runtime refinements

`tableRefinement(table)` converts constraint predicates into a Zod refinement you can opt into:

```ts
const schema = insertSchema(Accounts).superRefine(tableRefinement(Accounts)!);

schema.safeParse({ id: "123", email: "a@example.com", status: "ACTIVE" });
// will fail if the check predicate or foreign key completeness rules are violated
```

Notes:

- Check predicates run inside the refinement and surface as custom Zod issues.
- Multi-column foreign keys require all participating columns together. Passing a subset (for example, `tableRefinement` on a `{ countryCode }` + `{ countryCode, regionCode }` foreign key) will add an issue on the first missing column.

This is useful for mirroring `check` logic or enforcing multi-column foreign keys before hitting the database.
