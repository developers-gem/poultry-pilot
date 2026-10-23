import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
/**
 * The API contract. Every route the server exposes is declared here with the SAME Zod schemas
 * the server validates with, so the OpenAPI document cannot drift from runtime behaviour.
 * The generated document drives the typed web client and the Dart client for Flutter.
 */
export declare const registry: OpenAPIRegistry;
export type OpenApiDocument = ReturnType<OpenApiGeneratorV31["generateDocument"]>;
export declare function buildOpenApiDocument(opts?: {
    serverUrl?: string;
    version?: string;
}): OpenApiDocument;
