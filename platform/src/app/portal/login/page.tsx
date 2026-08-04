import { Suspense } from "react";
import type { Metadata } from "next";
import { ClientLoginForm } from "@/components/ClientLoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal do Cliente — DS Projects",
  robots: { index: false, follow: false },
};

export default function PortalLoginPage() {
  return (
    <Suspense fallback={null}>
      <ClientLoginForm />
    </Suspense>
  );
}
