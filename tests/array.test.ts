import {
  array,
  insertSchema,
  integer,
  pgTable,
  selectSchema,
  text,
  updateSchema,
  type ToTableType,
} from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";

suite("Array data type", async () => {
  await test("type inference honours array and item nullability", () => {
    const Arrays = pgTable("public.array_inference", {
      nullableNumbers: array(integer("nullable_numbers")),
      strictNumbers: array(integer("strict_numbers")).notNullableItems(),
      fixedTexts: array(text("fixed_texts"))
        .length(2)
        .notNull()
        .notNullableItems(),
    });

    type ArraysTable = ToTableType<typeof Arrays>;

    type SelectRow = Selectable<ArraysTable>;
    const _validSelect: SelectRow[] = [
      {
        nullableNumbers: null,
        strictNumbers: null,
        fixedTexts: ["a", "b"],
      },
      {
        nullableNumbers: [1, null],
        strictNumbers: [2, 3],
        fixedTexts: ["c", "d"],
      },
    ];
    type InsertRow = Insertable<ArraysTable>;
    const _validInsert: InsertRow[] = [
      { fixedTexts: ["ok", "ok"] },
      { nullableNumbers: null, strictNumbers: [1], fixedTexts: ["c", "d"] },
    ];

    type UpdateRow = Updateable<ArraysTable>;
    const _validUpdate: UpdateRow[] = [
      { nullableNumbers: null },
      { strictNumbers: [1, 2] },
      { fixedTexts: ["a", "b"] },
      {},
    ];
  });

  await suite("zod schemas", async () => {
    const Arrays = pgTable("public.array_schemas", {
      nullableNumbers: array(integer("nullable_numbers")),
      strictNumbers: array(integer("strict_numbers")).notNullableItems(),
      boundedTexts: array(text("bounded_texts")).minLength(2).maxLength(3),
      fixedTexts: array(text("fixed_texts"))
        .length(2)
        .notNull()
        .notNullableItems(),
    });

    const selectArrays = selectSchema(Arrays);
    const insertArrays = insertSchema(Arrays);
    const updateArrays = updateSchema(Arrays);

    await test("select schema respects array configuration", (t: TestContext) => {
      t.assert.deepStrictEqual(
        selectArrays.safeParse({
          nullableNumbers: [1, null],
          strictNumbers: [2, 3],
          boundedTexts: ["a", "b"],
          fixedTexts: ["x", "y"],
        }),
        {
          success: true,
          data: {
            nullableNumbers: [1, null],
            strictNumbers: [2, 3],
            boundedTexts: ["a", "b"],
            fixedTexts: ["x", "y"],
          },
        },
      );
      t.assert.partialDeepStrictEqual(
        selectArrays.safeParse({
          nullableNumbers: [1, null],
          strictNumbers: [2, null],
          boundedTexts: ["a", "b"],
          fixedTexts: ["x", "y"],
        }),
        { success: false },
      );
    });

    await test("insert schema enforces lengths and nullability", (t: TestContext) => {
      t.assert.deepStrictEqual(
        insertArrays.safeParse({
          fixedTexts: ["q", "w"],
        }),
        { success: true, data: { fixedTexts: ["q", "w"] } },
      );
      t.assert.partialDeepStrictEqual(
        insertArrays.safeParse({
          boundedTexts: ["too", "long", "list", "here"],
          fixedTexts: ["a", "b"],
        }),
        { success: false },
      );
      t.assert.partialDeepStrictEqual(
        insertArrays.safeParse({
          boundedTexts: ["short"],
          fixedTexts: ["a", null],
        }),
        { success: false },
      );
    });

    await test("update schema keeps item constraints", (t: TestContext) => {
      t.assert.deepStrictEqual(
        updateArrays.safeParse({
          nullableNumbers: null,
          fixedTexts: ["left", "right"],
        }),
        {
          success: true,
          data: { nullableNumbers: null, fixedTexts: ["left", "right"] },
        },
      );
      t.assert.partialDeepStrictEqual(
        updateArrays.safeParse({
          strictNumbers: ["bad", "data"] as unknown as number[],
        }),
        { success: false },
      );
    });
  });
});
