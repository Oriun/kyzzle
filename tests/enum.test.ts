import {
  DataType,
  insertSchema,
  pgEnumType,
  pgTable,
  selectSchema,
  text,
  updateSchema,
  uuid,
  type KyselyTables,
} from "kyzzle_test";
import { randomBytes, randomUUID } from "node:crypto";
import { suite, test, type TestContext } from "node:test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { type output } from "zod";

suite("Create Enum", async () => {
  await suite("should not throw", async () => {
    const randStr = randomBytes(4).toString("hex");
    const scenarios = [
      ["public.colors", ["RED", "BLUE"] as const],
      ["services.roles", { ADMIN: "ADMIN", USER: "USER" } as const],
      ["domain.random", { [randStr]: randStr }],
    ] as Parameters<typeof pgEnumType>[];
    for (const idx in scenarios)
      await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
        t.assert.doesNotThrow(() => pgEnumType(...scenarios[idx])));
  });

  await suite("should throw", async () => {
    const scenarios = [
      [],
      ["without_schema", ["A"] as const],
      ["public.empty", [] as const],
      ["public.empty_object", {} as const],
      ["public", { ACTIVE: "ACTIVE" } as const],
    ] as const;
    for (const idx in scenarios)
      await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
        // @ts-expect-error
        t.assert.throws(() => pgEnumType(...scenarios[idx])));
  });

  await suite("should expose metadata and zod behavior", async () => {
    const PaymentStates = pgEnumType("billing.payment_state", {
      CREATED: "CREATED",
      CAPTURED: "CAPTURED",
      FAILED: "FAILED",
    } as const);

    await test("metadata", (t: TestContext) => {
      t.assert.strictEqual(PaymentStates.enumName, "billing.payment_state");
      t.assert.deepStrictEqual(PaymentStates.values, [
        "CREATED",
        "CAPTURED",
        "FAILED",
      ]);

      const column = PaymentStates("state");
      t.assert.ok(column instanceof DataType);
      t.assert.strictEqual(column.pgType, "billing.payment_state");
      t.assert.strictEqual(column.name, "state");
    });

    await test("zod", (t: TestContext) => {
      const column = PaymentStates("state");
      t.assert.deepStrictEqual(column.zodSchema.safeParse("CREATED"), {
        success: true,
        data: "CREATED",
      });
      t.assert.deepStrictEqual(column.zodSchema.safeParse(null), {
        success: true,
        data: null,
      });
      t.assert.partialDeepStrictEqual(column.zodSchema.safeParse("UNKNOWN"), {
        success: false,
      });
    });
  });

  await suite("type inference", async () => {
    const Roles = pgEnumType("auth.roles", ["ADMIN", "MEMBER"] as const);
    const NullableRole = Roles("nullable_role");
    const NonNullableRole = Roles("role").notNull();

    await test("enum values inference", () => {
      type RoleTuple = typeof Roles.values;
      type RoleValues = RoleTuple[number];
      const _tuple: RoleTuple = ["ADMIN", "MEMBER"];
      // @ts-expect-error
      const _tupleWithoutValues: RoleTuple = [];
      const _validRoles: RoleValues[] = ["ADMIN", "MEMBER"];
      // @ts-expect-error
      const _invalidRole: RoleValues = "OWNER";
    });

    await test("nullable column output inference", () => {
      type NullableRoleOutput = output<(typeof NullableRole)["zodSchema"]>;
      const _nullableValues: NullableRoleOutput[] = ["ADMIN", "MEMBER", null];
      // @ts-expect-error
      const _invalidNullable: NullableRoleOutput = "OWNER";
    });

    await test("non-nullable column output inference", () => {
      type NonNullableRoleOutput = output<
        (typeof NonNullableRole)["zodSchema"]
      >;
      const _nonNullableValues: NonNullableRoleOutput[] = ["ADMIN", "MEMBER"];
      // @ts-expect-error
      const _nullNonNullable: NonNullableRoleOutput = null;
    });
  });

  await suite("integration with pgTable", async () => {
    const Roles = pgEnumType("auth.roles", ["ADMIN", "MEMBER"] as const);
    const Statuses = pgEnumType("auth.statuses", {
      ACTIVE: "ACTIVE",
      DISABLED: "DISABLED",
    } as const);
    const Users = pgTable("auth.users", {
      id: uuid("id").primaryKey().notNull(),
      email: text("email").notNull(),
      role: Roles("role").notNull(),
      status: Statuses("status").notNull().default("ACTIVE"),
      legacyStatus: Statuses("legacy_status"),
    });
    const Tables = { Users };
    type DB = KyselyTables<typeof Tables>;

    await suite("should infer Kysely types", async () => {
      await test("SELECT", () => {
        type UserRow = Selectable<DB["auth.users"]>;
        const _validRows: UserRow[] = [
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            status: "ACTIVE",
            legacyStatus: null,
          },
          {
            id: randomUUID(),
            email: "super@man.com",
            role: "MEMBER",
            status: "DISABLED",
            legacyStatus: "ACTIVE",
          },
        ];
        const _invalidRow: UserRow = {
          id: randomUUID(),
          email: "bad@role.com",
          // @ts-expect-error
          role: "OWNER",
          status: "ACTIVE",
          legacyStatus: null,
        };
      });

      await test("INSERT", () => {
        type UserInsert = Insertable<DB["auth.users"]>;
        const _validInsert: UserInsert[] = [
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "MEMBER",
            status: "DISABLED",
            legacyStatus: null,
          },
        ];
        const _invalidInsert: UserInsert[] = [
          // @ts-expect-error
          { id: randomUUID(), email: "lex@luthor.com" },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            // @ts-expect-error
            status: "PAUSED",
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            // @ts-expect-error
            role: null,
          },
        ];
      });

      await test("UPDATE", () => {
        type UserUpdate = Updateable<DB["auth.users"]>;
        const _validUpdates: UserUpdate[] = [
          { role: "ADMIN" },
          { status: "DISABLED" },
          { legacyStatus: null },
          {},
        ];
        const _invalidUpdates: UserUpdate[] = [
          {
            // @ts-expect-error
            status: "PAUSED",
          },
          {
            // @ts-expect-error
            role: "OWNER",
          },
        ];
      });
    });

    await suite("SELECT schema", async () => {
      const selectUser = selectSchema(Users);
      await test("should parse valid values", (t: TestContext) => {
        const scenarios = [
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            status: "ACTIVE",
            legacyStatus: null,
          },
          {
            id: randomUUID(),
            email: "super@man.com",
            role: "MEMBER",
            status: "DISABLED",
            legacyStatus: "ACTIVE",
          },
        ] as const;
        for (const idx in scenarios)
          t.assert.doesNotThrow(() =>
            t.assert.deepStrictEqual(selectUser.safeParse(scenarios[idx]), {
              success: true,
              data: scenarios[idx],
            }),
          );
      });

      await test("should reject invalid values", (t: TestContext) => {
        const scenarios = [
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            status: "PAUSED",
            legacyStatus: null,
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "OWNER",
            status: "ACTIVE",
            legacyStatus: null,
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            status: null,
            legacyStatus: null,
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            status: "ACTIVE",
            legacyStatus: "PAUSED",
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            status: "ACTIVE",
            legacyStatus: null,
            role: undefined,
          },
        ] as const;
        for (const idx in scenarios)
          t.assert.doesNotThrow(() =>
            t.assert.partialDeepStrictEqual(
              selectUser.safeParse(scenarios[idx]),
              { success: false },
            ),
          );
      });
    });

    await suite("INSERT schema", async () => {
      const insertUser = insertSchema(Users);
      await test("should parse valid values", (t: TestContext) => {
        const scenarios = [
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "MEMBER",
            status: "DISABLED",
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            legacyStatus: null,
          },
        ] as const;
        for (const idx in scenarios)
          t.assert.doesNotThrow(() =>
            t.assert.deepStrictEqual(insertUser.safeParse(scenarios[idx]), {
              success: true,
              data: scenarios[idx],
            }),
          );
      });

      await test("should reject invalid values", (t: TestContext) => {
        const scenarios = [
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "OWNER",
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            status: null,
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            role: "ADMIN",
            status: "PAUSED",
          },
          {
            id: randomUUID(),
            email: "lex@luthor.com",
            status: "ACTIVE",
          },
        ] as const;
        for (const idx in scenarios)
          t.assert.doesNotThrow(() =>
            t.assert.partialDeepStrictEqual(
              insertUser.safeParse(scenarios[idx]),
              { success: false },
            ),
          );
      });
    });

    await suite("UPDATE schema", async () => {
      const updateUser = updateSchema(Users);
      await test("should parse valid values", (t: TestContext) => {
        const scenarios = [
          { role: "ADMIN" },
          { status: "ACTIVE" },
          { legacyStatus: "ACTIVE" },
          { legacyStatus: null },
          {},
        ] as const;
        for (const idx in scenarios)
          t.assert.doesNotThrow(() =>
            t.assert.deepStrictEqual(updateUser.safeParse(scenarios[idx]), {
              success: true,
              data: scenarios[idx],
            }),
          );
      });

      await test("should reject invalid values", (t: TestContext) => {
        const scenarios = [
          {
            role: "OWNER",
          },
          {
            status: null,
          },
          {
            status: "PAUSED",
          },
        ] as const;
        for (const idx in scenarios)
          t.assert.doesNotThrow(() =>
            t.assert.partialDeepStrictEqual(
              updateUser.safeParse(scenarios[idx]),
              { success: false },
            ),
          );
      });
    });
  });
});
