import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Shared by Pending.tsx and PersonDetail.tsx. The name shown here is what
// the registrant self-attested at signup — NOT verified consent. The
// "Confirmed" checkbox only records that an admin has attempted to verify
// it with the named parent/guardian (phone/in person/community leader); it
// never blocks approve/reject. See BUILD_SPEC.md "Things Not To Guess On".
export default function ParentGuardianConsentSection({
  personId,
  parentGuardianName,
  parentGuardianConsentConfirmed,
}: {
  personId: Id<"people">;
  parentGuardianName?: string;
  parentGuardianConsentConfirmed?: boolean;
}) {
  const confirmParentGuardianConsent = useMutation(api.people.confirmParentGuardianConsent);

  return (
    <div className="under13-notice">
      <strong>Registered as under 13.</strong>{" "}
      <span>Parent/guardian named by registrant: {parentGuardianName || "(none given)"}</span>
      <label className="under13-confirm-label">
        <input
          type="checkbox"
          checked={!!parentGuardianConsentConfirmed}
          onChange={(e) => confirmParentGuardianConsent({ id: personId, confirmed: e.target.checked })}
        />
        Confirmed — admin has attempted to verify with this parent/guardian
      </label>
    </div>
  );
}
