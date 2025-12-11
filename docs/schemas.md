# Zod Schemas

Kyzzle generates Zod schemas straight from your table definitions so you can validate payloads at runtime without duplicating shapes.

## `selectSchema(table)`

- Mirrors database nullability for reading rows.
- Columns with `.notNull()` remain required; others become `.nullable()`.
- Uses the column Zod schemas directly (including overrides, enum unions, array refinements).

```ts
const selectUser = selectSchema(Users);
selectUser.parse({
  id: crypto.randomUUID(),
  email: "lex@luthor.com",
  status: "ACTIVE",
  updatedAt: new Date(),
});
```

## `insertSchema(table, options?)`

- Treats columns with defaults as optional.
- Marks generated or immutable columns as `never().optional()` when `throwOnForbiddenColumns` is `true` (default), so attempts to pass them will fail validation.
- When `throwOnForbiddenColumns` is `false`, those columns are omitted from the schema entirely and ignored during parsing.
- Columns without `.notNull()` are nullable by default; `.notNull()` keeps the schema non-nullable but defaults still make it optional.

```ts
const insertUser = insertSchema(Users); // defaults enforced, generated columns rejected

const relaxedInsert = insertSchema(Users, { throwOnForbiddenColumns: false });
relaxedInsert.parse({ email: "lex@luthor.com", updatedAt: new Date() });
// => { email: "lex@luthor.com" } // forbidden columns stripped
```

## `updateSchema(table, options?)`

- Returns a partial schema suitable for patch operations.
- Generated or immutable columns follow the same `throwOnForbiddenColumns` rules as `insertSchema`.
- All properties are optional, but `.notNull()` columns remain non-nullable when present.

```ts
const updateUser = updateSchema(Users);
updateUser.parse({ email: "lex+1@luthor.com" });
updateUser.parse({}); // valid: all fields optional
```

## Combining with constraints

Pair generated schemas with `tableRefinement` to enforce `check` predicates or multi-column foreign keys in application code:

```ts
import { insertSchema, tableRefinement } from "kyzzle";

const createAccount = insertSchema(Accounts).superRefine(
  tableRefinement(Accounts)!,
);
```

## Sample use case

```ts
import { insertSchema, updateSchema, tableRefinement } from "kyzzle";

// Express-style middleware
export function validateUserCreate(req, res, next) {
  const schema = insertSchema(Users).superRefine(tableRefinement(Users)!);
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  req.body = parsed.data;
  next();
}

export function validateUserPatch(req, res, next) {
  const parsed = updateSchema(Users, { throwOnForbiddenColumns: false }).safeParse(
    req.body,
  );
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  req.body = parsed.data;
  next();
}
```

This keeps runtime validation aligned with your table metadata.
