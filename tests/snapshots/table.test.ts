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
      "zodSchema": {
        "~standard": {
          "vendor": "zod",
          "version": 1
        },
        "def": {
          "type": "nullable",
          "innerType": {
            "~standard": {
              "vendor": "zod",
              "version": 1
            },
            "def": {
              "type": "pipe",
              "in": {
                "~standard": {
                  "vendor": "zod",
                  "version": 1
                },
                "def": {
                  "type": "string",
                  "format": "uuid",
                  "check": "string_format",
                  "abort": false,
                  "version": "v4",
                  "pattern": {}
                },
                "type": "string",
                "format": "uuid",
                "minLength": null,
                "maxLength": null
              },
              "out": {
                "~standard": {
                  "vendor": "zod",
                  "version": 1
                },
                "def": {
                  "type": "transform"
                },
                "type": "transform"
              }
            },
            "type": "pipe",
            "in": {
              "~standard": {
                "vendor": "zod",
                "version": 1
              },
              "def": {
                "type": "string",
                "format": "uuid",
                "check": "string_format",
                "abort": false,
                "version": "v4",
                "pattern": {}
              },
              "type": "string",
              "format": "uuid",
              "minLength": null,
              "maxLength": null
            },
            "out": {
              "~standard": {
                "vendor": "zod",
                "version": 1
              },
              "def": {
                "type": "transform"
              },
              "type": "transform"
            }
          }
        },
        "type": "nullable"
      }
    },
    "__brand": "TableColumn"
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
      "zodSchema": {
        "~standard": {
          "vendor": "zod",
          "version": 1
        },
        "def": {
          "type": "nullable",
          "innerType": {
            "~standard": {
              "vendor": "zod",
              "version": 1
            },
            "def": {
              "type": "string"
            },
            "type": "string",
            "format": null,
            "minLength": null,
            "maxLength": null
          }
        },
        "type": "nullable"
      }
    },
    "__brand": "TableColumn"
  }
}
`;
