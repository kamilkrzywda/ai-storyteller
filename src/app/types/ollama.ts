/**
 * Type definitions for Ollama's structured output format
 * Based on https://ollama.com/blog/structured-outputs
 */

/**
 * Base type for JSON Schema types
 */
export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

/**
 * Interface for JSON Schema properties
 */
export interface JSONSchemaProperty {
  type: JSONSchemaType;
  description?: string;
  format?: string;
  items?: JSONSchemaProperty | JSONSchemaProperty[];
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  enum?: (string | number | boolean | null)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JSONSchemaProperty;
  // Additional properties
  title?: string;
  default?: unknown;
  examples?: unknown[];
  const?: unknown;
  multipleOf?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  dependencies?: Record<string, string[] | JSONSchemaProperty>;
  allOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
  not?: JSONSchemaProperty;
  if?: JSONSchemaProperty;
  then?: JSONSchemaProperty;
  else?: JSONSchemaProperty;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  contentEncoding?: string;
  contentMediaType?: string;
  contentSchema?: JSONSchemaProperty;
}

/**
 * Interface for Ollama's structured output format
 */
export interface OllamaFormat {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  // Additional properties
  title?: string;
  default?: unknown;
  examples?: unknown[];
  allOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
  not?: JSONSchemaProperty;
}

/**
 * Helper type for creating structured output formats
 */
export type CreateFormat<T extends Record<string, unknown>> = {
  type: 'object';
  properties: {
    [K in keyof T]: JSONSchemaProperty;
  };
  required: string[];
  additionalProperties?: boolean;
  description?: string;
  // Additional properties
  title?: string;
  default?: unknown;
  examples?: unknown[];
  allOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
  not?: JSONSchemaProperty;
}; 