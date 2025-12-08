import {
  array,
  numeric,
  pgTable,
  selectSchema,
  type ToTableType,
} from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";

suite("Numeric data type", async () => {
  const NumericValues = pgTable("public.numeric_checks", {
    amount: numeric("amount", { precision: 8, scale: 2 })
      .positive()
      .lt(100)
      .multipleOf(0.5)
      .notNull(),
  });
  type NumericTable = ToTableType<typeof NumericValues>;

  await test("type inference", () => {
    type SelectRow = Selectable<NumericTable>;
    const _validSelect: SelectRow[] = [{ amount: 50 }, { amount: 1 }];
    // @ts-expect-error number required on select
    const _invalidSelect: SelectRow = { amount: "5" };

    type InsertRow = Insertable<NumericTable>;
    const _validInsert: InsertRow[] = [{ amount: 75.5 }];
    // @ts-expect-error insert expects a number
    const _invalidInsert: InsertRow = { amount: null };

    type UpdateRow = Updateable<NumericTable>;
    const _validUpdate: UpdateRow[] = [{ amount: 2.5 }, {}];
    // @ts-expect-error wrong type on update
    const _invalidUpdate: UpdateRow = { amount: "2.5" };

    const GeneratedNumeric = pgTable("public.generated_numeric", {
      amount: numeric("amount").notNull().generatedAlwaysAs("1.23"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedNumeric>>;
    const _validGeneratedSelect: GeneratedSelect[] = [{ amount: 1 }];
    // @ts-expect-error generated column still surfaces as number
    const _invalidGeneratedSelect: GeneratedSelect = { amount: null };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedNumeric>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    // @ts-expect-error generated column cannot be provided on insert
    const _invalidGeneratedInsert: GeneratedInsert = { amount: 2 };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedNumeric>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    // @ts-expect-error generated column cannot be updated
    const _invalidGeneratedUpdate: GeneratedUpdate = { amount: 3 };

    const DefaultPrimary = pgTable("public.default_primary_numeric", {
      id: numeric("id").primaryKey().default(1),
    });
    type DefaultPrimaryInsert = Insertable<ToTableType<typeof DefaultPrimary>>;
    const _validDefaultPrimaryInsert: DefaultPrimaryInsert[] = [{}, { id: 2 }];
    // @ts-expect-error defaults expect numeric or null, not strings
    const _invalidDefaultPrimaryInsert: DefaultPrimaryInsert = { id: "3" };
    // @ts-expect-error null cannot be provided when a default exists
    const _nullDefaultPrimaryInsert: DefaultPrimaryInsert = { id: null };

    const ImmutableNumeric = pgTable("public.immutable_numeric", {
      amount: numeric("amount").immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableNumeric>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    // @ts-expect-error immutable column cannot be updated
    const _invalidImmutableUpdate: ImmutableUpdate = { amount: 4 };

    const ArrayNumeric = pgTable("public.array_numeric", {
      amount: array(numeric("amount")),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayNumeric>>;
    const _validArraySelect: ArraySelect[] = [{ amount: [1, null] }];
    // @ts-expect-error must be an array of numbers/nulls
    const _invalidArraySelect: ArraySelect = { amount: 1 };
  });

  await suite("zod schema", async () => {
    const schema = selectSchema(NumericValues);
    await test("accepts valid numeric payloads", (t: TestContext) => {
      t.assert.deepStrictEqual(schema.safeParse({ amount: 50.5 }), {
        success: true,
        data: { amount: 50.5 },
      });
    });

    await test("rejects values outside constraints", (t: TestContext) => {
      const scenarios = [{ amount: -1 }, { amount: 100 }, { amount: 0.3 }];
      for (const idx in scenarios)
        t.assert.partialDeepStrictEqual(
          schema.safeParse(scenarios[idx]),
          { success: false },
          `scenario #${idx}`,
        );
    });
  });

  await suite("modifiers ordering", async () => {
    const OrderedNumeric = pgTable("public.numeric_modifiers_ordered", {
      amount: numeric("amount", { precision: 6, scale: 2 })
        .default(1.5)
        .unique()
        .immutable()
        .primaryKey(),
    });
    const ReorderedNumeric = pgTable("public.numeric_modifiers_reordered", {
      amount: numeric("amount", { precision: 6, scale: 2 })
        .primaryKey()
        .immutable()
        .unique()
        .default(1.5),
    });

    await test("base modifiers keep the same metadata", (t: TestContext) => {
      const shape = (type: (typeof OrderedNumeric)["amount"]["type"]) => ({
        isPrimaryKey: type.isPrimaryKey,
        isNotNull: type.isNotNull,
        isUnique: type.isUnique,
        isImmutable: type.isImmutable,
        defaultExpression: type.defaultExpression,
        precision: (type as any).precision,
        scale: (type as any).scale,
      });
      t.assert.deepStrictEqual(
        shape(OrderedNumeric.amount.type),
        shape(ReorderedNumeric.amount.type),
      );
    });

    await test("captures every bound modifier", (t: TestContext) => {
      const value = numeric("amount")
        .gt(0)
        .lt(9)
        .gte(1)
        .lte(8)
        .multipleOf(0.25);

      t.assert.strictEqual((value as any).minExclusive, 0);
      t.assert.strictEqual((value as any).maxExclusive, 9);
      t.assert.strictEqual((value as any).minInclusive, 1);
      t.assert.strictEqual((value as any).maxInclusive, 8);
      t.assert.strictEqual((value as any).divisibleBy, 0.25);
    });

    await test("sign helpers respect call order", (t: TestContext) => {
      const positiveThenLt = numeric("amount").positive().lt(3);
      const ltThenPositive = numeric("amount").lt(3).positive();
      const negativeThenGte = numeric("amount").negative().gte(-5);
      const nonpositiveThenGte = numeric("amount").nonpositive().gte(-2);

      t.assert.strictEqual((positiveThenLt as any).minExclusive, 0);
      t.assert.strictEqual((positiveThenLt as any).maxExclusive, 3);

      t.assert.strictEqual((ltThenPositive as any).minExclusive, 0);
      t.assert.strictEqual((ltThenPositive as any).maxExclusive, undefined);

      t.assert.strictEqual((negativeThenGte as any).maxExclusive, 0);
      t.assert.strictEqual((negativeThenGte as any).minInclusive, -5);

      t.assert.strictEqual((nonpositiveThenGte as any).maxInclusive, 0);
      t.assert.strictEqual((nonpositiveThenGte as any).minInclusive, -2);
    });

    await test("array, override, and generated modifiers", (t: TestContext) => {
      const ArrayNumerics = pgTable("public.numeric_array_first", {
        amounts: array(numeric("amounts")).notNull(),
      });
      const OverrideNumerics = pgTable("public.numeric_override", {
        amount: numeric("amount").override((schema) => schema.lte(2)),
      });
      const GeneratedNumerics = pgTable("public.numeric_generated", {
        amount: numeric("amount").generatedAlwaysAs("1.23"),
      });

      const schema = selectSchema(OverrideNumerics);
      t.assert.deepStrictEqual(schema.safeParse({ amount: 1.5 }), {
        success: true,
        data: { amount: 1.5 },
      });
      t.assert.partialDeepStrictEqual(schema.safeParse({ amount: 3 }), {
        success: false,
      });

      t.assert.ok(ArrayNumerics.amounts.type.isArray);
      t.assert.strictEqual(ArrayNumerics.amounts.type.isNotNull, true);

      t.assert.ok(GeneratedNumerics.amount.type.isImmutable);
      t.assert.strictEqual(
        GeneratedNumerics.amount.type.generatedAlwaysExpression,
        "'1.23'",
      );
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    const type = NumericValues.amount.type as any;
    t.assert.strictEqual(type.precision, 8);
    t.assert.strictEqual(type.scale, 2);
    t.assert.strictEqual(type.minExclusive, 0);
    t.assert.strictEqual(type.maxExclusive, 100);
    t.assert.strictEqual(type.divisibleBy, 0.5);
    t.assert.strictEqual(type.computeType(), "numeric(8, 2)");
  });
});
