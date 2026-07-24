export function MembershipNumberLabel({
  membershipNumber,
  className = "",
}: {
  membershipNumber: string | null | undefined;
  className?: string;
}) {
  if (!membershipNumber) {
    return (
      <p className={`text-xs text-gray-400 ${className}`.trim()}>
        Membership # not assigned yet
      </p>
    );
  }

  return (
    <p className={`text-sm font-semibold tracking-widest text-primary ${className}`.trim()}>
      Membership #{membershipNumber}
    </p>
  );
}
