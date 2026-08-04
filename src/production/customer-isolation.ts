/**
 * PD-036 — Customer isolation checks for property/document access.
 */

export type OwnedResource = {
  id: string;
  userId: string;
};

export function assertOwner(resource: OwnedResource | undefined, userId: string): OwnedResource {
  if (!resource) throw new Error("NOT_FOUND");
  if (resource.userId !== userId) throw new Error("FORBIDDEN");
  return resource;
}

export function filterOwned<T extends { userId: string }>(items: T[], userId: string): T[] {
  return items.filter((item) => item.userId === userId);
}
