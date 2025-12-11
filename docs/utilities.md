# Utilities

## `sql` template tag

An indentation-safe template tag useful for multi-line SQL snippets passed to defaults, checks, or triggers. It trims shared leading spaces while preserving layout. While it has its uses, you shouldn't use for runtime as it does not escape inputs.

```ts
import { sql, check } from "kyzzle";

check(
  "name_not_empty",
  sql`
    char_length(name) > 0
  `,
);
```

- Indentation is trimmed based on the first non-space character, so you can keep SQL nicely indented inside template literals without introducing leading spaces.
- Interpolation is passthrough: objects are JSON-stringified and quoted, dates are turned into ISO strings. Do not use it for untrusted values.

## Overriding Zod schemas

`DataType#override` lets you replace or refine the inferred Zod schema for a column.

```ts
import { numeric } from "kyzzle";
import { number } from "zod";

const Price = numeric("price", { precision: 10, scale: 2 }).override((schema) =>
  schema.gt(0),
);
```

Use overrides sparingly to add domain-specific refinements while keeping PostgreSQL types consistent.
