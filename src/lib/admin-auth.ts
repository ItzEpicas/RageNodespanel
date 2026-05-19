import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AdminRoleKey = "owner" | "admin" | "manager" | "support" | "viewer";

export const ADMIN_ROLE_OPTIONS: AdminRoleKey[] = [
  "owner",
  "admin",
  "manager",
  "support",
  "viewer",
];

export type AdminAccessState =
  | { status: "allowed"; session: Session; email: string; isOwner: boolean }
  | { status: "signed_out"; session: null; email: null; isOwner: false }
  | { status: "forbidden"; session: Session; email: string; isOwner: boolean }
  | {
      status: "error";
      session: Session | null;
      email: string | null;
      isOwner: false;
      message: string;
    };

export async function getAdminAccessState(): Promise<AdminAccessState> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      status: "error",
      session: null,
      email: null,
      isOwner: false,
      message: sessionError.message,
    };
  }

  const session = sessionData.session;
  if (!session) {
    return { status: "signed_out", session: null, email: null, isOwner: false };
  }

  const email = session.user.email ?? "";
  const { data: canAccess, error: accessError } = await supabase.rpc(
    "current_user_can_access_admin",
  );

  if (accessError) {
    return {
      status: "error",
      session,
      email,
      isOwner: false,
      message: `${accessError.message}. Run the latest Supabase admin roles SQL.`,
    };
  }

  const { data: isOwner } = await supabase.rpc("current_user_has_role", {
    role_key_to_check: "owner",
  });

  if (canAccess) {
    return { status: "allowed", session, email, isOwner: Boolean(isOwner) };
  }

  return { status: "forbidden", session, email, isOwner: Boolean(isOwner) };
}
