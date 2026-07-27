import { PmsShell } from "@/components/layout/PmsShell";

export default function PmsLayout({ children }: { children: React.ReactNode }) {
  return <PmsShell>{children}</PmsShell>;
}
