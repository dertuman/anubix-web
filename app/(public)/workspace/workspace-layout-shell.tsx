'use client';

interface WorkspaceLayoutShellProps {
  children: React.ReactNode;
}

export default function WorkspaceLayoutShell({ children }: WorkspaceLayoutShellProps) {
  return (
    <div className="fixed inset-0 overflow-hidden">{children}</div>
  );
}
