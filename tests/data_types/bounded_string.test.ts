import {
  array,
  char,
  pgTable,
  selectSchema,
  type ToTableType,
} from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";
import { string } from "zod";

suite("BoundedString data type", async () => {
  const Codes = pgTable("public.bounded_codes", {
    code: char("code", { length: 5 })
      .regex(/^[A-Z]{5}$/)
      .notNull(),
  });
  type CodesTable = ToTableType<typeof Codes>;

  await test("type inference", () => {
    type SelectRow = Selectable<CodesTable>;
    const _validSelect: SelectRow[] = [{ code: "ABCDE" }];
    // @ts-expect-error not null and must stay a string
    const _invalidSelect: SelectRow = { code: null };

    type InsertRow = Insertable<CodesTable>;
    const _validInsert: InsertRow[] = [{ code: "ZZZZZ" }];
    // @ts-expect-error wrong type
    const _invalidInsert: InsertRow = { code: 12345 };

    type UpdateRow = Updateable<CodesTable>;
    const _validUpdate: UpdateRow[] = [{ code: "HELLO" }, {}];
    // @ts-expect-error wrong shape
    const _invalidUpdate: UpdateRow = { code: ["ARRAY"] };

    const GeneratedCodes = pgTable("public.generated_codes_type", {
      code: char("code", { length: 3 })
        .notNull()
        .generatedAlwaysAs("upper('abc')"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedCodes>>;
    const _validGeneratedSelect: GeneratedSelect[] = [{ code: "ABC" }];
    // @ts-expect-error generated column still resolves to string
    const _invalidGeneratedSelect: GeneratedSelect = { code: null };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedCodes>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    // @ts-expect-error generated column cannot be inserted manually
    const _invalidGeneratedInsert: GeneratedInsert = { code: "ABC" };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedCodes>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    // @ts-expect-error generated column cannot be updated
    const _invalidGeneratedUpdate: GeneratedUpdate = { code: "XYZ" };

    const DefaultPrimaryCodes = pgTable("public.default_primary_codes", {
      code: char("code", { length: 2 }).primaryKey().default("AA"),
    });
    type DefaultPrimaryInsert = Insertable<
      ToTableType<typeof DefaultPrimaryCodes>
    >;
    const _validDefaultPrimaryInsert: DefaultPrimaryInsert[] = [
      {},
      { code: "BB" },
    ];
    // @ts-expect-error null cannot be used when a default is present
    const _nullDefaultPrimaryInsert: DefaultPrimaryInsert = { code: null };
    // @ts-expect-error defaults expect strings or null, not numbers
    const _invalidDefaultPrimaryInsert: DefaultPrimaryInsert = { code: 1 };

    const ImmutableCodes = pgTable("public.immutable_codes", {
      code: char("code", { length: 2 }).immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableCodes>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    // @ts-expect-error immutable column cannot be updated
    const _invalidImmutableUpdate: ImmutableUpdate = { code: "CC" };

    const ArrayCodes = pgTable("public.array_codes", {
      code: array(char("code", { length: 2 })),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayCodes>>;
    const _validArraySelect: ArraySelect[] = [{ code: ["AA", null] }];
    // @ts-expect-error must be an array of strings/nulls
    const _invalidArraySelect: ArraySelect = { code: "AA" };
  });

  await suite("zod schema", async () => {
    const schema = selectSchema(Codes);
    await test("accepts matching values", (t: TestContext) => {
      t.assert.deepStrictEqual(schema.safeParse({ code: "ABCDE" }), {
        success: true,
        data: { code: "ABCDE" },
      });
    });

    await test("rejects pattern mismatches", (t: TestContext) => {
      const scenarios = [{ code: "abcde" }, { code: "FOUR" }];
      for (const idx in scenarios)
        t.assert.partialDeepStrictEqual(
          schema.safeParse(scenarios[idx]),
          { success: false },
          `scenario #${idx}`,
        );
    });
  });

  await suite("modifiers ordering", async () => {
    const OrderedCodes = pgTable("public.bounded_codes_ordered", {
      code: char("code", { length: 4 })
        .regex(/^[A-Z]{4}$/)
        .default("ABCD")
        .unique()
        .immutable()
        .primaryKey(),
    });
    const ReorderedCodes = pgTable("public.bounded_codes_reordered", {
      code: char("code", { length: 4 })
        .primaryKey()
        .default("ABCD")
        .immutable()
        .unique()
        .regex(/^[A-Z]{4}$/),
    });

    await test("base modifiers stay stable regardless of chaining order", (t: TestContext) => {
      const shape = (type: (typeof OrderedCodes)["code"]["type"]) => ({
        length: (type as any).length,
        pattern: (type as any).pattern,
        isPrimaryKey: type.isPrimaryKey,
        isUnique: type.isUnique,
        isNotNull: type.isNotNull,
        isImmutable: type.isImmutable,
        defaultExpression: type.defaultExpression,
      });

      t.assert.deepStrictEqual(
        shape(OrderedCodes.code.type),
        shape(ReorderedCodes.code.type),
      );
    });

    await test("override and generated modifiers work together", (t: TestContext) => {
      const OverrideCodes = pgTable("public.override_codes", {
        code: char("code", { length: 3 }).override(() =>
          string()
            .length(3)
            .regex(/^[a-z]{3}$/),
        ),
      });
      const GeneratedCodes = pgTable("public.generated_codes", {
        code: char("code", { length: 2 }).generatedAlwaysAs("upper('ab')"),
      });

      const schema = selectSchema(OverrideCodes);
      t.assert.deepStrictEqual(schema.safeParse({ code: "abc" }), {
        success: true,
        data: { code: "abc" },
      });
      t.assert.partialDeepStrictEqual(schema.safeParse({ code: "ABC" }), {
        success: false,
      });

      t.assert.ok(GeneratedCodes.code.type.isImmutable);
      t.assert.strictEqual(
        GeneratedCodes.code.type.generatedAlwaysExpression,
        "'upper('ab')'",
      );
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual((Codes.code.type as any).length, 5);
    t.assert.deepStrictEqual((Codes.code.type as any).pattern, /^[A-Z]{5}$/);
    t.assert.strictEqual(Codes.code.type.computeType(), "char(5)");
  });
});
