# Data Types

Kyzzle ships composable column helpers that produce `DataType` instances. Each helper infers a Zod schema, carries PostgreSQL metadata, and supports a common set of modifiers.

## Column helpers

- Numbers: `integer`/`int`, `smallInt`/`int2`, `bigint`/`int8`, `numeric({ precision?, scale? })`, `doublePrecision`, `serial`.
  - Integer and numeric types expose `.gt/.gte/.lt/.lte/.positive/.negative/.nonpositive/.nonnegative/.multipleOf`; these update both the Zod schema and serialized metadata (for example, precision or min/max).
  - `numeric` renders `numeric(precision, scale)` only when provided; otherwise it keeps plain `numeric`.
  - `serial` marks an auto-incrementing column while keeping Zod as a number.
- Booleans: `bool`/`boolean`.
- Strings: `text`, `varchar({ length })`, `char({ length })`.
  - `text` supports `.min(length)`, `.max(length)`, `.length(length)`, and `.regex(pattern)`.
  - `char`/`varchar` enforce the provided length at the PostgreSQL type level; `.regex` can further refine Zod.
- Temporal: `date`, `timestamp`, `timestamptz`.
  - Accept optional `precision` and support `.min(date)` / `.max(date)` refinements on the Zod schema.
  - `timestamptz` uses timezone-aware PostgreSQL types; both map to `Date` in Zod with safe parsing for ISO strings.
- JSON: `json(schema)`, `jsonb(schema)` bind a Zod schema directly to the payload (defaults can be JS objects or SQL expressions).
- UUID: `uuid` validates UUIDs via Zod and keeps the underlying PostgreSQL `uuid` type.
- Custom: `custom(pgType, zodSchema)` maps any PostgreSQL type or domain to a Zod schema.
- Arrays: `array(type)` wraps any `DataType` in a PostgreSQL array and preserves its Zod schema.

### Modifiers

All column helpers share these chainable modifiers:

- `.notNull()` marks the column `NOT NULL` and keeps the Zod schema non-nullable; select/insert/update schemas will expect the field unless a default exists.
- `.unique()` sets a column-level uniqueness flag (in addition to any explicit `unique(...)` constraint).
- `.primaryKey()` marks as primary key and `NOT NULL`, flowing into insert/update Zod schemas and Kysely types.
- `.default(expression)` stores a SQL expression as the column default. Plain strings are quoted unless they are known keywords (`CURRENT_TIMESTAMP`, `uuid_generate_v4()`, etc.). Template literals are supported, and objects/dates are stringified.
- `.generatedAlwaysAs(expression)` marks the column as generated, immutable, and excluded from insert/update schemas.
- `.immutable()` forbids updates in generated schemas while keeping the column visible for selects.
- `.override(schema | fn)` replaces the inferred Zod schema or lets you mutate it (useful for domain-specific refinements).

### Arrays

`array(type)` preserves the inner column type and Zod schema while adding array semantics:

- `.notNullableItems()` forces non-null items.
- `.minLength(n)`, `.maxLength(n)`, `.length(n)` constrain array size.
- Combine with `.notNull()` to make the column itself required.
- Defaults can be plain arrays or SQL expressions; the inner item metadata (type, nullability, overrides) is preserved for both Zod schemas and serialized SQL.

```ts
const Lists = pgTable("public.lists", {
  tags: array(text("tag")).minLength(1).notNull(),
  scores: array(integer("score")).notNullableItems(),
});
```

### Enum types

```ts
const Roles = pgEnumType("auth.roles", ["ADMIN", "MEMBER"] as const);

const Users = pgTable("auth.users", {
  role: Roles("role").notNull(),
});
```

- Names must be fully qualified (`schema.name`); invalid identifiers throw.
- Accepts an array or record of values and fails fast when empty.
- The returned factory attaches the enum type to any column you create, exposes `values` and `enumName` metadata, and feeds that into Zod unions.

### Composite types

```ts
const Address = pgCompositeType("geo.address", {
  street: text("street").notNull(),
  postalCode: integer("postal_code"),
});

const Locations = pgTable("geo.locations", {
  address: Address("address").notNull(),
  previousAddress: Address("previous_address"),
});
```

Composite columns reuse the same fields and Zod schemas across tables. Defaults accept SQL expressions or plain objects; objects are validated and normalized to database field names:

```ts
Address("shipping_address").default({
  street: "Main",
  postalCode: 75000,
});
```

- Invalid identifiers or empty definitions throw. All fields must be `DataType` instances, mirroring table definitions.
- Defaults accept SQL expressions or plain objects; plain objects are validated against the composite field schemas and normalized to database field names before being converted into a `jsonb_populate_record` expression.

### JSON and custom types

- `json(schema)` and `jsonb(schema)` bind a Zod schema to JSON payloads while keeping the PostgreSQL type accurate.
- `custom(pgType, zodSchema)` lets you plug any database type with an accompanying Zod schema (for example, domains or extensions).

## Sample use case

```ts
import { numeric, text, timestamp, array, jsonb, pgTable } from "kyzzle";
import { object, string } from "zod";

const InvoiceLine = object({
  sku: string(),
  quantity: string().transform((q) => Number(q)),
});

const Invoices = pgTable("billing.invoices", {
  code: text("code").regex(/^INV-[0-9]+$/).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).positive().notNull(),
  paidAt: timestamp("paid_at", { precision: 3 }).max(new Date()),
  lines: array(jsonb("line", InvoiceLine))
    .minLength(1)
    .notNullableItems()
    .notNull(),
});
```

This example combines string patterns, numeric precision, timestamp bounds, and array length constraints while keeping PostgreSQL metadata and Zod validation in sync.
