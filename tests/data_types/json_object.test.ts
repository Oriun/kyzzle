import {
  array,
  jsonb,
  pgTable,
  selectSchema,
  type ToTableType,
} from "kyzzle_test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { suite, test, type TestContext } from "node:test";
import { number, object, string } from "zod";

suite("JsonObject data type", async () => {
  const payloadSchema = object({
    foo: string(),
    count: number().int().optional(),
  });

  const JsonDocuments = pgTable("public.json_documents", {
    payload: jsonb("payload", payloadSchema).notNull(),
  });
  const JsonNoName = pgTable("public.json_documents_noname", {
    payload: jsonb(payloadSchema).notNull(),
  });
 
  type JsonTable = ToTableType<typeof JsonDocuments>;
  type JsonNoNameTable = ToTableType<typeof JsonNoName>;
 
  await test("type inference", () => {
    type SelectRow = Selectable<JsonTable>;
    type NoNameSelectRow = Selectable<JsonNoNameTable>;
    const _validNoNameSelect: NoNameSelectRow[] = [{ payload: { foo: "bar" } }];
    // @ts-expect-error missing required payload
    const _invalidNoNameSelect: NoNameSelectRow = {};

    type NoNameInsert = Insertable<JsonNoNameTable>;
    const _validNoNameInsert: NoNameInsert[] = [{ payload: { foo: "bar" } }];
    // @ts-expect-error schema must match
    const _invalidNoNameInsert: NoNameInsert = { payload: { foo: 1 } };
    // @ts-expect-error null not allowed when notNull()
    const _nullNoNameInsert: NoNameInsert = { payload: null };

    type NoNameUpdate = Updateable<JsonNoNameTable>;
    const _validNoNameUpdate: NoNameUpdate[] = [{ payload: { foo: "baz" } }, {}];
    // @ts-expect-error updates must match schema
    const _invalidNoNameUpdate: NoNameUpdate = { payload: "oops" };

    type SelectRow = Selectable<JsonTable>;

    const _validSelect: SelectRow[] = [
      { payload: { foo: "bar" } },
      { payload: { foo: "bar", count: 3 } },
    ];
    // @ts-expect-error null is not allowed on select
    const _invalidSelect: SelectRow = { payload: null };

    type InsertRow = Insertable<JsonTable>;
    const _validInsert: InsertRow[] = [
      { payload: { foo: "bar" } },
      { payload: { foo: "bar", count: 2 } },
    ];
    // @ts-expect-error must match the object schema
    const _invalidInsert: InsertRow = { payload: { foo: 1 } };

    type UpdateRow = Updateable<JsonTable>;
    const _validUpdate: UpdateRow[] = [{ payload: { foo: "baz" } }, {}];
    // @ts-expect-error updates must keep the payload shape
    const _invalidUpdate: UpdateRow = { payload: "oops" };

    const GeneratedJson = pgTable("public.generated_json", {
      payload: jsonb("payload", payloadSchema)
        .notNull()
        .generatedAlwaysAs("json_build_object('foo','bar')"),
    });
    type GeneratedSelect = Selectable<ToTableType<typeof GeneratedJson>>;
    const _validGeneratedSelect: GeneratedSelect[] = [
      { payload: { foo: "bar" } },
    ];
    // @ts-expect-error generated column still resolves to object
    const _invalidGeneratedSelect: GeneratedSelect = { payload: null };

    type GeneratedInsert = Insertable<ToTableType<typeof GeneratedJson>>;
    const _validGeneratedInsert: GeneratedInsert[] = [{}];
    const _invalidGeneratedInsert: GeneratedInsert = {
      // @ts-expect-error generated column cannot be inserted manually
      payload: { foo: "baz" },
    };

    type GeneratedUpdate = Updateable<ToTableType<typeof GeneratedJson>>;
    const _validGeneratedUpdate: GeneratedUpdate[] = [{}];
    const _invalidGeneratedUpdate: GeneratedUpdate = {
      // @ts-expect-error generated column cannot be updated
      payload: { foo: "qux" },
    };

    const DefaultPrimaryJson = pgTable("public.default_primary_json", {
      payload: jsonb("payload", payloadSchema)
        .primaryKey()
        .default({ foo: "bar" }),
    });
    type DefaultPrimaryInsert = Insertable<
      ToTableType<typeof DefaultPrimaryJson>
    >;
    const _validDefaultPrimaryInsert: DefaultPrimaryInsert[] = [
      {},
      { payload: { foo: "baz", count: 1 } },
    ];
    const _invalidDefaultPrimaryInsert: DefaultPrimaryInsert = {
      // @ts-expect-error defaults expect object payloads or null, not strings
      payload: "oops",
    };
    // @ts-expect-error null cannot be provided when a default exists
    const _nullDefaultPrimaryInsert: DefaultPrimaryInsert = { payload: null };

    const ImmutableJson = pgTable("public.immutable_json", {
      payload: jsonb("payload", payloadSchema).immutable(),
    });
    type ImmutableUpdate = Updateable<ToTableType<typeof ImmutableJson>>;
    const _validImmutableUpdate: ImmutableUpdate[] = [{}];
    const _invalidImmutableUpdate: ImmutableUpdate = {
      // @ts-expect-error immutable column cannot be updated
      payload: { foo: "mutate" },
    };

    const ArrayJson = pgTable("public.array_json", {
      payload: array(jsonb("payload", payloadSchema)),
    });
    type ArraySelect = Selectable<ToTableType<typeof ArrayJson>>;
    const _validArraySelect: ArraySelect[] = [
      { payload: [{ foo: "bar" }, null] },
    ];
    // @ts-expect-error must be an array of payloads/nulls
    const _invalidArraySelect: ArraySelect = { payload: { foo: "bar" } };
  });

  await suite("zod schema", async () => {
    const schema = selectSchema(JsonDocuments);
    await test("accepts valid payloads", (t: TestContext) => {
      t.assert.deepStrictEqual(schema.safeParse({ payload: { foo: "bar" } }), {
        success: true,
        data: { payload: { foo: "bar" } },
      });
    });

    await test("rejects invalid payloads", (t: TestContext) => {
      const scenarios = [{ payload: { foo: 123 } }, { payload: { count: 2 } }];
      for (const idx in scenarios)
        t.assert.partialDeepStrictEqual(
          schema.safeParse(scenarios[idx]),
          { success: false },
          `scenario #${idx}`,
        );
    });
  });

  await suite("modifiers ordering", async () => {
    const OrderedJson = pgTable("public.json_modifiers_ordered", {
      payload: jsonb("payload", payloadSchema)
        .default({ foo: "bar" })
        .unique()
        .immutable()
        .primaryKey(),
    });
    const ReorderedJson = pgTable("public.json_modifiers_reordered", {
      payload: jsonb("payload", payloadSchema)
        .primaryKey()
        .immutable()
        .default({ foo: "bar" })
        .unique(),
    });

    await test("base modifiers keep identical metadata", (t: TestContext) => {
      const shape = (type: (typeof OrderedJson)["payload"]["type"]) => ({
        isPrimaryKey: type.isPrimaryKey,
        isUnique: type.isUnique,
        isImmutable: type.isImmutable,
        isNotNull: type.isNotNull,
        defaultExpression: type.defaultExpression,
      });
      t.assert.deepStrictEqual(
        shape(OrderedJson.payload.type),
        shape(ReorderedJson.payload.type),
      );
    });

    await test("array, override, and generated modifiers", (t: TestContext) => {
      const ArrayFirst = pgTable("public.json_array_first", {
        payload: array(jsonb("payload", payloadSchema)).notNull(),
      });
      const OverrideJson = pgTable("public.json_override", {
        payload: jsonb("payload", payloadSchema).override((schema) =>
          schema.extend({ label: string() }),
        ),
      });
      const GeneratedJson = pgTable("public.json_generated", {
        payload: jsonb("payload", payloadSchema).generatedAlwaysAs(
          "json_build_object('foo','bar')",
        ),
      });

      const schema = selectSchema(OverrideJson);
      t.assert.deepStrictEqual(
        schema.safeParse({ payload: { foo: "bar", label: "ok" } }),
        { success: true, data: { payload: { foo: "bar", label: "ok" } } },
      );
      t.assert.partialDeepStrictEqual(
        schema.safeParse({ payload: { foo: "bar" } }),
        { success: false },
      );

      t.assert.ok(ArrayFirst.payload.type.isArray);
      t.assert.strictEqual(ArrayFirst.payload.type.isNotNull, true);
      t.assert.ok(GeneratedJson.payload.type.isImmutable);
      t.assert.strictEqual(
        GeneratedJson.payload.type.generatedAlwaysExpression,
        "'json_build_object('foo','bar')'",
      );
    });
  });

  await test("constraints metadata", (t: TestContext) => {
    t.assert.strictEqual(JsonDocuments.payload.type.pgType, "jsonb");
    t.assert.strictEqual(JsonDocuments.payload.type.computeType(), "jsonb");
    t.assert.strictEqual(JsonDocuments.payload.type.zodSchema, payloadSchema);
  });
});
