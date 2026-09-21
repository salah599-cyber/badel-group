"use server";

import { closeRegistrationCore, type CloseRegistrationResult } from "@/lib/bracket/close-registration-core";
import { requirePermission } from "@/lib/auth";
import { canManageTournament } from "@/lib/permissions";

export type { CloseRegistrationResult };

export async function closeRegistrationAction(
  tournamentId: string,
): Promise<CloseRegistrationResult> {
  try {
    const ctx = await requirePermission("results:manage");
    if (!canManageTournament(ctx, tournamentId)) {
      return { ok: false, error: "You do not have access to this tournament" };
    }

    const result = await closeRegistrationCore({
      tournamentId,
      adminId: ctx.userId,
      adminEmail: ctx.email,
    });
    // #region agent log
    fetch('http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9848f0'},body:JSON.stringify({sessionId:'9848f0',location:'close-registration.ts:result',message:'closeRegistrationAction core result',data:{ok:result.ok,error:result.ok === false ? result.error : null},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (error) {
    console.error("[close-registration-action]", error);
    const message = error instanceof Error ? error.message : "";
    // #region agent log
    fetch('http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9848f0'},body:JSON.stringify({sessionId:'9848f0',location:'close-registration.ts:catch',message:'closeRegistrationAction threw',data:{message,errName:error instanceof Error ? error.name : typeof error},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return {
      ok: false,
      error: message || "Could not close registration. Please try again.",
    };
  }
}
