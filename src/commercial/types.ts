export type UserRole = "CUSTOMER" | "REVIEWER" | "ADMIN";
export type SubscriptionPlan = "FREE" | "REPORT" | "PROFESSIONAL" | "ENTERPRISE";
export type PropertyWorkspaceStatus = "DRAFT" | "UPLOADING" | "PROCESSING" | "REVIEW_REQUIRED" | "REPORT_READY" | "FAILED";
export type AuditAction = "USER_REGISTERED" | "PROPERTY_CREATED" | "DOCUMENT_UPLOADED" | "REPORT_GENERATED" | "REPORT_DOWNLOADED" | "REVIEW_OPENED" | "BILLING_CHANGED";

export type BetaUser = { id:string; email:string; displayName:string; role:UserRole; passwordHash:string; verified:boolean; createdAt:string };
export type Session = { id:string; userId:string; tokenHash:string; expiresAt:string; revokedAt?:string };
export type WorkspaceProperty = { id:string; userId:string; label:string; jurisdiction:string; status:PropertyWorkspaceStatus; passportPublicId?:string; latestReportVerificationId?:string; createdAt:string; updatedAt:string };
export type Entitlement = { plan:SubscriptionPlan; maxProperties:number | null; reportsPerMonth:number | null; watermark:boolean; evidenceViewer:boolean; priorityProcessing:boolean };
export type AuditEvent = { id:string; actorId:string; action:AuditAction; resourceType:string; resourceId:string; occurredAt:string; metadata:Record<string,string|number|boolean> };
export type SignedDelivery = { verificationId:string; expiresAt:string; signature:string; path:string };
export type AdminMetrics = { users:number; properties:number; reportReady:number; reviewRequired:number; processing:number; failed:number; auditEvents:number };
