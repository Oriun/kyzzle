exports[`Create Table > should create a table 1`] = `
{
  "id": {
    "name": "id",
    "table": "professional.companies",
    "type": {
      "name": "id",
      "pgType": "uuid",
      "isPrimaryKey": false,
      "isUnique": false,
      "isNotNull": false,
      "isImmutable": false,
      "isArray": false,
      "constraints": [],
      "zodSchema": {
        "_def": {
          "schema": {
            "_def": {
              "checks": [
                {
                  "kind": "uuid"
                }
              ],
              "typeName": "ZodString",
              "coerce": false
            },
            "~standard": {
              "version": 1,
              "vendor": "zod"
            }
          },
          "typeName": "ZodEffects",
          "effect": {
            "type": "transform"
          }
        },
        "~standard": {
          "version": 1,
          "vendor": "zod"
        }
      }
    }
  },
  "name": {
    "name": "name",
    "table": "professional.companies",
    "type": {
      "name": "name",
      "pgType": "text",
      "isPrimaryKey": false,
      "isUnique": false,
      "isNotNull": false,
      "isImmutable": false,
      "isArray": false,
      "constraints": [],
      "zodSchema": {
        "_def": {
          "checks": [],
          "typeName": "ZodString",
          "coerce": false
        },
        "~standard": {
          "version": 1,
          "vendor": "zod"
        }
      }
    }
  }
}
`;
