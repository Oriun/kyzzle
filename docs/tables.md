# Tables

`pgTable` is the entry point for describing tables. It accepts a fully qualified name, a column definition map, and an optional callback for constraints, indexes, and triggers.

```ts
import { pgTable, uuid, text, timestamptz } from "kyzzle";

const Users = pgTable(
  "auth.users",
  {
    id: uuid("id").primaryKey().notNull().default("uuid_generate_v4()"),
    email: text("email").notNull(),
    providerId: text("provider_id").immutable(),
    updatedAt: timestamptz("updated_at")
      .notNull()
      .generatedAlwaysAs("CURRENT_TIMESTAMP"),
  },
  (t) => [
    // define constraints, indexes, triggers here
  ],
);
```

## Function details

- Signature: `pgTable(tableName, definition, constraintsCb?)`.
- Validation: throws when the name is not `schema.table`, when no columns are provided, or when any value in `definition` is not a `DataType` instance.
- The `constraintsCb` can return a mixed array of constraints, indexes, and triggers; invalid or incomplete definitions throw during table creation to surface mistakes early.
- The returned object keeps your keys (`id`, `email`, …) while storing the database column name and PostgreSQL type on each column for downstream consumers (Zod schemas, Kysely types, and SQL serialization).

## Naming rules

- Table names must be fully qualified (`schema.table`). `pgTable("users", ...)` will throw; use `pgTable("public.users", ...)`.
- Column keys are the names you will use in your code. The `DataType` name is the underlying database column name and can differ (for snake_case vs camelCase).

```ts
const Products = pgTable("catalog.products", {
  productId: uuid("product_id").primaryKey().notNull(),
  name: text("name").notNull(),
});
// shape keys are productId and name; database columns are product_id and name
```

## Column definitions

- Each property in the definition map must be a `DataType` instance created by one of the helpers (`uuid`, `text`, `array(...)`, etc.).
- Empty definitions and non-`DataType` values throw to prevent silent mistakes.
- Columns carry both PostgreSQL metadata (type, default, nullability) and a Zod schema, making them reusable for validation and typing.

## Callback rules

- Receives the typed table definition so you can call `.on(table.colA, table.colB)` safely.
- Can return constraints (`primaryKey`, `unique`, `check`, `foreignKey`), indexes (`index`), or triggers (`trigger`) in a single array; Kyzzle normalizes and registers each kind internally.
- Column references are validated: missing columns or mismatched foreign key arity fail fast with descriptive errors.

## Reuse and organization

- Export table definitions and reuse them wherever you need Kysely types or Zod schemas; they are the single source of truth.
- Keep the constraints callback next to the definition so indexes, triggers, and checks travel with the table.
- You can group tables into an object (for example, `const Tables = { Users, Products };`) when deriving Kysely mappings.

## Sample use case

```ts
import {
  pgTable,
  uuid,
  text,
  timestamptz,
  primaryKey,
  unique,
  serializeTable,
  insertSchema,
} from "kyzzle";

const Articles = pgTable(
  "content.articles",
  {
    id: uuid("id").primaryKey().default("uuid_generate_v4()"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    updatedAt: timestamptz("updated_at")
      .generatedAlwaysAs("CURRENT_TIMESTAMP")
      .notNull(),
  },
  (t) => [
    primaryKey("articles_pk").on(t.id),
    unique("articles_slug_uniq").on(t.slug),
  ],
);

// Generate DDL to run in migrations
const ddl = serializeTable(Articles);

// Runtime validation schema for incoming writes
const createArticle = insertSchema(Articles);
createArticle.parse({ slug: "hello", title: "Hello", body: "World" });
```
