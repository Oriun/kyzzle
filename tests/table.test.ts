import {
  insertSchema,
  integer,
  pgTable,
  selectSchema,
  text,
  timestamptz,
  updateSchema,
  uuid,
  type KyselyTables,
} from "kyzzle_test";
import { randomBytes, randomUUID } from "node:crypto";
import { basename, join } from "node:path";
import { snapshot, suite, test, type TestContext } from "node:test";
import { type output, string, ZodObject } from "zod";
import { type Selectable, type Insertable, type Updateable } from "kysely";

suite("Create Table", async () => {
  await suite("should not throw", async () => {
    const randStr = randomBytes(4).toString("hex");
    const scenarios = [
      ["professional.companies", { id: text("id") }],
      ["professional.companies", { [randStr]: integer(randStr) }],
    ] as Parameters<typeof pgTable>[];
    for (const idx in scenarios)
      await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
        t.assert.doesNotThrow(() => pgTable(...scenarios[idx])));
  });
  await suite("should throw", async () => {
    const scenarios = [
      [],
      ["without_schema", { id: text("id") }],
      ["public.users"],
      ["public.users", {}],
      ["public.users", { id: "id" }],
      ["public.users", { id: string() }],
      ["public.users", { id: () => {} }],
      ["public.users", { id: 2 }],
      ["public.users", { [randomBytes(4).toString("hex")]: 2 }],
    ] as const;
    for (const idx in scenarios)
      await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
        // @ts-expect-error
        t.assert.throws(() => pgTable(...scenarios[idx])));
  });
  await test("should create a table", (t: TestContext) => {
    const table = pgTable("professional.companies", {
      id: uuid("id"),
      name: text("name"),
    });
    t.assert.ok(table);

    const keys = Object.keys(table).sort();
    t.assert.deepStrictEqual(keys, ["id", "name"]);

    t.assert.snapshot(table);
  });
  await suite("should create kysely definitions", async () => {
    const Companies = pgTable("professional.companies", {
      id: uuid("id")
        .primaryKey()
        .notNull()
        .default("uuid_generate_v4()")
        .immutable(),
      name: text("name").notNull(),
      updatedAt: timestamptz("updated_at")
        .notNull()
        .generatedAlwaysAs("CURRENT_TIMESTAMP"),
    });
    const Managers = pgTable("professional.managers", {
      id: uuid("id")
        .primaryKey()
        .notNull()
        .default("uuid_generate_v4()")
        .immutable(),
      name: text("name").notNull(),
      companyId: uuid("company_id"),
      providerId: text("provider_id").immutable(),
      updatedAt: timestamptz("updated_at")
        .notNull()
        .generatedAlwaysAs("CURRENT_TIMESTAMP"),
    });
    const Tables = {
      Companies,
      Managers,
    };
    type Kysely = KyselyTables<typeof Tables>;

    await test("should infer tables with full identifier", (t: TestContext) => {
      const _tmp = [
        "professional.companies",
        "professional.managers",
        // @ts-expect-error
        "professional.assets",
        // @ts-expect-error
        "companies",
      ] satisfies (keyof Kysely)[];
    });
    await test("should infer SELECT interface", (t: TestContext) => {
      type CompaniesRow = Selectable<Kysely["professional.companies"]>;
      const _validRow: CompaniesRow = {
        id: randomUUID(),
        name: "My Company",
        updatedAt: new Date(),
      };
      const _invalidRow: CompaniesRow = {
        // @ts-expect-error
        id: "not-a-uuid",
        // @ts-expect-error
        name: 42,
        // @ts-expect-error
        updatedAt: {},
      };
    });
    await test("should infer INSERT interface", (t: TestContext) => {
      type ManagersInsertValues = Insertable<Kysely["professional.managers"]>;
      const _validValues: ManagersInsertValues[] = [
        {
          id: randomUUID(),
          name: "My Company",
          companyId: randomUUID(),
          providerId: "p-rovi-derid",
        },
        {
          id: null,
          name: "My Company",
          companyId: null,
          providerId: null,
        },
        {
          id: randomUUID(),
          name: "My Company",
          companyId: randomUUID(),
        },
        {
          id: randomUUID(),
          name: "My Company",
          providerId: "p-rovi-derid",
        },
        {
          id: randomUUID(),
          name: "My Company",
        },
        {
          name: "My Company",
        },
      ];
      const _invalidValues: ManagersInsertValues[] = [
        // @ts-expect-error
        {},
        // @ts-expect-error
        { name: null },
        {
          id: randomUUID(),
          // @ts-expect-error
          companyId: 2,
          name: "My Company",
        },
        {
          // @ts-expect-error
          id: "not-a-uuid",
          // @ts-expect-error
          name: 42,
          providerId: "p-rovi-derid",
        },
      ];
    });
    await test("should infer UPDATE interface", (t: TestContext) => {
      type ManagersUpdateValues = Updateable<Kysely["professional.managers"]>;
      const _validValues: ManagersUpdateValues[] = [
        {
          name: "My Company",
          companyId: randomUUID(),
        },
        {
          name: "My Company",
          companyId: randomUUID(),
        },
        {
          companyId: randomUUID(),
        },
        {
          name: "My Company",
        },
        {},
      ];
      const _invalidValues: ManagersUpdateValues[] = [
        // @ts-expect-error
        { name: null },
        {
          // @ts-expect-error
          id: randomUUID(),
          // @ts-expect-error
          providerId: "hello",
        },
        {
          // @ts-expect-error
          id: randomUUID(),
          // @ts-expect-error
          companyId: 2,
          name: "My Company",
        },
        {
          // @ts-expect-error
          id: "not-a-uuid",
          // @ts-expect-error
          name: 42,
          // @ts-expect-error
          providerId: "p-rovi-derid",
        },
      ];
    });
  });
  await suite("should create zod schemas", async () => {
    const Managers = pgTable("professional.managers", {
      id: uuid("id")
        .primaryKey()
        .notNull()
        .default("uuid_generate_v4()")
        .immutable(),
      name: text("name").notNull(),
      companyId: uuid("company_id"),
      providerId: text("provider_id").immutable(),
      age: integer("age").default("0"),
      updatedAt: timestamptz("updated_at")
        .notNull()
        .generatedAlwaysAs("CURRENT_TIMESTAMP"),
    });
    await suite("should not throw", async () => {
      for (const helper of [selectSchema, insertSchema, updateSchema])
        await test(`scenario #${helper.name}`, (t: TestContext) =>
          t.assert.doesNotThrow(() => helper(Managers)));
    });
    await suite("SELECT schema", async () => {
      const selectManager = selectSchema(Managers);
      await test("should extract SELECT schema", (t: TestContext) => {
        t.assert.ok(selectManager);
        t.assert.ok(selectManager instanceof ZodObject);
        const shapeKeys = Object.keys(selectManager.shape);
        t.assert.deepStrictEqual(shapeKeys, [
          "id",
          "name",
          "companyId",
          "providerId",
          "age",
          "updatedAt",
        ]);
        t.assert.notDeepStrictEqual(shapeKeys, [
          "id",
          "name",
          "company_id",
          "provider_id",
          "age",
          "updated_at",
        ]);
      });
      await suite("should not throw", async () => {
        const id = randomUUID();
        const scenarios = [
          [
            {
              id,
              name: "Lex Luthor",
              companyId: null,
              providerId: "gd_sax:12345",
              age: null,
              updatedAt: new Date(),
            },
          ],
          [
            {
              id,
              name: "Lex Luthor",
              companyId: randomUUID(),
              providerId: null,
              age: 50,
              updatedAt: new Date(),
            },
          ],
          [
            {
              id,
              name: "Lex Luthor",
              companyId: null,
              providerId: "gd_sax:12345",
              age: null,
              updatedAt: "2025-11-20T23:21:04.962Z",
            },
            {
              id,
              name: "Lex Luthor",
              companyId: null,
              providerId: "gd_sax:12345",
              age: null,
              updatedAt: new Date("2025-11-20T23:21:04.962Z"),
            },
          ],
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.deepStrictEqual(
                selectManager.safeParse(scenarios[idx][0]),
                {
                  success: true,
                  data:
                    1 in scenarios[idx] ? scenarios[idx][1] : scenarios[idx][0],
                },
              ),
            ));
      });
      await suite("should throw", async () => {
        const id = randomUUID();
        const scenarios = [
          {},
          { id },
          { id, name: "", companyId: null },
          { id, name: "", companyId: null },
          { id, name: "", companyId: null, providerId: null },
          { id, name: "", companyId: null, providerId: null, age: null },
          {
            name: "",
            companyId: null,
            providerId: null,
            age: null,
            updatedAt: new Date(),
          },
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.partialDeepStrictEqual(
                selectManager.safeParse(scenarios[idx]),
                {
                  success: false,
                },
              ),
            ));
      });
    });
    await suite("INSERT schema", async () => {
      const insertManager = insertSchema(Managers);
      await test("should extract INSERT schema", (t: TestContext) => {
        t.assert.ok(insertManager);
        t.assert.ok(insertManager instanceof ZodObject);
        const shapeKeys = Object.keys(insertManager.shape);
        t.assert.deepStrictEqual(shapeKeys, [
          "id",
          "name",
          "companyId",
          "providerId",
          "age",
          "updatedAt",
        ]);
        t.assert.notDeepStrictEqual(shapeKeys, [
          "id",
          "name",
          "company_id",
          "provider_id",
          "age",
          "updated_at",
        ]);
      });
      await suite("should not throw", async () => {
        const id = randomUUID();
        const scenarios = [
          [
            {
              id,
              name: "Lex Luthor",
              companyId: null,
              providerId: "gd_sax:12345",
              age: null,
            },
          ],
          [
            {
              name: "Lex Luthor",
            },
          ],
          [
            {
              id,
              name: "Lex Luthor",
              companyId: randomUUID(),
              providerId: null,
              age: 50,
            },
          ],
          [
            {
              id,
              name: "Lex Luthor",
              companyId: null,
              providerId: "gd_sax:12345",
              age: null,
            },
            {
              id,
              name: "Lex Luthor",
              companyId: null,
              providerId: "gd_sax:12345",
              age: null,
            },
          ],
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.deepStrictEqual(
                insertManager.safeParse(scenarios[idx][0]),
                {
                  success: true,
                  data:
                    1 in scenarios[idx] ? scenarios[idx][1] : scenarios[idx][0],
                },
              ),
            ));
      });
      await suite("should throw", async () => {
        const id = randomUUID();
        const scenarios = [
          {},
          { id },
          { name: null },
          { id, companyId: null },
          { id, companyId: null },
          { id, companyId: null, providerId: null },
          { id, companyId: null, providerId: null, age: null },
          {
            id,
            name: "",
            companyId: null,
            providerId: null,
            age: null,
            updatedAt: new Date(),
          },
          {
            id,
            companyId: null,
            providerId: null,
            age: null,
            updatedAt: new Date(),
          },
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.partialDeepStrictEqual(
                insertManager.safeParse(scenarios[idx]),
                {
                  success: false,
                },
              ),
            ));
      });
      await suite("when throwOnForbiddenColumns is true", async () => {
        const insertManagerWithForbiddenColumns = insertSchema(Managers, {
          throwOnForbiddenColumns: true,
        });
        await test("should keep forbidden columns in the schema", (t: TestContext) => {
          t.assert.deepStrictEqual(
            Object.keys(insertManagerWithForbiddenColumns.shape).sort(),
            ["age", "companyId", "id", "name", "providerId", "updatedAt"],
          );
        });
        await test("should reject forbidden columns", (t: TestContext) =>
          t.assert.doesNotThrow(() =>
            t.assert.partialDeepStrictEqual(
              insertManagerWithForbiddenColumns.safeParse({
                name: "Lex Luthor",
                updatedAt: new Date(),
              }),
              {
                success: false,
              },
            ),
          ));
      });
      await suite("when throwOnForbiddenColumns is false", async () => {
        const insertManagerWithoutForbiddenColumns = insertSchema(Managers, {
          throwOnForbiddenColumns: false,
        });
        await test("should omit forbidden columns from the schema", (t: TestContext) => {
          t.assert.deepStrictEqual(
            Object.keys(insertManagerWithoutForbiddenColumns.shape).sort(),
            ["age", "companyId", "id", "name", "providerId"],
          );
        });
        await test("should ignore forbidden columns during parsing", (t: TestContext) =>
          t.assert.doesNotThrow(() =>
            t.assert.deepStrictEqual(
              insertManagerWithoutForbiddenColumns.safeParse({
                name: "Lex Luthor",
                updatedAt: new Date(),
              }),
              {
                success: true,
                data: { name: "Lex Luthor" },
              },
            ),
          ));
      });
    });
    await suite("UPDATE schema", async () => {
      const updateManager = updateSchema(Managers);
      await test("should extract UPDATE schema", (t: TestContext) => {
        t.assert.ok(updateManager);
        t.assert.ok(updateManager instanceof ZodObject);
        const shapeKeys = Object.keys(updateManager.shape);
        t.assert.deepStrictEqual(shapeKeys, [
          "id",
          "name",
          "companyId",
          "providerId",
          "age",
          "updatedAt",
        ]);
        t.assert.notDeepStrictEqual(shapeKeys, [
          "id",
          "name",
          "company_id",
          "provider_id",
          "age",
          "updated_at",
        ]);
      });
      await suite("should not throw", async () => {
        const scenarios = [
          {
            name: "Lex Luthor",
            companyId: randomUUID(),
            age: 50,
          },
          {
            companyId: randomUUID(),
            age: 50,
          },
          {
            name: "Lex Luthor",
            companyId: null,
            age: 50,
          },
          {
            name: "Lex Luthor",
            companyId: randomUUID(),
            age: null,
          },
          {
            companyId: null,
            age: 50,
          },
          {
            name: "Lex Luthor",
            companyId: null,
            age: null,
          },
          {
            companyId: null,
            age: null,
          },
          {
            name: "Lex Luthor",
            age: 50,
          },
          {
            name: "Lex Luthor",
            companyId: randomUUID(),
          },
          {
            age: 50,
          },
          {
            name: "Lex Luthor",
          },
          {},
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.deepStrictEqual(
                updateManager.safeParse(scenarios[idx]),
                {
                  success: true,
                  data: scenarios[idx],
                },
              ),
            ));
      });
      await suite("should throw", async () => {
        const id = randomUUID();
        const scenarios = [
          { id },
          { providerId: "pr-ovide-rid" },
          { updatedAt: new Date() },
          { updatedAt: "2025-11-20T23:21:04.962Z" },
          { name: null },
          { id, name: "Lex Luthor", companyId: randomUUID(), age: 50 },
          {
            providerId: "pr-ovide-rid",
            name: "Lex Luthor",
            companyId: randomUUID(),
            age: 50,
          },
          {
            updatedAt: new Date(),
            name: "Lex Luthor",
            companyId: randomUUID(),
            age: 50,
          },
          {
            updatedAt: "2025-11-20T23:21:04.962Z",
            name: "Lex Luthor",
            companyId: randomUUID(),
            age: 50,
          },
          {
            age: 50,
            name: "Lex Luthor",
            updatedAt: new Date(),
            companyId: randomUUID(),
            providerId: "pr-ovide-rid",
          },
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.partialDeepStrictEqual(
                updateManager.safeParse(scenarios[idx]),
                {
                  success: false,
                },
              ),
            ));
      });
      await suite("when throwOnForbiddenColumns is true", async () => {
        const updateManagerWithForbiddenColumns = updateSchema(Managers, {
          throwOnForbiddenColumns: true,
        });
        await test("should expose forbidden columns in the schema", (t: TestContext) => {
          t.assert.deepStrictEqual(
            Object.keys(updateManagerWithForbiddenColumns.shape).sort(),
            ["age", "companyId", "id", "name", "providerId", "updatedAt"],
          );
        });
        await test("should reject forbidden columns", (t: TestContext) =>
          t.assert.doesNotThrow(() =>
            t.assert.partialDeepStrictEqual(
              updateManagerWithForbiddenColumns.safeParse({
                id: randomUUID(),
                providerId: "gd_sax:12345",
                updatedAt: new Date(),
              }),
              {
                success: false,
              },
            ),
          ));
      });
      await suite("when throwOnForbiddenColumns is false", async () => {
        const updateManagerWithoutForbiddenColumns = updateSchema(Managers, {
          throwOnForbiddenColumns: false,
        });
        await test("should omit forbidden columns from the schema", (t: TestContext) => {
          t.assert.deepStrictEqual(
            Object.keys(updateManagerWithoutForbiddenColumns.shape).sort(),
            ["age", "companyId", "name"],
          );
        });
        await test("should strip forbidden columns during parsing", (t: TestContext) =>
          t.assert.doesNotThrow(() =>
            t.assert.deepStrictEqual(
              updateManagerWithoutForbiddenColumns.safeParse({
                name: "Lex Luthor",
                providerId: "gd_sax:12345",
                updatedAt: new Date(),
              }),
              {
                success: true,
                data: { name: "Lex Luthor" },
              },
            ),
          ));
        await test("should allow payloads containing only forbidden columns", (t: TestContext) =>
          t.assert.doesNotThrow(() =>
            t.assert.deepStrictEqual(
              updateManagerWithoutForbiddenColumns.safeParse({
                providerId: "gd_sax:12345",
                updatedAt: new Date(),
                id: randomUUID(),
              }),
              {
                success: true,
                data: {},
              },
            ),
          ));
      });
    });
  });
});

snapshot.setResolveSnapshotPath((p) =>
  join("tests", "snapshots", basename(p || "")),
);
