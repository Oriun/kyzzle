import {
  bigint,
  integer,
  pgTable,
  selectSchema,
  smallInt,
  type ToTableType,
} from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";

suite("Integer data type", async () => {
  const Integers = pgTable("public.integers_checks", {
    value: integer("value").gt(1).lte(10).multipleOf(2).notNull(),
  });
  const SmallIntegers = pgTable("public.smallints_checks", {
    value: smallInt("value"),
  });
  const BigIntegers = pgTable("public.bigints_checks", {
    value: bigint("value"),
  });

  type IntegerTable = ToTableType<typeof Integers>;

  await test("type inference", () => {
    type SelectRow = Selectable<IntegerTable>;
    const _validSelect: SelectRow[] = [{ value: 2 }, { value: 10 }];
    // @ts-expect-error null is not allowed on a not-null column
    const _invalidSelect: SelectRow = { value: null };

    type InsertRow = Insertable<IntegerTable>;
    const _validInsert: InsertRow[] = [{ value: 4 }];
    // @ts-expect-error value is required on insert
    const _missingInsert: InsertRow = {};
    // @ts-expect-error only numbers are accepted
    const _invalidInsert: InsertRow = { value: "7" };

    type UpdateRow = Updateable<IntegerTable>;
    const _validUpdate: UpdateRow[] = [{ value: 8 }, {}];
    // @ts-expect-error must stay numeric on updates too
    const _invalidUpdate: UpdateRow = { value: "3" };

    const GeneratedIntegers = pgTable("public.generated_integers", {
      value: integer("value").notNull().generatedAlwaysAs("10"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedIntegers>>;
    const _validGeneratedSelect: GeneratedSelect[] = [{ value: 1 }];
    // @ts-expect-error generated column still resolves to number
    const _invalidGeneratedSelect: GeneratedSelect = { value: null };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedIntegers>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    // @ts-expect-error generated column cannot be provided on insert
    const _invalidGeneratedInsert: GeneratedInsert = { value: 4 };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedIntegers>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    // @ts-expect-error generated column cannot be updated
    const _invalidGeneratedUpdate: GeneratedUpdate = { value: 5 };

    const DefaultPrimary = pgTable("public.default_primary_integers", {
      id: integer("id").primaryKey().default(1),
    });
    type DefaultPrimaryInsert = Insertable<ToTableType<typeof DefaultPrimary>>;
    const _validDefaultPrimaryInsert: DefaultPrimaryInsert[] = [
      {},
      { id: 2 },
      { id: null },
    ];
    // @ts-expect-error defaults expect numeric or null, not strings
    const _invalidDefaultPrimaryInsert: DefaultPrimaryInsert = { id: "3" };

    const ImmutableIntegers = pgTable("public.immutable_integers", {
      value: integer("value").immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableIntegers>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    // @ts-expect-error immutable column cannot be updated
    const _invalidImmutableUpdate: ImmutableUpdate = { value: 9 };

    const ArrayIntegers = pgTable("public.array_integers", {
      value: integer("value").array(),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayIntegers>>;
    const _validArraySelect: ArraySelect[] = [{ value: [1, null] }];
    // @ts-expect-error must be an array of numbers/nulls
    const _invalidArraySelect: ArraySelect = { value: 1 };
  });

  await suite("zod schema", async () => {
    const selectInteger = selectSchema(Integers);
    await test("accepts valid values", (t: TestContext) => {
      const scenario = { value: 8 };
      t.assert.deepStrictEqual(selectInteger.safeParse(scenario), {
        success: true,
        data: scenario,
      });
    });

    await test("rejects invalid values", (t: TestContext) => {
      const scenarios = [{ value: 1 }, { value: 11 }, { value: 3 }];
      for (const idx in scenarios)
        t.assert.partialDeepStrictEqual(
          selectInteger.safeParse(scenarios[idx]),
          { success: false },
          `scenario #${idx}`,
        );
    });
  });

  await suite("modifiers ordering", async () => {
    const OrderedIntegers = pgTable("public.integers_modifiers_ordered", {
      value: integer("value").default(3).unique().immutable().primaryKey(),
    });
    const ReorderedIntegers = pgTable("public.integers_modifiers_reordered", {
      value: integer("value").primaryKey().immutable().unique().default(3),
    });

    await test("base modifiers keep the same metadata", (t: TestContext) => {
      const shape = (type: (typeof OrderedIntegers)["value"]["type"]) => ({
        isPrimaryKey: type.isPrimaryKey,
        isNotNull: type.isNotNull,
        isUnique: type.isUnique,
        isImmutable: type.isImmutable,
        defaultExpression: type.defaultExpression,
      });
      t.assert.deepStrictEqual(
        shape(OrderedIntegers.value.type),
        shape(ReorderedIntegers.value.type),
      );
    });

    await test("captures every bound modifier", (t: TestContext) => {
      const value = integer("value").gt(1).lt(9).gte(2).lte(8).multipleOf(3);

      t.assert.strictEqual((value as any).minExclusive, 1);
      t.assert.strictEqual((value as any).maxExclusive, 9);
      t.assert.strictEqual((value as any).minInclusive, 2);
      t.assert.strictEqual((value as any).maxInclusive, 8);
      t.assert.strictEqual((value as any).divisibleBy, 3);
    });

    await test("sign helpers respect call order", (t: TestContext) => {
      const positiveThenLt = integer("value").positive().lt(3);
      const ltThenPositive = integer("value").lt(3).positive();
      const negativeThenGte = integer("value").negative().gte(-5);
      const nonnegativeThenLte = integer("value").nonnegative().lte(6);

      t.assert.strictEqual((positiveThenLt as any).minExclusive, 0);
      t.assert.strictEqual((positiveThenLt as any).maxExclusive, 3);

      t.assert.strictEqual((ltThenPositive as any).minExclusive, 0);
      t.assert.strictEqual((ltThenPositive as any).maxExclusive, undefined);

      t.assert.strictEqual((negativeThenGte as any).maxExclusive, 0);
      t.assert.strictEqual((negativeThenGte as any).minInclusive, -5);

      t.assert.strictEqual((nonnegativeThenLte as any).minInclusive, 0);
      t.assert.strictEqual((nonnegativeThenLte as any).maxInclusive, 6);
    });

    await test("array, override, and generated modifiers combine", (t: TestContext) => {
      const ArrayIntegers = pgTable("public.integers_array_first", {
        values: integer("values").array().notNull(),
      });
      const OverrideIntegers = pgTable("public.integers_override", {
        value: integer("value").override((schema) => schema.gte(0).lte(5)),
      });
      const GeneratedIntegers = pgTable("public.integers_generated", {
        value: integer("value").generatedAlwaysAs("floor(random() * 10)"),
      });

      const schema = selectSchema(OverrideIntegers);
      t.assert.deepStrictEqual(schema.safeParse({ value: 3 }), {
        success: true,
        data: { value: 3 },
      });
      t.assert.partialDeepStrictEqual(schema.safeParse({ value: 9 }), {
        success: false,
      });

      t.assert.ok(ArrayIntegers.values.type.isArray);
      t.assert.strictEqual(ArrayIntegers.values.type.isNotNull, true);

      t.assert.ok(GeneratedIntegers.value.type.isImmutable);
      t.assert.strictEqual(
        GeneratedIntegers.value.type.generatedAlwaysExpression,
        "'floor(random() * 10)'",
      );
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual((Integers.value.type as any).minExclusive, 1);
    t.assert.strictEqual((Integers.value.type as any).maxInclusive, 10);
    t.assert.strictEqual((Integers.value.type as any).divisibleBy, 2);
    t.assert.strictEqual(Integers.value.type.computeType(), "integer");
    t.assert.strictEqual(SmallIntegers.value.type.computeType(), "smallint");
    t.assert.strictEqual(BigIntegers.value.type.computeType(), "bigint");
  });
});
