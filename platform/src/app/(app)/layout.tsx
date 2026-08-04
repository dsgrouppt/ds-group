import { requireUser } from "@/lib/session";
import { accessibleModules } from "@/lib/permissions";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const allowed = accessibleModules(user.role);

  return (
    <AppShell allowed={allowed} user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </AppShell>
  );
}
