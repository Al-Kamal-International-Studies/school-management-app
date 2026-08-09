import Link from "next/link";
import { listUsers } from "./queries";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { ToggleActiveButton } from "./ToggleActiveButton";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { FadeUp } from "@/components/motion/FadeUp";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: "teacher" | "student" | "parent" }>;
}) {
  const { q, role } = await searchParams;
  const users = await listUsers({ role, q });

  return (
    <div className="space-y-8">
      <FadeUp className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">Users</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">Manage teacher and student accounts.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ExportCsvButton
            rows={users.map((u) => ({
              name: u.full_name,
              email: u.email,
              role: u.role,
              details: u.role === "student" ? u.student?.enrollment_number : u.teacher?.employee_id,
              status: u.is_active ? "Active" : "Deactivated",
            }))}
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "role", header: "Role" },
              { key: "details", header: "Details" },
              { key: "status", header: "Status" },
            ]}
            filename="users"
          />
          <Link href="/admin/users/new">
            <Button>Add user</Button>
          </Link>
        </div>
      </FadeUp>

      <FadeUp delay={0.08}>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor="q">
              Search
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Search by name or email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select id="role" name="role" defaultValue={role ?? ""} className="input bg-white dark:bg-navy-900">
              <option value="">All</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </FadeUp>

      <FadeUp delay={0.15}>
        {users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try a different search, or add your first teacher or student account."
          />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Details</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">
                    <Link href={`/admin/users/${u.id}`} className="hover:text-navy-600">
                      {u.full_name}
                    </Link>
                  </Td>
                  <Td>{u.email}</Td>
                  <Td className="capitalize">{u.role}</Td>
                  <Td>
                    {u.role === "student" && (
                      <span>
                        {u.student?.enrollment_number}
                        {u.className ? ` · ${u.className}` : ""}
                      </span>
                    )}
                    {u.role === "teacher" && <span>{u.teacher?.employee_id}</span>}
                  </Td>
                  <Td>
                    <Badge tone={u.is_active ? "green" : "red"}>{u.is_active ? "Active" : "Deactivated"}</Badge>
                  </Td>
                  <Td>
                    <ToggleActiveButton userId={u.id} isActive={u.is_active} />
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
