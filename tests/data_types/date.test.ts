import { date, pgTable, selectSchema, type ToTableType } from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";

suite("PgDate data type", async () => {
  const Events = pgTable("public.simple_events", {
    happenedOn: date("happened_on").notNull(),
  });
  type EventsTable = ToTableType<typeof Events>;

  await test("type inference", () => {
    type SelectRow = Selectable<EventsTable>;
    const _validSelect: SelectRow[] = [{ happenedOn: new Date() }];
    // @ts-expect-error dates surface as Date, not strings
    const _invalidSelect: SelectRow = { happenedOn: "2024-01-01" };

    type InsertRow = Insertable<EventsTable>;
    const _validInsert: InsertRow[] = [{ happenedOn: new Date() }];
    // @ts-expect-error wrong type on insert
    const _invalidInsert: InsertRow = { happenedOn: 123 };

    type UpdateRow = Updateable<EventsTable>;
    const _validUpdate: UpdateRow[] = [{ happenedOn: new Date() }, {}];
    // @ts-expect-error must stay a Date on update
    const _invalidUpdate: UpdateRow = { happenedOn: ["today"] };

    const GeneratedDates = pgTable("public.generated_dates", {
      happenedOn: date("happened_on").notNull().generatedAlwaysAs("NOW()"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedDates>>;
    const _validGeneratedSelect: GeneratedSelect[] = [
      { happenedOn: new Date() },
    ];
    // @ts-expect-error generated column still surfaces as Date
    const _invalidGeneratedSelect: GeneratedSelect = { happenedOn: null };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedDates>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    // @ts-expect-error generated column cannot be inserted manually
    const _invalidGeneratedInsert: GeneratedInsert = { happenedOn: new Date() };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedDates>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    // @ts-expect-error generated column cannot be updated
    const _invalidGeneratedUpdate: GeneratedUpdate = { happenedOn: new Date() };

    const DefaultPrimaryDates = pgTable("public.default_primary_dates", {
      happenedOn: date("happened_on")
        .primaryKey()
        .default(new Date("2024-01-01")),
    });
    type DefaultPrimaryInsert = Insertable<
      ToTableType<typeof DefaultPrimaryDates>
    >;
    const _validDefaultPrimaryInsert: DefaultPrimaryInsert[] = [
      {},
      { happenedOn: new Date() },
      { happenedOn: null },
    ];
    const _invalidDefaultPrimaryInsert: DefaultPrimaryInsert = {
      // @ts-expect-error defaults expect Date or null, not strings
      happenedOn: "today",
    };

    const ImmutableDates = pgTable("public.immutable_dates", {
      happenedOn: date("happened_on").immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableDates>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    const _invalidImmutableUpdate: ImmutableUpdate = {
      // @ts-expect-error immutable column cannot be updated
      happenedOn: new Date("2024-06-01"),
    };

    const ArrayDates = pgTable("public.array_dates", {
      happenedOn: date("happened_on").array(),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayDates>>;
    const _validArraySelect: ArraySelect[] = [
      { happenedOn: [new Date("2024-01-01"), null] },
    ];
    // @ts-expect-error must be an array of dates/nulls
    const _invalidArraySelect: ArraySelect = { happenedOn: new Date() };
  });

  await suite("zod schema", async () => {
    const schema = selectSchema(Events);
    await test("parses ISO strings into dates", (t: TestContext) => {
      const isoPayload = { happenedOn: "2024-04-01" };
      const parsed = schema.safeParse(isoPayload);
      t.assert.strictEqual(parsed.success, true);
      t.assert.ok(parsed.success && parsed.data.happenedOn instanceof Date);
    });

    await test("rejects invalid date payloads", (t: TestContext) => {
      const scenarios = [{}, { happenedOn: "not-a-date" }];
      for (const idx in scenarios)
        t.assert.partialDeepStrictEqual(
          schema.safeParse(scenarios[idx]),
          { success: false },
          `scenario #${idx}`,
        );
    });
  });

  await suite("modifiers ordering", async () => {
    const OrderedDates = pgTable("public.date_modifiers_ordered", {
      happenedOn: date("happened_on")
        .default("CURRENT_TIMESTAMP")
        .unique()
        .immutable()
        .primaryKey(),
    });
    const ReorderedDates = pgTable("public.date_modifiers_reordered", {
      happenedOn: date("happened_on")
        .primaryKey()
        .immutable()
        .default("CURRENT_TIMESTAMP")
        .unique(),
    });

    await test("base modifiers keep equivalent metadata", (t: TestContext) => {
      const shape = (type: (typeof OrderedDates)["happenedOn"]["type"]) => ({
        isPrimaryKey: type.isPrimaryKey,
        isNotNull: type.isNotNull,
        isUnique: type.isUnique,
        isImmutable: type.isImmutable,
        defaultExpression: type.defaultExpression,
      });
      t.assert.deepStrictEqual(
        shape(OrderedDates.happenedOn.type),
        shape(ReorderedDates.happenedOn.type),
      );
    });

    await test("override and generated modifiers can combine", (t: TestContext) => {
      const OverrideDate = pgTable("public.date_override", {
        happenedOn: date("happened_on")
          .notNull()
          .override((schema) => schema.default(new Date("2024-05-01"))),
      });
      const GeneratedDate = pgTable("public.date_generated", {
        happenedOn: date("happened_on").generatedAlwaysAs("NOW()"),
      });

      const schema = selectSchema(OverrideDate);
      const parsed = schema.safeParse({});
      t.assert.ok(parsed.success);
      t.assert.ok(parsed.success && parsed.data.happenedOn instanceof Date);

      t.assert.strictEqual(
        GeneratedDate.happenedOn.type.generatedAlwaysExpression,
        "NOW()",
      );
      t.assert.ok(GeneratedDate.happenedOn.type.isImmutable);
    });

    await test("array modifier keeps explicit nullability order", (t: TestContext) => {
      const arrayThenNotNull = pgTable("public.date_array_first", {
        happenedOn: date("happened_on").array().notNull(),
      });
      const notNullThenArray = pgTable("public.date_notnull_first", {
        happenedOn: date("happened_on").notNull().array(),
      });

      t.assert.ok(arrayThenNotNull.happenedOn.type.isArray);
      t.assert.strictEqual(arrayThenNotNull.happenedOn.type.isNotNull, true);

      t.assert.ok(notNullThenArray.happenedOn.type.isArray);
      t.assert.strictEqual(notNullThenArray.happenedOn.type.isNotNull, false);
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual(Events.happenedOn.type.pgType, "date");
    t.assert.strictEqual(Events.happenedOn.type.computeType(), "date");
  });
});
