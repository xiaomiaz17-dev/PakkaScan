import type { DocumentType, Jurisdiction } from "../domain/models";

export type BoundingBox = { x: number; y: number; width: number; height: number };

export type RawField = {
  field: string;
  value: string;
  confidence: number;
  page?: number;
  boundingBox?: BoundingBox;
  rawText?: string;
};

export type ExtractedDocument = {
  documentId: string;
  documentType: DocumentType;
  jurisdiction: Jurisdiction;
  schemaVersion: string;
  fields: RawField[];
  warnings: string[];
};

export type ExtractionContext = {
  documentId: string;
  documentType: DocumentType;
  jurisdiction: Jurisdiction;
  text: string;
};

export type FieldDefinition = {
  name: string;
  required: boolean;
  aliases: string[];
};

export type DocumentSchema = {
  documentType: DocumentType;
  version: string;
  fields: FieldDefinition[];
  criticalFields: string[];
};
