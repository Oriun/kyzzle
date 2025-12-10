import {
  check,
  foreignKey,
  insertSchema,
  pgTable,
  primaryKey,
  serializeTable,
  serializeIndexes,
  serializeTriggers,
  text,
  tableRefinement,
  trigger,
  unique,
  uuid,
  index,
} from "kyzzle_test";
import { randomUUID } from "node:crypto";
import { suite, test, type TestContext } from "node:test";

suite("Constraints", async () => {
  await test("serializes table-level constraints", (t: TestContext) => {
    const Companies = pgTable(
      "public.companies_constraints",
      {
        id: uuid("id").notNull(),
        ownerId: uuid("owner_id"),
        name: text("name").notNull(),
      },
      (table) => [
        primaryKey("companies_pk").on(table.id),
        unique("companies_name_key").on(table.name),
        check("name_not_empty", "char_length(name) > 0"),
        foreignKey("companies_owner_fk")
          .on(table.ownerId)
          .setReferences("public.users", ["id"], {
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
          }),
      ],
    );

    const ddl = serializeTable(Companies);

    t.assert.match(ddl, /CONSTRAINT "companies_pk" PRIMARY KEY \("id"\)/);
    t.assert.match(ddl, /CONSTRAINT "companies_name_key" UNIQUE \("name"\)/);
    t.assert.match(
      ddl,
      /CONSTRAINT "name_not_empty" CHECK \(char_length\(name\) > 0\)/,
    );
    t.assert.match(
      ddl,
      /CONSTRAINT "companies_owner_fk" FOREIGN KEY \("owner_id"\) REFERENCES "public"\."users" \("id"\) ON DELETE SET NULL ON UPDATE CASCADE/,
    );
  });

  await suite("indexes serialization", async () => {
    await test("serializes basic unique index", (t: TestContext) => {
      const Logs = pgTable(
        "public.logs_indexes_basic",
        {
          id: uuid("id").notNull(),
          userId: uuid("user_id").notNull(),
        },
        (table) => [index("logs_user_idx", { unique: true }).on(table.userId)],
      );

      const indexes = serializeIndexes(Logs);

      t.assert.strictEqual(indexes.length, 1);
      t.assert.match(
        indexes[0],
        /CREATE UNIQUE INDEX "logs_user_idx" ON "public"\."logs_indexes_basic" \("user_id"\)\s*;/,
      );
    });

    await test("supports using/include/where options and unnamed indexes", (t: TestContext) => {
      const Logs = pgTable(
        "public.logs_indexes_options",
        {
          id: uuid("id").notNull(),
          message: text("message"),
          metadata: text("metadata"),
        },
        (table) => [
          index(undefined, {
            using: "gin",
            include: [table.id.name],
            where: "message IS NOT NULL",
          }).on(table.message),
          index("logs_covering_idx")
            .on(table.id, table.message)
            .includeColumns(table.metadata),
        ],
      );

      const indexes = serializeIndexes(Logs);

      t.assert.strictEqual(indexes.length, 2);
      t.assert.match(
        indexes[0],
        /CREATE INDEX IF NOT EXISTS ON "public"\."logs_indexes_options" USING gin \("message"\) INCLUDE \("id"\) WHERE message IS NOT NULL\s*;/,
      );
      t.assert.match(
        indexes[1],
        /CREATE INDEX "logs_covering_idx" ON "public"\."logs_indexes_options" \("id", "message"\) INCLUDE \("metadata"\)\s*;/,
      );
    });
  });

  await suite("triggers serialization", async () => {
    await test("serializes minimal trigger", (t: TestContext) => {
      const Logs = pgTable(
        "public.logs_triggers_basic",
        {
          id: uuid("id").notNull(),
          message: text("message"),
        },
        (table) => [
          trigger({
            name: "logs_notify",
            when: "AFTER",
            action: ["INSERT"],
            execute: "notify_logs",
          }),
        ],
      );

      const triggers = serializeTriggers(Logs);

      t.assert.strictEqual(triggers.length, 1);
      t.assert.match(
        triggers[0],
        /CREATE TRIGGER "logs_notify" AFTER INSERT ON "public"\."logs_triggers_basic" FOR EACH ROW EXECUTE FUNCTION "notify_logs"\(\)\s*;/,
      );
    });

    await test("serializes trigger with schema, args and WHEN", (t: TestContext) => {
      const Logs = pgTable(
        "public.logs_triggers_options",
        {
          id: uuid("id").notNull(),
          userId: uuid("user_id"),
        },
        (table) => [
          trigger({
            name: "logs_audit",
            when: "BEFORE",
            action: ["UPDATE", "DELETE"],
            execute: "audit.write_audit",
            with: ["logs", 1],
            condition: "OLD.id IS NOT NULL",
          }),
        ],
      );

      const triggers = serializeTriggers(Logs);

      t.assert.strictEqual(triggers.length, 1);
      t.assert.match(
        triggers[0],
        /CREATE TRIGGER "logs_audit" BEFORE UPDATE OR DELETE ON "public"\."logs_triggers_options" FOR EACH ROW WHEN \(OLD\.id IS NOT NULL\) EXECUTE FUNCTION "audit"\."write_audit"\('logs', 1\)\s*;/,
      );
    });

    await test("allows configuring trigger granularity", (t: TestContext) => {
      const Logs = pgTable(
        "public.logs_triggers_statement",
        {
          id: uuid("id").notNull(),
        },
        (table) => [
          trigger({
            name: "logs_statement",
            when: "AFTER",
            action: ["TRUNCATE"],
            forEach: "STATEMENT",
            execute: "log_truncate",
          }),
        ],
      );

      const triggers = serializeTriggers(Logs);

      t.assert.strictEqual(triggers.length, 1);
      t.assert.match(
        triggers[0],
        /CREATE TRIGGER "logs_statement" AFTER TRUNCATE ON "public"\."logs_triggers_statement" FOR EACH STATEMENT EXECUTE FUNCTION "log_truncate"\(\)\s*;/,
      );
    });
  });

  await suite("refine helper", async () => {
    const Roles = pgTable(
      "public.roles_constraints",
      {
        id: uuid("id").notNull(),
        name: text("name").notNull(),
        orgId: uuid("org_id"),
        teamId: uuid("team_id"),
      },
      (table) => [
        check(
          "name_forbidden",
          "name <> 'forbidden'",
          (row) => row.name !== "forbidden",
        ),
        foreignKey("roles_team_fk")
          .on(table.orgId, table.teamId)
          .setReferences("public.teams", ["org_id", "team_id"]),
      ],
    );

    await test("runs opt-in refinements", (t: TestContext) => {
      const schema = insertSchema(Roles).superRefine(tableRefinement(Roles)!);

      t.assert.partialDeepStrictEqual(
        schema.safeParse({ id: randomUUID(), name: "ok" }),
        {
          success: true,
        },
      );
      t.assert.partialDeepStrictEqual(
        schema.safeParse({ id: randomUUID(), name: "forbidden" }),
        {
          success: false,
        },
      );
      t.assert.partialDeepStrictEqual(
        schema.safeParse({ id: randomUUID(), name: "ok", orgId: randomUUID() }),
        {
          success: true,
        },
      );
      t.assert.partialDeepStrictEqual(
        schema.safeParse({
          id: randomUUID(),
          name: "ok",
          orgId: randomUUID(),
          teamId: randomUUID(),
        }),
        {
          success: true,
        },
      );
    });
  });
});
