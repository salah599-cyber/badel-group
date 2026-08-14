import { AuthGate } from "@/components/AuthGate";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
