import {
  array,
  bool,
  insertSchema,
  pgTable,
  selectSchema,
  updateSchema,
  type ToTableType,
} from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";

suite("Boolean data type", async () => {
  const Flags = pgTable("public.flags_checks", {
    active: bool("active").notNull().default(true),
  });

  type FlagsTable = ToTableType<typeof Flags>;

  await test("type inference", () => {
    type SelectRow = Selectable<FlagsTable>;
    const _validSelect: SelectRow[] = [{ active: true }, { active: false }];
    // @ts-expect-error not null on select
    const _invalidSelect: SelectRow = { active: null };

    type InsertRow = Insertable<FlagsTable>;
    const _validInsert: InsertRow[] = [{}, { active: false }];
    // @ts-expect-error invalid type on insert
    const _invalidInsert: InsertRow = { active: "no" };

    type UpdateRow = Updateable<FlagsTable>;
    const _validUpdate: UpdateRow[] = [{ active: true }, {}];
    // @ts-expect-error updates must keep boolean type
    const _invalidUpdate: UpdateRow = { active: "nope" };

    const GeneratedFlags = pgTable("public.flags_generated", {
      active: bool("active").notNull().generatedAlwaysAs("CURRENT_TIMESTAMP"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedFlags>>;
    const _validGeneratedSelect: GeneratedSelect[] = [{ active: true }];
    // @ts-expect-error generated boolean still resolves to boolean on select
    const _invalidGeneratedSelect: GeneratedSelect = { active: "yes" };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedFlags>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    // @ts-expect-error generated column cannot be inserted manually
    const _invalidGeneratedInsert: GeneratedInsert = { active: false };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedFlags>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    // @ts-expect-error generated column cannot be updated
    const _invalidGeneratedUpdate: GeneratedUpdate = { active: true };

    const ArrayFlags = pgTable("public.flags_array", {
      active: array(bool("active")).notNull(),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayFlags>>;
    const _validArraySelect: ArraySelect[] = [{ active: [true, null] }];
    const _invalidArraySelect: ArraySelect = {
      // @ts-expect-error must provide an array of booleans/nulls
      active: true,
    };
  });

  await suite("zod schema", async () => {
    const selectFlag = selectSchema(Flags);
    await test("select schema parsing", (t: TestContext) => {
      t.assert.deepStrictEqual(selectFlag.safeParse({ active: true }), {
        success: true,
        data: { active: true },
      });
      t.assert.partialDeepStrictEqual(selectFlag.safeParse({ active: null }), {
        success: false,
      });
    });

    const insertFlag = insertSchema(Flags);
    await test("insert schema honours default", (t: TestContext) => {
      t.assert.deepStrictEqual(insertFlag.safeParse({}), {
        success: true,
        data: {},
      });
      t.assert.partialDeepStrictEqual(insertFlag.safeParse({ active: "yes" }), {
        success: false,
      });
    });

    const updateFlag = updateSchema(Flags);
    await test("update schema keeps boolean", (t: TestContext) => {
      t.assert.deepStrictEqual(updateFlag.safeParse({ active: false }), {
        success: true,
        data: { active: false },
      });
      t.assert.partialDeepStrictEqual(
        updateFlag.safeParse({ active: "wrong" }),
        { success: false },
      );
    });
  });

  await suite("modifiers ordering", async () => {
    const OrderedFlags = pgTable("public.flags_modifiers_ordered", {
      active: bool("active").default(true).unique().immutable().primaryKey(),
    });
    const ReorderedFlags = pgTable("public.flags_modifiers_reordered", {
      active: bool("active").immutable().primaryKey().default(true).unique(),
    });

    await test("base modifiers keep equivalent metadata", (t: TestContext) => {
      const shape = (activeType: (typeof OrderedFlags)["active"]["type"]) => ({
        isPrimaryKey: activeType.isPrimaryKey,
        isNotNull: activeType.isNotNull,
        isUnique: activeType.isUnique,
        isImmutable: activeType.isImmutable,
        defaultExpression: activeType.defaultExpression,
      });
      t.assert.deepStrictEqual(
        shape(OrderedFlags.active.type),
        shape(ReorderedFlags.active.type),
      );
    });

    await test("override and generated modifiers plug into schemas", (t: TestContext) => {
      const OverriddenFlags = pgTable("public.bool_override", {
        active: bool("active")
          .notNull()
          .override((schema) => schema.default(false)),
      });
      const GeneratedFlags = pgTable("public.bool_generated", {
        active: bool("active").generatedAlwaysAs("CURRENT_TIMESTAMP"),
      });

      const schema = selectSchema(OverriddenFlags);

      t.assert.deepStrictEqual(schema.safeParse({}), {
        success: true,
        data: { active: false },
      });

      t.assert.strictEqual(
        GeneratedFlags.active.type.generatedAlwaysExpression,
        "CURRENT_TIMESTAMP",
      );
      t.assert.ok(GeneratedFlags.active.type.isImmutable);
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual(Flags.active.type.pgType, "boolean");
    t.assert.ok(Flags.active.type.isNotNull);
    t.assert.strictEqual(Flags.active.type.defaultExpression, true);
  });
});
