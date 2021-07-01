type JSONSchema = object;

declare function index(schema: JSONSchema, options?: json_schema_deref_sync.Options): JSONSchema;

declare namespace json_schema_deref_sync {
  type Options = {
    baseFolder?: string;
    failOnMissing?: boolean;
    loaders?: {
      [key: string]: (reference: string, options?: Options) => JSONSchema;
    };
    mergeAdditionalProperties?: boolean;
    removeIds?: boolean;
  };
}

export = index;
