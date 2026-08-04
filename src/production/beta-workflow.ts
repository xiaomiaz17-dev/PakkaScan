/**
 * PD-035 — Customer-facing guided upload → processing → report-ready workflow.
 */

import type { ProcessingStatus } from "./job-completion";

export type WorkflowStep =
  | "CREATE_PROPERTY"
  | "UPLOAD_DOCUMENTS"
  | "PROCESSING"
  | "REPORT_READY"
  | "FAILED";

export type GuidedWorkflowState = {
  propertyId: string;
  step: WorkflowStep;
  message: string;
  processing?: ProcessingStatus;
  nextActions: string[];
};

export function deriveGuidedWorkflow(input: {
  propertyId: string;
  documentCount: number;
  processing?: ProcessingStatus;
}): GuidedWorkflowState {
  if (input.documentCount < 1) {
    return {
      propertyId: input.propertyId,
      step: "UPLOAD_DOCUMENTS",
      message: "Upload land records (Fard, Mutation, CNIC) to begin analysis.",
      nextActions: ["upload_document"],
    };
  }
  const processing = input.processing;
  if (!processing || processing.overall === "QUEUED" || processing.overall === "PROCESSING") {
    return {
      propertyId: input.propertyId,
      step: "PROCESSING",
      message: "Documents are being classified and scored. You will be notified when the report is ready.",
      processing,
      nextActions: ["poll_status"],
    };
  }
  if (processing.overall === "FAILED") {
    return {
      propertyId: input.propertyId,
      step: "FAILED",
      message: "Processing failed. Review failed stages or re-upload clearer scans.",
      processing,
      nextActions: ["retry_upload", "contact_support"],
    };
  }
  return {
    propertyId: input.propertyId,
    step: "REPORT_READY",
    message: "Your PakkaScore report is ready.",
    processing,
    nextActions: ["view_report", "download_report"],
  };
}
