import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { countUnreadMessages } from "@/lib/portal-data";
import { PortalShell } from "@/components/layout/PortalShell";

export const metadata: Metadata = {
  title: { default: "Portal do Cliente — DS Projects", template: "%s — Portal DS Projects" },
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const client = await requireClient();
  const unreadMessages = await countUnreadMessages(client.id);

  return (
    <PortalShell client={{ name: client.name, email: client.email }} unreadMessages={unreadMessages}>
      {children}
    </PortalShell>
  );
}
