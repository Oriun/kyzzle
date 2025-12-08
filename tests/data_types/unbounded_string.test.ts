import {
  array,
  pgTable,
  selectSchema,
  text,
  type ToTableType,
} from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";

suite("UnBoundedString data type", async () => {
  const Notes = pgTable("public.unbounded_notes", {
    title: text("title")
      .min(3)
      .max(6)
      .regex(/^[a-z]+$/)
      .notNull(),
  });
  type NotesTable = ToTableType<typeof Notes>;

  await test("type inference", () => {
    type SelectRow = Selectable<NotesTable>;
    const _validSelect: SelectRow[] = [{ title: "notes" }];
    // @ts-expect-error not null column cannot be null
    const _invalidSelect: SelectRow = { title: null };

    type InsertRow = Insertable<NotesTable>;
    const _validInsert: InsertRow[] = [{ title: "hello" }];
    // @ts-expect-error needs to stay a string
    const _invalidInsert: InsertRow = { title: 123 };

    type UpdateRow = Updateable<NotesTable>;
    const _validUpdate: UpdateRow[] = [{ title: "abcde" }, {}];
    // @ts-expect-error wrong type on update
    const _invalidUpdate: UpdateRow = { title: ["nope"] };

    const GeneratedNotesType = pgTable("public.generated_notes_type", {
      title: text("title").notNull().generatedAlwaysAs("upper('hey')"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedNotesType>>;
    const _validGeneratedSelect: GeneratedSelect[] = [{ title: "HEY" }];
    // @ts-expect-error generated column still resolves to string
    const _invalidGeneratedSelect: GeneratedSelect = { title: null };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedNotesType>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    // @ts-expect-error generated column cannot be inserted manually
    const _invalidGeneratedInsert: GeneratedInsert = { title: "ok" };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedNotesType>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    // @ts-expect-error generated column cannot be updated
    const _invalidGeneratedUpdate: GeneratedUpdate = { title: "nope" };

    const DefaultPrimaryNotes = pgTable("public.default_primary_notes", {
      title: text("title").primaryKey().default("stay"),
    });
    type DefaultPrimaryInsert = Insertable<
      ToTableType<typeof DefaultPrimaryNotes>
    >;
    const _validDefaultPrimaryInsert: DefaultPrimaryInsert[] = [
      {},
      { title: "gone" },
    ];
    // @ts-expect-error defaults expect strings or null, not numbers
    const _invalidDefaultPrimaryInsert: DefaultPrimaryInsert = { title: 123 };
    // @ts-expect-error null cannot be provided when a default is configured
    const _nullDefaultPrimaryInsert: DefaultPrimaryInsert = { title: null };

    const ImmutableNotes = pgTable("public.immutable_notes", {
      title: text("title").immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableNotes>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    // @ts-expect-error immutable column cannot be updated
    const _invalidImmutableUpdate: ImmutableUpdate = { title: "edit" };

    const ArrayNotesType = pgTable("public.array_notes_type", {
      title: array(text("title")),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayNotesType>>;
    const _validArraySelect: ArraySelect[] = [{ title: ["hey", null] }];
    // @ts-expect-error must be an array of strings/nulls
    const _invalidArraySelect: ArraySelect = { title: "nope" };
  });

  await suite("zod schema", async () => {
    const schema = selectSchema(Notes);
    await test("accepts values within bounds", (t: TestContext) => {
      t.assert.deepStrictEqual(schema.safeParse({ title: "happy" }), {
        success: true,
        data: { title: "happy" },
      });
    });

    await test("rejects values outside bounds", (t: TestContext) => {
      const scenarios = [
        { title: "hi" },
        { title: "toolong" },
        { title: "123" },
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
    const OrderedNotes = pgTable("public.unbounded_notes_ordered", {
      title: text("title")
        .length(4)
        .default("stay")
        .unique()
        .immutable()
        .primaryKey(),
    });
    const ReorderedNotes = pgTable("public.unbounded_notes_reordered", {
      title: text("title")
        .primaryKey()
        .immutable()
        .unique()
        .default("stay")
        .length(4),
    });

    await test("base modifiers keep equivalent metadata", (t: TestContext) => {
      const shape = (type: (typeof OrderedNotes)["title"]["type"]) => ({
        minLength: (type as any).minLength,
        maxLength: (type as any).maxLength,
        isPrimaryKey: type.isPrimaryKey,
        isUnique: type.isUnique,
        isImmutable: type.isImmutable,
        defaultExpression: type.defaultExpression,
      });

      t.assert.deepStrictEqual(
        shape(OrderedNotes.title.type),
        shape(ReorderedNotes.title.type),
      );
    });

    await test("length helpers work in any order", (t: TestContext) => {
      const minThenMax = text("title").min(2).max(5);
      const maxThenMin = text("title").max(5).min(2);
      const fixedLength = text("title").length(3);

      t.assert.strictEqual((minThenMax as any).minLength, 2);
      t.assert.strictEqual((minThenMax as any).maxLength, 5);

      t.assert.strictEqual((maxThenMin as any).minLength, 2);
      t.assert.strictEqual((maxThenMin as any).maxLength, 5);

      t.assert.strictEqual((fixedLength as any).minLength, 3);
      t.assert.strictEqual((fixedLength as any).maxLength, 3);
    });

    await test("array and generated modifiers", (t: TestContext) => {
      const ArrayNotes = pgTable("public.unbounded_array_first", {
        title: array(text("title")).notNull(),
      });
      const GeneratedNotes = pgTable("public.unbounded_generated", {
        title: text("title").generatedAlwaysAs("upper('abc')"),
      });

      t.assert.ok(ArrayNotes.title.type.isArray);
      t.assert.strictEqual(ArrayNotes.title.type.isNotNull, true);

      t.assert.ok(GeneratedNotes.title.type.isImmutable);
      t.assert.strictEqual(
        GeneratedNotes.title.type.generatedAlwaysExpression,
        "'upper('abc')'",
      );
    });

    await test("override keeps the custom schema", (t: TestContext) => {
      const OverrideNotes = pgTable("public.unbounded_override", {
        title: text("title").override((schema) =>
          schema.max(10).default("note"),
        ),
      });
      const schema = selectSchema(OverrideNotes);
      t.assert.deepStrictEqual(schema.safeParse({}), {
        success: true,
        data: { title: "note" },
      });
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual((Notes.title.type as any).minLength, 3);
    t.assert.strictEqual((Notes.title.type as any).maxLength, 6);
    t.assert.deepStrictEqual((Notes.title.type as any).pattern, /^[a-z]+$/);
    t.assert.strictEqual(Notes.title.type.computeType(), "text");
  });
});
