import {
  check,
  foreignKey,
  insertSchema,
  pgTable,
  primaryKey,
  serializeTable,
  text,
  unique,
  uuid,
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
          .references("public.users", ["id"], {
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
          .references("public.teams", ["org_id", "team_id"]),
      ],
    );

    const schema = insertSchema(Roles).superRefine(Roles.refine());

    t.assert.strictEqual(
      schema.safeParse({ id: randomUUID(), name: "ok" }).success,
      true,
    );
    t.assert.strictEqual(
      schema.safeParse({ id: randomUUID(), name: "forbidden" }).success,
      false,
    );
    t.assert.strictEqual(
      schema.safeParse({ id: randomUUID(), name: "ok", orgId: randomUUID() })
        .success,
      false,
    );
    t.assert.strictEqual(
      schema.safeParse({
        id: randomUUID(),
        name: "ok",
        orgId: randomUUID(),
        teamId: randomUUID(),
      }).success,
      true,
    );
  });
});
