export type DuplicateRecord = {
  documentId: string;
  sha256: string;
  propertyId: string;
  filename: string;
};

export class DuplicateIndex {
  private readonly byHash = new Map<string, DuplicateRecord[]>();

  add(record: DuplicateRecord): void {
    const existing = this.byHash.get(record.sha256) ?? [];
    if (!existing.some((item) => item.documentId === record.documentId)) {
      existing.push(record);
      this.byHash.set(record.sha256, existing);
    }
  }

  find(sha256: string): DuplicateRecord[] {
    return [...(this.byHash.get(sha256) ?? [])];
  }

  isDuplicateWithinProperty(input: { sha256: string; propertyId: string }): boolean {
    return this.find(input.sha256).some((item) => item.propertyId === input.propertyId);
  }
}
