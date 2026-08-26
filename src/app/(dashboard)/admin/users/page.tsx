import Link from "next/link";
import { listUsers } from "./queries";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { ToggleActiveButton } from "./ToggleActiveButton";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: "teacher" | "student" | "parent" }>;
}) {
  const { q, role } = await searchParams;
  // admin/layout.tsx's requireRole("admin") guarantees a profile, so this
  // is never actually null — see getActiveCenterForRequest's doc comment.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const users = await listUsers({ role, q }, activeCenterId);
  const dict = await getDictionary(await getLocale());
  const roleLabel = { admin: dict.common.roleAdmin, teacher: dict.common.roleTeacher, student: dict.common.roleStudent, parent: dict.common.roleParent };

  return (
    <div className="space-y-8">
      <FadeUp className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.adminUsers.title}</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.adminUsers.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ExportCsvButton
            rows={users.map((u) => ({
              name: u.full_name,
              email: u.email,
              role: u.role,
              details: u.role === "student" ? u.student?.enrollment_number : u.teacher?.employee_id,
              status: u.is_active ? dict.common.active : dict.common.deactivated,
            }))}
            columns={[
              { key: "name", header: dict.common.name },
              { key: "email", header: dict.common.email },
              { key: "role", header: dict.common.role },
              { key: "details", header: dict.common.details },
              { key: "status", header: dict.common.status },
            ]}
            filename="users"
          />
          <Link href="/admin/users/new">
            <Button>{dict.adminUsers.addUser}</Button>
          </Link>
        </div>
      </FadeUp>

      <FadeUp delay={0.08}>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor="q">
              {dict.common.search}
            </label>
            <input id="q" name="q" defaultValue={q} placeholder={dict.adminUsers.searchPlaceholder} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="role">
              {dict.common.role}
            </label>
            <select id="role" name="role" defaultValue={role ?? ""} className="input bg-white dark:bg-navy-900">
              <option value="">{dict.common.all}</option>
              <option value="teacher">{dict.common.roleTeacher}</option>
              <option value="student">{dict.common.roleStudent}</option>
              <option value="parent">{dict.common.roleParent}</option>
            </select>
          </div>
          <Button type="submit" variant="secondary">
            {dict.common.filter}
          </Button>
        </form>
      </FadeUp>

      <FadeUp delay={0.15}>
        {users.length === 0 ? (
          <EmptyState
            title={dict.adminUsers.noUsersFound}
            description={dict.adminUsers.noUsersFoundDescription}
          />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.common.name}</Th>
                <Th>{dict.common.email}</Th>
                <Th>{dict.common.role}</Th>
                <Th>{dict.common.details}</Th>
                <Th>{dict.common.status}</Th>
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
                  <Td>{roleLabel[u.role]}</Td>
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
                    <Badge tone={u.is_active ? "green" : "red"}>{u.is_active ? dict.common.active : dict.common.deactivated}</Badge>
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
