import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, UserPlus, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADMIN_ROLE_OPTIONS, type AdminRoleKey } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "Admin Users & Roles - RageNodes" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminUsersPage,
});

type RoleAssignment = {
  assignment_id: string;
  user_id: string;
  email: string;
  role_key: AdminRoleKey;
  role_name: string;
  assigned_at: string;
  expires_at: string | null;
};

function AdminUsersPage() {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRoleKey>("admin");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setErrorMessage(SUPABASE_CONFIG_ERROR);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase.rpc("list_admin_role_assignments");
    setLoading(false);

    if (error) {
      const message = `${error.message}. Make sure the latest admin roles SQL has been run.`;
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setAssignments((data ?? []) as RoleAssignment[]);
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const assignRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("assign_role_by_email", {
      target_email: email.trim(),
      target_role_key: role,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Role assigned.");
    setEmail("");
    await loadAssignments();
  };

  const revokeRole = async (assignment: RoleAssignment) => {
    if (!window.confirm(`Remove ${assignment.role_key} from ${assignment.email}?`)) return;

    const { error } = await supabase.rpc("revoke_role_by_email", {
      target_email: assignment.email,
      target_role_key: assignment.role_key,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Role removed.");
    setAssignments((current) =>
      current.filter((item) => item.assignment_id !== assignment.assignment_id),
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Security</p>
          <h1 className="mt-2 text-4xl font-bold">Users & roles</h1>
          <p className="mt-2 text-muted-foreground">
            Assign staff roles to Supabase users by email and review active access.
          </p>
        </div>
        <Button variant="outline" onClick={loadAssignments}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={assignRole}
        className="glass mt-8 grid gap-4 rounded-3xl p-5 lg:grid-cols-[1fr_220px_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="role-email">User email</Label>
          <Input
            id="role-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as AdminRoleKey)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            disabled={saving}
            className="h-11 w-full bg-gradient-to-r from-primary to-accent glow-red"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Assign
          </Button>
        </div>
      </form>

      <div className="glass mt-8 rounded-3xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Email</th>
                <th className="px-3 py-3 text-left">Role</th>
                <th className="px-3 py-3 text-left">Assigned</th>
                <th className="px-3 py-3 text-left">Expires</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                    Loading role assignments...
                  </td>
                </tr>
              )}
              {!loading && assignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                    No role assignments found.
                  </td>
                </tr>
              )}
              {assignments.map((assignment) => (
                <tr key={assignment.assignment_id} className="border-b border-white/5">
                  <td className="px-3 py-3 font-medium">{assignment.email}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {assignment.role_key}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {new Date(assignment.assigned_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {assignment.expires_at
                      ? new Date(assignment.expires_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => revokeRole(assignment)}>
                      <UserRoundMinus className="h-4 w-4" />
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
