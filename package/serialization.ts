import type { PgIdentifier, PgTableDefinition } from "./types";
import { sql } from "./utils";

export function serializeTable(table: PgTableDefinition<any, any>): string {
  return serializeCreateTable(table);
}

function serializeCreateTable(
  table: PgTableDefinition<PgIdentifier, any>,
  constraints: any[] = [],
): string {
  const columns = Object.values(table);
  const tableName = columns[0]?.table;
  if (!tableName) throw new Error("Table name is required");
  return sql`
    CREATE TABLE IF NOT EXISTS ${serializeName(tableName)} (
      ${[
        ...columns.map(
          (col) =>
            `"${col.name}" ${[
              col.type.computeType(),
              col.type.isPrimaryKey && "PRIMARY KEY",
              col.type.isNotNull && "NOT NULL",
              col.type.defaultExpression &&
                `DEFAULT (${col.type.defaultExpression})`,
              col.type.generatedAlwaysExpression &&
                `GENERATED ALWAYS AS (${col.type.generatedAlwaysExpression}) STORED`,
              col.type.isUnique && "UNIQUE",
            ]
              .filter(Boolean)
              .join(" ")}`,
        ),
        ...constraints,
      ].join(",\n")}
    );
  `;
}

function serializeName(name: PgIdentifier | string): string {
  return name
    .split(".")
    .map((s) => `"${s}"`)
    .join(".");
}
