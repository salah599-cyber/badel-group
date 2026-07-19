type AccessMetadata = {
  role?: string;
  approved?: boolean;
  status?: string;
};

export function getAccessFromClaims(
  sessionClaims: Record<string, unknown> | null | undefined,
) {
  const meta = (sessionClaims?.metadata ?? sessionClaims?.public_metadata) as
    | AccessMetadata
    | undefined;

  const isAdmin = meta?.role === "admin";
  const isApproved = isAdmin || meta?.approved === true;

  return { isAdmin, isApproved, meta };
}
