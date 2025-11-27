import {
  DataType,
  type ToTableType,
  bool,
  insertSchema,
  integer,
  pgCompositeType,
  pgTable,
  selectSchema,
  text,
  updateSchema,
  uuid,
  type KyselyTables,
} from "kyzzle_test";
import { randomBytes, randomUUID } from "node:crypto";
import { suite, test, type TestContext } from "node:test";
import { type Insertable, type Selectable, type Updateable } from "kysely";
import { string } from "zod";

suite("Create Composite Type", async () => {
  await suite("should not throw", async () => {
    const randStr = randomBytes(4).toString("hex");
    const scenarios = [
      ["public.address", { street: text("street") }],
      ["billing.coordinates", { [randStr]: integer(randStr) }],
      [
        "domain.preferences",
        {
          theme: text("theme").notNull(),
          marketing: bool("marketing").notNull(),
        },
      ],
    ] as Parameters<typeof pgCompositeType>[];
    for (const idx in scenarios)
      await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
        t.assert.doesNotThrow(() => pgCompositeType(...scenarios[idx])));
  });

  await suite("should throw", async () => {
    const scenarios = [
      [],
      ["without_schema", { id: text("id") }],
      ["public.preferences"],
      ["public.preferences", {}],
      ["public.preferences", { id: "id" }],
      ["public.preferences", { id: string() }],
      ["public.preferences", { id: () => {} }],
      ["public.preferences", { id: 2 }],
      ["public.preferences", { [randomBytes(4).toString("hex")]: 2 }],
    ] as const;
    for (const idx in scenarios)
      await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
        // @ts-expect-error
        t.assert.throws(() => pgCompositeType(...scenarios[idx])));
  });

  await suite("should expose metadata and zod behavior", async () => {
    const Preferences = pgCompositeType("billing.preferences", {
      favoriteColor: text("favorite_color").notNull(),
      emailOptIn: bool("email_opt_in"),
    });

    await test("metadata", (t: TestContext) => {
      t.assert.strictEqual(
        Preferences.compositeTypeName,
        "billing.preferences",
      );
      t.assert.strictEqual(
        (Preferences as { __brand?: string }).__brand,
        "CompositeType",
      );
      t.assert.deepStrictEqual(Object.keys(Preferences).sort(), [
        "compositeTypeName",
        "emailOptIn",
        "favoriteColor",
        "fields",
      ]);

      const field = Preferences.favoriteColor;
      t.assert.strictEqual(field.name, "favorite_color");
      t.assert.strictEqual(field.compositeType, "billing.preferences");
      t.assert.ok(field.type instanceof DataType);
      t.assert.strictEqual(field, Preferences.fields.favoriteColor);

      const column = Preferences("preferences");
      t.assert.ok(column instanceof DataType);
      t.assert.strictEqual(column.pgType, "billing.preferences");
      t.assert.strictEqual(column.name, "preferences");
      t.assert.strictEqual(
        column.meta.compositeTypeName,
        "billing.preferences",
      );
    });

    await test("zod", (t: TestContext) => {
      const preferences = Preferences("preferences");

      const validValue = {
        favoriteColor: "blue",
        emailOptIn: true,
      };
      t.assert.deepStrictEqual(preferences.zodSchema.safeParse(validValue), {
        success: true,
        data: validValue,
      });
      t.assert.partialDeepStrictEqual(preferences.zodSchema.safeParse(null), {
        success: false,
      });
      t.assert.partialDeepStrictEqual(
        preferences.zodSchema.safeParse({
          favoriteColor: null,
          emailOptIn: true,
        }),
        { success: false },
      );
    });
  });

  await suite("type inference", async () => {
    const Address = pgCompositeType("public.address", {
      street: text("street").notNull(),
      postalCode: integer("postal_code"),
    });
    const Buildings = pgTable("public.buildings", {
      nullableAdress: Address("nullable_adress"),
      nonNullableAdress: Address("non_nullable_adress").notNull(),
    });
    type Building = Selectable<ToTableType<typeof Buildings>>;

    await test("fields inference", () => {
      type AddressFields = typeof Address.fields;
      const _street: AddressFields["street"] = Address.street;
      // @ts-expect-error
      const _wrongField: AddressFields["street"] = Address.postalCode;
    });

    await test("nullable column output inference", () => {
      type AddressOutput = Building["nullableAdress"];
      const _validOutputs: AddressOutput[] = [
        null,
        { street: "Main St", postalCode: 75000 },
        { street: "Main St", postalCode: null },
      ];
      const _missingField: AddressOutput[] = [
        // @ts-expect-error
        { street: "Main St" },
        {
          street: "Main St",
          // @ts-expect-error
          postalCode: "75000",
        },
      ];
    });

    await test("non-nullable column output inference", () => {
      type AddressOutput = Building["nonNullableAdress"];
      const _validOutputs: AddressOutput[] = [
        { street: "Main St", postalCode: 75000 },
      ];
      // @ts-expect-error
      const _nullValue: AddressOutput = null;
    });
  });

  await suite("default normalization", async () => {
    const Addresses = pgCompositeType("billing.addresses", {
      street: text("street_name").notNull(),
      city: text("city").notNull(),
      postalCode: integer("postal_code"),
    });

    await test("should normalize default payloads", (t: TestContext) => {
      const addressColumn = Addresses("address");
      const result = addressColumn.default({
        street: "Broadway",
        city: "New York",
        postalCode: 10001,
      });

      t.assert.strictEqual(result, addressColumn);
      t.assert.strictEqual(
        addressColumn.defaultExpression,
        `jsonb_populate_record(NULL::billing.addresses, '{"street_name":"Broadway","city":"New York","postal_code":10001}'::jsonb)`,
      );
    });

    await test("should accept database field names", (t: TestContext) => {
      const addressColumn = Addresses("shipping_address");
      const dbPayload: Record<string, unknown> = {
        street_name: "King's Road",
        city: "London",
      };
      addressColumn.default(dbPayload);

      t.assert.strictEqual(
        addressColumn.defaultExpression,
        `jsonb_populate_record(NULL::billing.addresses, '{"street_name":"King''s Road","city":"London"}'::jsonb)`,
      );
    });

    await test("should reject invalid default payloads", (t: TestContext) => {
      const addressColumn = Addresses("billing_address");
      t.assert.throws(
        () =>
          // @ts-expect-error
          addressColumn.default({
            street: "Broadway",
            city: 99,
          }),
        /Invalid default value for composite type billing\.addresses/,
      );
      t.assert.throws(
        () =>
          addressColumn.default({
            street: "Broadway",
            city: "New York",
            // @ts-expect-error
            country: "US",
          }),
        /Invalid default value for composite type billing\.addresses/,
      );
    });

    await test("should delegate non-object defaults", (t: TestContext) => {
      const addressColumn = Addresses("legacy_address");
      addressColumn.default("CURRENT_TIMESTAMP");

      t.assert.strictEqual(
        addressColumn.defaultExpression,
        "CURRENT_TIMESTAMP",
      );
    });
  });

  await suite("integration with pgTable", async () => {
    const Coordinates = pgCompositeType("geo.coordinates", {
      latitude: integer("latitude").notNull(),
      longitude: integer("longitude").notNull(),
      label: text("label"),
    });

    const Locations = pgTable("geo.locations", {
      id: uuid("id").primaryKey().notNull().immutable(),
      name: text("name").notNull(),
      coordinates: Coordinates("coordinates").notNull(),
      previousCoordinates: Coordinates("previous_coordinates"),
    });
    const Tables = { Locations };
    type DB = KyselyTables<typeof Tables>;

    await suite("should infer Kysely types", async () => {
      await test("SELECT", () => {
        type LocationRow = Selectable<DB["geo.locations"]>;
        const _validRows: LocationRow[] = [
          {
            id: randomUUID(),
            name: "HQ",
            coordinates: { latitude: 1, longitude: 2, label: null },
            previousCoordinates: null,
          },
          {
            id: randomUUID(),
            name: "Warehouse",
            coordinates: { latitude: 3, longitude: 4, label: "Depot" },
            previousCoordinates: {
              latitude: 5,
              longitude: 6,
              label: null,
            },
          },
        ];
        const _invalidRow: LocationRow = {
          id: randomUUID(),
          name: "Invalid",
          // @ts-expect-error
          coordinates: null,
          previousCoordinates: null,
        };
      });

      await test("INSERT", () => {
        type LocationInsert = Insertable<DB["geo.locations"]>;
        const _validInsert: LocationInsert[] = [
          {
            id: randomUUID(),
            name: "HQ",
            coordinates: { latitude: 1, longitude: 2, label: null },
          },
          {
            id: randomUUID(),
            name: "Warehouse",
            coordinates: { latitude: 3, longitude: 4, label: "Depot" },
            previousCoordinates: { latitude: 5, longitude: 6, label: null },
          },
          {
            id: randomUUID(),
            name: "Branch",
            coordinates: { latitude: 7, longitude: 8, label: null },
            previousCoordinates: null,
          },
        ];
        const _invalidInsert: LocationInsert[] = [
          // @ts-expect-error
          { id: randomUUID(), name: "HQ" },
          {
            id: randomUUID(),
            name: "HQ",
            // @ts-expect-error
            coordinates: null,
          },
          {
            id: randomUUID(),
            name: "HQ",
            coordinates: {
              // @ts-expect-error
              latitude: "1",
              longitude: 2,
              label: null,
            },
          },
        ];
      });

      await test("UPDATE", () => {
        type LocationUpdate = Updateable<DB["geo.locations"]>;
        const _validUpdate: LocationUpdate[] = [
          { name: "HQ" },
          { coordinates: { latitude: 9, longitude: 10, label: null } },
          { previousCoordinates: null },
          {
            previousCoordinates: { latitude: 11, longitude: 12, label: "Old" },
          },
          {},
        ];
        const _invalidUpdate: LocationUpdate[] = [
          {
            // @ts-expect-error
            coordinates: null,
          },
          {
            // @ts-expect-error
            coordinates: { latitude: 1 },
          },
        ];
      });
    });

    await suite("SELECT schema", async () => {
      const selectLocation = selectSchema(Locations);
      await test("should parse valid values", async (t: TestContext) => {
        const scenarios = [
          {
            id: randomUUID(),
            name: "HQ",
            coordinates: { latitude: 1, longitude: 2, label: null },
            previousCoordinates: null,
          },
          {
            id: randomUUID(),
            name: "Warehouse",
            coordinates: { latitude: 3, longitude: 4, label: "Depot" },
            previousCoordinates: {
              latitude: 5,
              longitude: 6,
              label: "Old depot",
            },
          },
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.deepStrictEqual(
                selectLocation.safeParse(scenarios[idx]),
                {
                  success: true,
                  data: scenarios[idx],
                },
              ),
            ));
      });

      await test("should reject invalid values", async (t: TestContext) => {
        const scenarios = [
          {
            id: randomUUID(),
            name: "Missing coordinates",
            coordinates: null,
            previousCoordinates: null,
          },
          {
            id: randomUUID(),
            name: "Bad coordinates",
            coordinates: { latitude: "3", longitude: 4, label: null },
            previousCoordinates: null,
          },
          {
            id: randomUUID(),
            name: "Bad previous coordinates",
            coordinates: { latitude: 1, longitude: 2, label: null },
            previousCoordinates: { latitude: 5, longitude: 6 },
          },
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.partialDeepStrictEqual(
                selectLocation.safeParse(scenarios[idx]),
                { success: false },
              ),
            ));
      });
    });

    await suite("INSERT schema", async () => {
      const insertLocation = insertSchema(Locations);
      await test("should parse valid values", async (t: TestContext) => {
        const scenarios = [
          {
            id: randomUUID(),
            name: "HQ",
            coordinates: { latitude: 1, longitude: 2, label: null },
          },
          {
            id: randomUUID(),
            name: "Warehouse",
            coordinates: { latitude: 3, longitude: 4, label: "Depot" },
            previousCoordinates: null,
          },
          {
            id: randomUUID(),
            name: "Branch",
            coordinates: { latitude: 5, longitude: 6, label: "Branch" },
            previousCoordinates: {
              latitude: 1,
              longitude: 2,
              label: null,
            },
          },
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.deepStrictEqual(
                insertLocation.safeParse(scenarios[idx]),
                {
                  success: true,
                  data: scenarios[idx],
                },
              ),
            ));
      });

      await test("should reject invalid values", async (t: TestContext) => {
        const scenarios = [
          {
            id: randomUUID(),
            name: "HQ",
            coordinates: null,
          },
          {
            id: randomUUID(),
            name: "Warehouse",
            coordinates: { latitude: "3", longitude: 4, label: null },
          },
          {
            id: randomUUID(),
            name: "Branch",
            coordinates: { latitude: 5, longitude: 6, label: "Branch" },
            previousCoordinates: { latitude: 1, longitude: 2 },
          },
          {
            name: "Missing id",
            coordinates: { latitude: 1, longitude: 2, label: null },
          },
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.partialDeepStrictEqual(
                insertLocation.safeParse(scenarios[idx]),
                { success: false },
              ),
            ));
      });
    });

    await suite("UPDATE schema", async () => {
      const updateLocation = updateSchema(Locations);
      await test("should parse valid values", async (t: TestContext) => {
        const scenarios = [
          { name: "HQ" },
          { coordinates: { latitude: 1, longitude: 2, label: null } },
          {
            previousCoordinates: { latitude: 5, longitude: 6, label: "Old" },
          },
          { previousCoordinates: null },
          {},
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.deepStrictEqual(
                updateLocation.safeParse(scenarios[idx]),
                {
                  success: true,
                  data: scenarios[idx],
                },
              ),
            ));
      });

      await test("should reject invalid values", async (t: TestContext) => {
        const scenarios = [
          {
            coordinates: null,
          },
          {
            coordinates: { latitude: "1", longitude: 2, label: null },
          },
          {
            coordinates: { latitude: 1, longitude: 2, label: null },
            previousCoordinates: { latitude: 1, longitude: 2 },
          },
        ] as const;
        for (const idx in scenarios)
          await test(`scenario n°${1 + +idx}`, (t: TestContext) =>
            t.assert.doesNotThrow(() =>
              t.assert.partialDeepStrictEqual(
                updateLocation.safeParse(scenarios[idx]),
                { success: false },
              ),
            ));
      });
    });
  });
});
