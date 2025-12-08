import {
  array,
  pgTable,
  selectSchema,
  timestamp,
  timestamptz,
  type ToTableType,
} from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";

suite("Timestamp data type", async () => {
  const minDate = new Date("2024-01-01T00:00:00.000Z");
  const maxDate = new Date("2025-01-01T00:00:00.000Z");

  const LocalEvents = pgTable("public.local_events", {
    occurredAt: timestamp("occurred_at").notNull().min(minDate).max(maxDate),
  });

  const ZonedEvents = pgTable("public.zoned_events", {
    occurredAt: timestamptz("occurred_at").notNull(),
  });

  type LocalEventsTable = ToTableType<typeof LocalEvents>;
  type ZonedEventsTable = ToTableType<typeof ZonedEvents>;

  await test("type inference", () => {
    type SelectRow = Selectable<LocalEventsTable>;
    const _validSelect: SelectRow[] = [{ occurredAt: new Date() }];
    // @ts-expect-error timestamps resolve to Date objects
    const _invalidSelect: SelectRow = { occurredAt: "2024-03-01" };

    type InsertRow = Insertable<ZonedEventsTable>;
    const _validInsert: InsertRow[] = [{ occurredAt: new Date() }];
    // @ts-expect-error insert expects Date
    const _invalidInsert: InsertRow = { occurredAt: 123 };

    type UpdateRow = Updateable<LocalEventsTable>;
    const _validUpdate: UpdateRow[] = [{ occurredAt: new Date() }, {}];
    // @ts-expect-error update payload must stay a Date
    const _invalidUpdate: UpdateRow = { occurredAt: "yesterday" };

    const GeneratedTimestampsType = pgTable("public.generated_ts_type", {
      occurredAt: timestamp("occurred_at")
        .notNull()
        .generatedAlwaysAs("CURRENT_TIMESTAMP"),
    });
    type GeneratedSelect = Selectable<
      ToTableType<typeof GeneratedTimestampsType>
    >;
    const _validGeneratedSelect: GeneratedSelect[] = [
      { occurredAt: new Date() },
    ];
    // @ts-expect-error generated column still resolves to Date
    const _invalidGeneratedSelect: GeneratedSelect = { occurredAt: null };

    type GeneratedInsert = Insertable<
      ToTableType<typeof GeneratedTimestampsType>
    >;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    // @ts-expect-error generated column cannot be inserted manually
    const _invalidGeneratedInsert: GeneratedInsert = { occurredAt: new Date() };

    type GeneratedUpdate = Updateable<
      ToTableType<typeof GeneratedTimestampsType>
    >;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    // @ts-expect-error generated column cannot be updated
    const _invalidGeneratedUpdate: GeneratedUpdate = { occurredAt: new Date() };

    const DefaultPrimaryTimestamp = pgTable("public.default_primary_ts", {
      occurredAt: timestamp("occurred_at")
        .primaryKey()
        .default(new Date("2024-01-01T00:00:00.000Z")),
    });
    type DefaultPrimaryInsert = Insertable<
      ToTableType<typeof DefaultPrimaryTimestamp>
    >;
    const _validDefaultPrimaryInsert: DefaultPrimaryInsert[] = [
      {},
      { occurredAt: new Date("2024-06-01T00:00:00.000Z") },
    ];
    const _invalidDefaultPrimaryInsert: DefaultPrimaryInsert = {
      // @ts-expect-error defaults expect Date or null, not strings
      occurredAt: "2024-06-01",
    };

    const ImmutableTimestamp = pgTable("public.immutable_ts", {
      occurredAt: timestamp("occurred_at").immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableTimestamp>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    const _invalidImmutableUpdate: ImmutableUpdate = {
      // @ts-expect-error immutable column cannot be updated
      occurredAt: new Date("2025-01-01T00:00:00.000Z"),
    };

    const ArrayTimestampsType = pgTable("public.array_ts", {
      occurredAt: array(timestamp("occurred_at")),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayTimestampsType>>;
    const _validArraySelect: ArraySelect[] = [
      { occurredAt: [new Date("2024-02-02T00:00:00.000Z"), null] },
    ];
    // @ts-expect-error must be an array of dates/nulls
    const _invalidArraySelect: ArraySelect = { occurredAt: new Date() };
  });

  await suite("zod schema", async () => {
    const schema = selectSchema(LocalEvents);
    await test("accepts values within range and normalizes strings", (t: TestContext) => {
      const payload = { occurredAt: "2024-06-10T12:00:00.000Z" };
      const parsed = schema.safeParse(payload);
      t.assert.strictEqual(parsed.success, true);
      t.assert.ok(parsed.success && parsed.data.occurredAt instanceof Date);
    });

    await test("rejects dates outside range", (t: TestContext) => {
      const scenarios = [
        { occurredAt: new Date("2023-12-31T23:59:59.999Z") },
        { occurredAt: new Date("2026-01-01T00:00:00.000Z") },
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
    const OrderedTimestamps = pgTable("public.timestamp_modifiers_ordered", {
      occurredAt: timestamp("occurred_at")
        .default("CURRENT_TIMESTAMP")
        .unique()
        .generatedAlwaysAs("NOW()"),
    });
    const ReorderedTimestamps = pgTable(
      "public.timestamp_modifiers_reordered",
      {
        occurredAt: timestamp("occurred_at")
          .generatedAlwaysAs("NOW()")
          .unique()
          .default("CURRENT_TIMESTAMP"),
      },
    );

    await test("base modifiers keep equivalent metadata", (t: TestContext) => {
      const shape = (
        type: (typeof OrderedTimestamps)["occurredAt"]["type"],
      ) => ({
        isUnique: type.isUnique,
        isImmutable: type.isImmutable,
        defaultExpression: type.defaultExpression,
        generatedAlwaysExpression: type.generatedAlwaysExpression,
      });
      t.assert.deepStrictEqual(
        shape(OrderedTimestamps.occurredAt.type),
        shape(ReorderedTimestamps.occurredAt.type),
      );
    });

    await test("min/max bounds apply regardless of order", (t: TestContext) => {
      const earlier = new Date("2024-02-01T00:00:00.000Z");
      const later = new Date("2024-12-01T00:00:00.000Z");

      const asc = timestamp("occurred_at").min(earlier).max(later);
      const desc = timestamp("occurred_at").max(later).min(earlier);

      t.assert.strictEqual((asc as any).minDate, earlier);
      t.assert.strictEqual((asc as any).maxDate, later);

      t.assert.strictEqual((desc as any).minDate, earlier);
      t.assert.strictEqual((desc as any).maxDate, later);
    });

    await test("override cooperates with other modifiers", (t: TestContext) => {
      const OverrideTimestamp = pgTable("public.timestamp_override", {
        occurredAt: timestamptz("occurred_at")
          .notNull()
          .override((schema) =>
            schema.default(new Date("2024-07-07T07:00:00.000Z")),
          ),
      });
      const schema = selectSchema(OverrideTimestamp);
      const parsed = schema.safeParse({});

      t.assert.ok(parsed.success);
      t.assert.ok(parsed.success && parsed.data.occurredAt instanceof Date);
    });

    await test("array and primary key modifiers", (t: TestContext) => {
      const ArrayTimestamps = pgTable("public.timestamp_array_first", {
        occurredAt: array(timestamp("occurred_at")).notNull(),
      });
      const PrimaryTimestamp = pgTable("public.timestamp_primary", {
        occurredAt: timestamp("occurred_at").primaryKey(),
      });

      t.assert.ok(ArrayTimestamps.occurredAt.type.isArray);
      t.assert.strictEqual(ArrayTimestamps.occurredAt.type.isNotNull, true);

      t.assert.ok(PrimaryTimestamp.occurredAt.type.isPrimaryKey);
      t.assert.strictEqual(PrimaryTimestamp.occurredAt.type.isNotNull, true);
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual((LocalEvents.occurredAt.type as any).minDate, minDate);
    t.assert.strictEqual((LocalEvents.occurredAt.type as any).maxDate, maxDate);
    t.assert.strictEqual(
      LocalEvents.occurredAt.type.computeType(),
      "timestamp",
    );
    t.assert.strictEqual((ZonedEvents.occurredAt.type as any).precision, 3);
    t.assert.strictEqual(
      ZonedEvents.occurredAt.type.computeType(),
      "timestamptz(3)",
    );
  });
});
