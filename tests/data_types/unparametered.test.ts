import {
  doublePrecision,
  insertSchema,
  pgTable,
  selectSchema,
  uuid,
  type ToTableType,
} from "kyzzle_test";
import { randomUUID } from "node:crypto";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";

suite("UnParametered data type", async () => {
  const Uuids = pgTable("public.uuid_defaults", {
    id: uuid("id").primaryKey().default("uuid_generate_v4()"),
  });

  const Doubles = pgTable("public.double_numbers", {
    amount: doublePrecision("amount"),
  });

  type UuidsTable = ToTableType<typeof Uuids>;
  type DoublesTable = ToTableType<typeof Doubles>;

  await test("type inference", () => {
    type SelectUuid = Selectable<UuidsTable>;
    const _validSelect: SelectUuid[] = [{ id: randomUUID() }];
    // @ts-expect-error id cannot be null on select
    const _invalidSelect: SelectUuid = { id: null };

    type InsertUuid = Insertable<UuidsTable>;
    const _validInsert: InsertUuid[] = [{}, { id: randomUUID() }];
    // @ts-expect-error wrong type on insert
    const _invalidInsert: InsertUuid = { id: 123 };

    type UpdateUuid = Updateable<UuidsTable>;
    const _validUpdate: UpdateUuid[] = [{ id: randomUUID() }, {}];
    // @ts-expect-error updates must keep string values
    const _invalidUpdate: UpdateUuid = { id: 42 };

    type SelectDouble = Selectable<DoublesTable>;
    const _validDouble: SelectDouble[] = [{ amount: null }, { amount: 3.14 }];
    // @ts-expect-error wrong type on select
    const _invalidDouble: SelectDouble = { amount: "3.14" };

    const GeneratedUuid = pgTable("public.generated_uuid_type", {
      id: uuid("id").generatedAlwaysAs("uuid_generate_v4()"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedUuid>>;
    const _validGeneratedSelect: GeneratedSelect[] = [{ id: randomUUID() }];
    const _invalidGeneratedSelect: GeneratedSelect = {
      // @ts-expect-error generated column still resolves to string
      id: null,
    };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedUuid>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    // @ts-expect-error generated column cannot be provided on insert
    const _invalidGeneratedInsert: GeneratedInsert = { id: randomUUID() };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedUuid>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    // @ts-expect-error generated column cannot be updated
    const _invalidGeneratedUpdate: GeneratedUpdate = { id: randomUUID() };

    const ImmutableDouble = pgTable("public.immutable_double", {
      amount: doublePrecision("amount").immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableDouble>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    // @ts-expect-error immutable column cannot be updated
    const _invalidImmutableUpdate: ImmutableUpdate = { amount: 2.5 };

    const ArrayUuids = pgTable("public.array_uuids", {
      ids: uuid("ids").array(),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayUuids>>;
    const _validArraySelect: ArraySelect[] = [{ ids: [randomUUID(), null] }];
    // @ts-expect-error must be an array of uuids/nulls
    const _invalidArraySelect: ArraySelect = { ids: randomUUID() };
  });

  await suite("zod schema", async () => {
    const selectUuid = selectSchema(Uuids);
    await test("select schema enforces uuid", (t: TestContext) => {
      const id = randomUUID();
      t.assert.deepStrictEqual(selectUuid.safeParse({ id }), {
        success: true,
        data: { id },
      });
      t.assert.partialDeepStrictEqual(selectUuid.safeParse({ id: null }), {
        success: false,
      });
    });

    const insertUuid = insertSchema(Uuids);
    await test("insert schema honours defaults", (t: TestContext) => {
      t.assert.deepStrictEqual(insertUuid.safeParse({}), {
        success: true,
        data: {},
      });
      t.assert.partialDeepStrictEqual(
        insertUuid.safeParse({ id: "not-a-uuid" }),
        { success: false },
      );
    });
  });

  await suite("modifiers ordering", async () => {
    const OrderedUuids = pgTable("public.uuid_modifiers_ordered", {
      id: uuid("id")
        .primaryKey()
        .default("uuid_generate_v4()")
        .immutable()
        .unique(),
    });
    const ReorderedUuids = pgTable("public.uuid_modifiers_reordered", {
      id: uuid("id")
        .default("uuid_generate_v4()")
        .unique()
        .immutable()
        .primaryKey(),
    });

    await test("base modifiers keep equivalent metadata", (t: TestContext) => {
      const shape = (type: (typeof OrderedUuids)["id"]["type"]) => ({
        isPrimaryKey: type.isPrimaryKey,
        isUnique: type.isUnique,
        isNotNull: type.isNotNull,
        isImmutable: type.isImmutable,
        defaultExpression: type.defaultExpression,
      });
      t.assert.deepStrictEqual(
        shape(OrderedUuids.id.type),
        shape(ReorderedUuids.id.type),
      );
    });

    await test("array, generated, and override modifiers", (t: TestContext) => {
      const arrayThenNotNull = pgTable("public.uuid_array_first", {
        ids: uuid("ids").array().notNull(),
      });
      const notNullThenArray = pgTable("public.uuid_notnull_first", {
        ids: uuid("ids").notNull().array(),
      });
      const GeneratedDouble = pgTable("public.double_generated", {
        amount:
          doublePrecision("amount").generatedAlwaysAs("CURRENT_TIMESTAMP"),
      });
      const OverrideUuid = pgTable("public.uuid_override", {
        id: uuid("id").override((schema) => schema.default(randomUUID())),
      });

      const schema = selectSchema(OverrideUuid);
      const parsed = schema.safeParse({});
      t.assert.ok(parsed.success);
      t.assert.strictEqual(
        parsed.success ? typeof parsed.data.id : undefined,
        "string",
      );

      t.assert.ok(arrayThenNotNull.ids.type.isArray);
      t.assert.strictEqual(arrayThenNotNull.ids.type.isNotNull, true);

      t.assert.ok(notNullThenArray.ids.type.isArray);
      t.assert.strictEqual(notNullThenArray.ids.type.isNotNull, false);

      t.assert.ok(GeneratedDouble.amount.type.isImmutable);
      t.assert.strictEqual(
        GeneratedDouble.amount.type.generatedAlwaysExpression,
        "CURRENT_TIMESTAMP",
      );
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual(Uuids.id.type.pgType, "uuid");
    t.assert.ok(Uuids.id.type.isPrimaryKey);
    t.assert.ok(Uuids.id.type.isNotNull);
    t.assert.strictEqual(Uuids.id.type.defaultExpression, "uuid_generate_v4()");
    t.assert.strictEqual(Doubles.amount.type.computeType(), "double precision");
  });
});
