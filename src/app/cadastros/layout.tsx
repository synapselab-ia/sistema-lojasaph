import { AdminShell } from "@/components/admin-shell";
import { DemoWorkspaceProvider } from "@/modules/master-data/ui/demo-workspace-provider";

export default function CadastrosLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <DemoWorkspaceProvider>
      <AdminShell>{children}</AdminShell>
    </DemoWorkspaceProvider>
  );
}
