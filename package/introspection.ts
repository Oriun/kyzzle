import { object, string, enum as _enum, number, unknown, boolean } from "zod";
import { sql } from "./utils";
import type { PgIdentifier } from "./types";

export async function listSchemaItems(
  schemas: string[],
  executor: { query(q: string): Promise<{ rows: any[] }> },
) {
  const query = sql`
    SELECT distinct on (nspname, name) *
    FROM (
        SELECT
            c.relnamespace as relnamespace,
            c.relkind AS type,
            c.relname::text AS name
        FROM pg_class c
        WHERE c.relkind IN ('r', 'v', 'm')

        UNION

        SELECT t.typnamespace, t.typtype, t.typname::text
        FROM pg_type t
        WHERE t.typtype in ('c', 'e')

        UNION

        SELECT
            p.pronamespace,
            'f',
            p.proname::text || '(' || pg_get_function_identity_arguments(p.oid) || ')'
        FROM pg_proc p
    )
    JOIN pg_namespace n ON n.oid = relnamespace
    WHERE n.nspname in ('${schemas.join("','")}')
    ORDER BY nspname asc, name asc, type desc;
  `;

  const { rows } = await executor.query(query);

  return object({
    type: _enum(["r", "v", "m", "c", "e", "f"]).transform(
      (v) =>
        ({
          r: "table",
          v: "view",
          m: "matview",
          c: "composite type",
          e: "enum",
          f: "function",
        })[v],
    ),
    nspname: string(),
    name: string(),
  })
    .array()
    .parse(rows);
}

export async function listTableItems(
  table: PgIdentifier,
  executor: { query(q: string, params: string[]): Promise<{ rows: any[] }> },
) {
  const query = sql`
    WITH
        -- Basic table info
        table_info AS (
          SELECT
            n.nspname AS table_schema,
            c.relname AS table_name,
            pg_get_userbyid(c.relowner) AS owner
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_tablespace ts ON ts.oid = c.reltablespace
          WHERE n.nspname = $1 AND c.relname = $2
        ),

        -- Columns
        columns AS (
          SELECT jsonb_agg(columns.*) as columns
      		FROM(
      			SELECT
              table_schema,
              table_name,
              column_name,
              (udt_schema || '.' || udt_name) as column_type,
              is_nullable,
              is_generated,
              is_updatable,
              numeric_scale,
              column_default,
              identity_cycle,
              ordinal_position,
              numeric_precision,
              is_self_referencing,
              generation_expression,
              character_octet_length
            FROM information_schema.columns
        		WHERE table_name = $2 and table_schema = $1
      		) as columns
        ),

        -- Constraints
        constraints AS (
      		SELECT jsonb_agg(constraints.*) as constraints
      		FROM (
              SELECT
                tc.table_schema,
                tc.table_name,
                tc.constraint_type,
                tc.constraint_name,
                jsonb_agg(distinct kcu.column_name) filter (where kcu.column_name is not null) as column_names,
                tc.is_deferrable,
                tc.nulls_distinct,
                rc.update_rule,
                rc.delete_rule
              FROM information_schema.table_constraints AS tc
              LEFT JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
              LEFT JOIN information_schema.referential_constraints AS rc
                  ON tc.constraint_name = rc.constraint_name
              WHERE tc.enforced = 'YES' and tc.table_name = $2 and tc.table_schema = $1
              GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, constraint_type, is_deferrable, nulls_distinct, update_rule, delete_rule
              ORDER BY tc.table_schema, tc.table_name, tc.constraint_name asc, constraint_type desc
      		) as constraints
        ),

        -- Indexes
        indexes AS (
            SELECT jsonb_agg(indexes.*) as indexes
            FROM (
              SELECT
                nsp.nspname AS table_schema,
                tbl.relname AS table_name,
                idx.relname AS index_name,
                ind.indisunique AS is_unique,
                ind.indisprimary AS is_primary,
                ind.indisexclusion as is_exclusion,
                ind.indnullsnotdistinct as is_nulls_not_distinct,
                pg_get_indexdef(ind.indexrelid) AS index_definition
              FROM pg_index ind
              JOIN pg_class idx ON ind.indexrelid = idx.oid
              JOIN pg_class tbl ON ind.indrelid = tbl.oid
              JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
              WHERE ind.indislive = true
                AND tbl.relname = $2
                AND nsp.nspname = $1
              ORDER BY idx.relname asc
            ) as indexes
        ),

        -- Triggers
        triggers AS (
            SELECT jsonb_agg(triggers.*) as triggers
            FROM (
              SELECT
                nsp.nspname as table_schema,
                tbl.relname as table_name,
                tg.tgname AS name,
                tg.tgenabled = 'O' AS enabled,
                pg_get_triggerdef(tg.oid) AS procedure
              FROM pg_trigger tg
              JOIN pg_class tbl ON tbl.oid = tg.tgrelid
              JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
              WHERE NOT tg.tgisinternal
                AND tbl.relname = $2
                AND nsp.nspname = $1
              ORDER BY tg.tgname asc
            ) as triggers
        )

        SELECT
            (SELECT row_to_json(table_info.*) FROM table_info) as table,
            (SELECT columns FROM columns) as columns,
            (SELECT constraints FROM constraints) as constraints,
            (SELECT indexes FROM indexes) as indexes,
            (SELECT triggers FROM triggers) as triggers
        ;
  `;

  const { rows } = await executor.query(query, table.split("."));

  return object({
    table: object({
      table_schema: string(),
      table_name: string(),
      owner: string(),
    }),
    columns: object({
      table_schema: string(),
      table_name: string(),
      column_name: string(),
      column_type: string(),
      is_nullable: _enum(["YES", "NO"]).transform((value) => value === "YES"),
      is_generated: _enum(["NEVER", "ALWAYS"]).transform(
        (value) => value === "ALWAYS",
      ),
      is_updatable: _enum(["YES", "NO"]).transform((value) => value === "YES"),
      numeric_scale: number().nullable(),
      column_default: string().nullable(),
      identity_cycle: _enum(["YES", "NO"]).transform(
        (value) => value === "YES",
      ),
      ordinal_position: number().nullable(),
      numeric_precision: number().nullable(),
      is_self_referencing: _enum(["YES", "NO"]).transform(
        (value) => value === "YES",
      ),
      generation_expression: string().nullable(),
      character_octet_length: number().nullable(),
    }).array(),
    constraints: object({
      table_schema: string(),
      table_name: string(),
      delete_rule: _enum([
        "NO ACTION",
        "CASCADE",
        "SET NULL",
        "SET DEFAULT",
      ]).nullable(),
      update_rule: _enum([
        "NO ACTION",
        "CASCADE",
        "SET NULL",
        "SET DEFAULT",
      ]).nullable(),
      column_names: string().array().nullable(),
      is_deferrable: _enum(["YES", "NO"]).transform((value) => value === "YES"),
      nulls_distinct: unknown(),
      constraint_name: string(),
      constraint_type: _enum(["CHECK", "PRIMARY KEY", "FOREIGN KEY", "UNIQUE"]),
    }).array(),
    indexes: object({
      table_schema: string(),
      table_name: string(),
      is_unique: boolean(),
      index_name: string(),
      is_primary: boolean(),
      is_exclusion: boolean(),
      index_definition: string(),
      is_nulls_not_distinct: boolean(),
    }).array(),
    triggers: object({
      table_schema: string(),
      table_name: string(),
      name: string(),
      enabled: boolean(),
      procedure: string(),
    }).array(),
  })
    .array()
    .parse(rows)[0];
}

export async function listCompositeTypeItems(
  type: PgIdentifier,
  executor: { query(q: string, params: string[]): Promise<{ rows: any[] }> },
) {
  const query = sql`
    WITH
      type_info AS (
        SELECT
          t.oid AS type_oid,
          t.typrelid AS rel_oid,
          t.typname AS type_name,
          n.nspname AS type_schema
        FROM
          pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE
          n.nspname = $1
          AND t.typname = $2
      )
    SELECT
      ti.type_schema,
      ti.type_name,
      (
        SELECT
          jsonb_agg(fields.*) as fields
        FROM (
          SELECT
            a.attnum as ordinal_position,
            a.attname as name,
            pg_catalog.format_type (a.atttypid, a.atttypmod) as field_type,
            a.attnotnull as is_not_null,
            pg_get_expr(ad.adbin, ad.adrelid) as default
          FROM pg_attribute a
          LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid
            AND ad.adnum = a.attnum
          WHERE a.attrelid = ti.rel_oid AND a.attnum > 0 AND NOT a.attisdropped
        ) as fields
      ) as fields,
      (
        SELECT
          jsonb_agg(constraints.*) as constraints
        FROM (
          SELECT
            c.conname,
            c.contype,
            pg_get_constraintdef (c.oid) as definition
          FROM pg_constraint c
          WHERE c.contypid = ti.type_oid
          ORDER BY c.conname
        ) as constraints
      ) as constraints
    FROM type_info ti;
  `;

  const { rows } = await executor.query(query, type.split("."));

  return object({
    type_schema: string(),
    type_name: string(),
    fields: object({
      name: string(),
      default: string().nullable(),
      field_type: string(),
      is_not_null: boolean(),
      ordinal_position: number(),
    }).array(),
    constraints: object({}).passthrough().array().nullable(),
  })
    .array()
    .parse(rows);
}

export async function listEnumTypeItems(
  type: PgIdentifier,
  executor: { query(q: string, params: string[]): Promise<{ rows: any[] }> },
) {
  const query = sql`
      SELECT
        n.nspname       AS type_schema,
        t.typname       AS type_name,
        e.enumsortorder AS ordinal_position,
        e.enumlabel     AS enum_value
      FROM pg_type t
      JOIN pg_enum e      ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = $2
        AND n.nspname = $1
      ORDER BY e.enumsortorder;
    `;

  const { rows } = await executor.query(query, type.split("."));

  return object({
    type_schema: string(),
    type_name: string(),
    ordinal_position: number(),
    enum_value: string(),
  })
    .array()
    .parse(rows);
}

export async function getViewQuery(
  view: PgIdentifier,
  executor: { query(q: string, params: string[]): Promise<{ rows: any[] }> },
) {
  const query = sql`
    SELECT pg_get_viewdef($1::regclass) as definition;
  `;

  const { rows } = await executor.query(query, [view]);

  return object({
    definition: string(),
  })
    .array()
    .parse(rows)[0];
}
