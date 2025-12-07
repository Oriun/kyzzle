import { custom, pgTable, selectSchema, type ToTableType } from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";
import { number, object, string } from "zod";

suite("UserDefined data type", async () => {
  const moneySchema = object({
    amount: number(),
    currency: string().length(3),
  });
  const Money = custom("finance.money", moneySchema);

  const Wallets = pgTable("finance.wallets", {
    balance: Money("balance").notNull(),
  });
  type WalletsTable = ToTableType<typeof Wallets>;

  await test("type inference", () => {
    type SelectRow = Selectable<WalletsTable>;
    const _validSelect: SelectRow[] = [
      { balance: { amount: 10, currency: "USD" } },
    ];
    // @ts-expect-error currency is required
    const _invalidSelect: SelectRow = { balance: { amount: 10 } };

    type InsertRow = Insertable<WalletsTable>;
    const _validInsert: InsertRow[] = [
      { balance: { amount: 20, currency: "EUR" } },
    ];
    // @ts-expect-error wrong type
    const _invalidInsert: InsertRow = { balance: null };

    type UpdateRow = Updateable<WalletsTable>;
    const _validUpdate: UpdateRow[] = [
      { balance: { amount: 15, currency: "GBP" } },
      {},
    ];
    // @ts-expect-error update payload must match schema
    const _invalidUpdate: UpdateRow = { balance: { currency: "JPY" } };

    const GeneratedWallets = pgTable("finance.generated_wallets", {
      balance: Money("balance")
        .notNull()
        .generatedAlwaysAs("calculate_balance()"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedWallets>>;
    const _validGeneratedSelect: GeneratedSelect[] = [
      { balance: { amount: 1, currency: "USD" } },
    ];
    // @ts-expect-error generated column still resolves to the schema
    const _invalidGeneratedSelect: GeneratedSelect = { balance: null };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedWallets>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    const _invalidGeneratedInsert: GeneratedInsert = {
      // @ts-expect-error generated column cannot be provided on insert
      balance: { amount: 1, currency: "USD" },
    };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedWallets>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    const _invalidGeneratedUpdate: GeneratedUpdate = {
      // @ts-expect-error generated column cannot be updated
      balance: { amount: 2, currency: "USD" },
    };

    const DefaultPrimaryWallets = pgTable("finance.default_primary_wallets", {
      balance: Money("balance")
        .primaryKey()
        .default({ amount: 0, currency: "USD" }),
    });
    type DefaultPrimaryInsert = Insertable<
      ToTableType<typeof DefaultPrimaryWallets>
    >;
    const _validDefaultPrimaryInsert: DefaultPrimaryInsert[] = [
      {},
      { balance: { amount: 10, currency: "EUR" } },
      { balance: null },
    ];
    const _invalidDefaultPrimaryInsert: DefaultPrimaryInsert = {
      // @ts-expect-error defaults expect object payloads or null, not strings
      balance: "oops",
    };

    const ImmutableWallets = pgTable("finance.immutable_wallets", {
      balance: Money("balance").immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableWallets>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    const _invalidImmutableUpdate: ImmutableUpdate = {
      // @ts-expect-error immutable column cannot be updated
      balance: { amount: 1, currency: "USD" },
    };

    const ArrayWalletsType = pgTable("finance.array_wallets_type", {
      balance: Money("balance").array(),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayWalletsType>>;
    const _validArraySelect: ArraySelect[] = [
      { balance: [{ amount: 1, currency: "USD" }, null] },
    ];
    const _invalidArraySelect: ArraySelect = {
      // @ts-expect-error must be an array of money payloads/nulls
      balance: { amount: 1, currency: "USD" },
    };
  });

  await suite("zod schema", async () => {
    const schema = selectSchema(Wallets);
    await test("accepts valid custom types", (t: TestContext) => {
      const payload = { balance: { amount: 30, currency: "CHF" } };
      t.assert.deepStrictEqual(schema.safeParse(payload), {
        success: true,
        data: payload,
      });
    });

    await test("rejects invalid custom types", (t: TestContext) => {
      const scenarios = [
        { balance: { amount: "high", currency: "USD" } },
        { balance: { amount: 30 } },
      ];
      for (const idx in scenarios)
        t.assert.partialDeepStrictEqual(
          schema.safeParse(scenarios[idx]),
          { success: false },
          `scenario #${idx}`,
        );
    });
  });

  await suite("modifiers ordering", async () => {
    const OrderedWallets = pgTable("finance.wallets_ordered", {
      balance: Money("balance")
        .default({ amount: 0, currency: "USD" })
        .unique()
        .immutable()
        .primaryKey(),
    });
    const ReorderedWallets = pgTable("finance.wallets_reordered", {
      balance: Money("balance")
        .primaryKey()
        .immutable()
        .default({ amount: 0, currency: "USD" })
        .unique(),
    });

    await test("base modifiers keep equivalent metadata", (t: TestContext) => {
      const shape = (type: (typeof OrderedWallets)["balance"]["type"]) => ({
        isPrimaryKey: type.isPrimaryKey,
        isUnique: type.isUnique,
        isImmutable: type.isImmutable,
        isNotNull: type.isNotNull,
        defaultExpression: type.defaultExpression,
      });

      t.assert.deepStrictEqual(
        shape(OrderedWallets.balance.type),
        shape(ReorderedWallets.balance.type),
      );
    });

    await test("array and override modifiers are honored", (t: TestContext) => {
      const ArrayWallets = pgTable("finance.wallet_arrays", {
        balance: Money("balance").array().notNull(),
      });
      const OverrideWallets = pgTable("finance.wallet_override", {
        balance: Money("balance").override((schema) =>
          schema.extend({ cents: number().optional() }),
        ),
      });
      const GeneratedWallets = pgTable("finance.wallet_generated", {
        balance: Money("balance").generatedAlwaysAs("calculate_balance()"),
      });
      const schema = selectSchema(OverrideWallets);
      t.assert.deepStrictEqual(
        schema.safeParse({
          balance: { amount: 1, currency: "USD", cents: 100 },
        }),
        {
          success: true,
          data: { balance: { amount: 1, currency: "USD", cents: 100 } },
        },
      );
      t.assert.partialDeepStrictEqual(
        schema.safeParse({ balance: { amount: 1 } }),
        { success: false },
      );

      t.assert.ok(ArrayWallets.balance.type.isArray);
      t.assert.strictEqual(ArrayWallets.balance.type.isNotNull, true);
      t.assert.ok(GeneratedWallets.balance.type.isImmutable);
      t.assert.strictEqual(
        GeneratedWallets.balance.type.generatedAlwaysExpression,
        "'calculate_balance()'",
      );
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual(Wallets.balance.type.pgType, "finance.money");
    t.assert.strictEqual(Wallets.balance.type.computeType(), "finance.money");
    t.assert.strictEqual(Wallets.balance.type.zodSchema, moneySchema);
  });
});
