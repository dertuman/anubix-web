'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserX,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Types ─────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  is_admin: boolean;
  is_deleted: boolean;
  created_at: string;
  machine_status: string | null;
  fly_app_name: string | null;
  has_claude: boolean;
  has_github: boolean;
}

// ── Machine status badge ──────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  running:      'bg-green-500/15 text-green-600 border-green-500/30',
  starting:     'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  provisioning: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  stopping:     'bg-orange-500/15 text-orange-600 border-orange-500/30',
  stopped:      'bg-muted text-muted-foreground border-border/50',
  error:        'bg-destructive/15 text-destructive border-destructive/30',
  destroying:   'bg-muted text-muted-foreground border-border/50',
  destroyed:    'bg-muted text-muted-foreground border-border/50',
};

function MachineStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full border border-border/30 px-2 py-0.5 text-xs text-muted-foreground">
        No machine
      </span>
    );
  }
  const cls = STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground border-border/50';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-block size-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
      title={connected ? 'Connected' : 'Not connected'}
    />
  );
}

// ── Confirm dialog ────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, description, destructive, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="size-4 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : destructive ? <Trash2 className="size-3" /> : <Check className="size-3" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset machine dialog
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string; flyApp: string | null }>({
    open: false, userId: '', flyApp: null,
  });
  const [resetting, setResetting] = useState(false);

  // Toggle admin dialog
  const [adminDialog, setAdminDialog] = useState<{ open: boolean; userId: string; currentValue: boolean }>({
    open: false, userId: '', currentValue: false,
  });
  const [togglingAdmin, setTogglingAdmin] = useState(false);

  // Delete user dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; flyApp: string | null }>({
    open: false, userId: '', flyApp: null,
  });
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to load users');
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) =>
    u.id.toLowerCase().includes(search.toLowerCase()) ||
    (u.fly_app_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  // ── Actions ──

  const handleResetMachine = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetDialog.userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Reset failed');
      } else {
        await fetchUsers();
      }
    } catch {
      setError('Reset failed');
    } finally {
      setResetting(false);
      setResetDialog({ open: false, userId: '', flyApp: null });
    }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteDialog.userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Delete failed');
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== deleteDialog.userId));
      }
    } catch {
      setError('Delete failed');
    } finally {
      setDeleting(false);
      setDeleteDialog({ open: false, userId: '', flyApp: null });
    }
  };

  const handleToggleAdmin = async () => {
    setTogglingAdmin(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminDialog.userId, is_admin: !adminDialog.currentValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update admin status');
      } else {
        setUsers((prev) =>
          prev.map((u) => u.id === adminDialog.userId ? { ...u, is_admin: !adminDialog.currentValue } : u),
        );
      }
    } catch {
      setError('Failed to update admin status');
    } finally {
      setTogglingAdmin(false);
      setAdminDialog({ open: false, userId: '', currentValue: false });
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Loading…' : `${filtered.length} of ${users.length} users`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user ID or app name…"
              className="h-8 w-64 pl-8 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading} className="h-8 gap-1.5">
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-[200px] text-xs">User ID</TableHead>
              <TableHead className="text-xs">Machine</TableHead>
              <TableHead className="text-xs">Claude</TableHead>
              <TableHead className="text-xs">GitHub</TableHead>
              <TableHead className="text-xs">Admin</TableHead>
              <TableHead className="text-xs">Joined</TableHead>
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {search ? 'No users match your search.' : 'No users found.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id} className="border-border/50">
                  {/* User ID */}
                  <TableCell className="font-mono text-xs">
                    <span title={user.id} className="block max-w-[180px] truncate">
                      {user.id}
                    </span>
                    {user.fly_app_name && (
                      <span className="block truncate text-[10px] text-muted-foreground" title={user.fly_app_name}>
                        {user.fly_app_name}
                      </span>
                    )}
                  </TableCell>

                  {/* Machine */}
                  <TableCell>
                    <MachineStatusBadge status={user.machine_status} />
                  </TableCell>

                  {/* Claude */}
                  <TableCell>
                    <ConnectionDot connected={user.has_claude} />
                  </TableCell>

                  {/* GitHub */}
                  <TableCell>
                    <ConnectionDot connected={user.has_github} />
                  </TableCell>

                  {/* Admin */}
                  <TableCell>
                    {user.is_admin ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        <Shield className="size-2.5" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Toggle admin */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        title={user.is_admin ? 'Revoke admin' : 'Grant admin'}
                        onClick={() => setAdminDialog({ open: true, userId: user.id, currentValue: user.is_admin })}
                      >
                        {user.is_admin ? (
                          <ShieldOff className="size-3.5 text-muted-foreground" />
                        ) : (
                          <Shield className="size-3.5 text-muted-foreground" />
                        )}
                      </Button>

                      {/* Reset machine */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Reset machine only"
                        disabled={!user.machine_status}
                        onClick={() => setResetDialog({ open: true, userId: user.id, flyApp: user.fly_app_name })}
                      >
                        <Trash2 className="size-3.5" />
                        Reset
                      </Button>

                      {/* Nuke user */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete user permanently"
                        onClick={() => setDeleteDialog({ open: true, userId: user.id, flyApp: user.fly_app_name })}
                      >
                        <UserX className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reset machine confirmation */}
      <ConfirmDialog
        open={resetDialog.open}
        title="Reset Machine"
        description={
          resetDialog.flyApp
            ? `This will destroy the Fly.io app "${resetDialog.flyApp}" and delete all machine-related data (credentials, env vars, bridge config) for this user. The user account itself will be kept. This cannot be undone.`
            : 'This will delete all machine-related data for this user. The user account itself will be kept. This cannot be undone.'
        }
        destructive
        loading={resetting}
        onConfirm={handleResetMachine}
        onCancel={() => setResetDialog({ open: false, userId: '', flyApp: null })}
      />

      {/* Toggle admin confirmation */}
      <ConfirmDialog
        open={adminDialog.open}
        title={adminDialog.currentValue ? 'Revoke Admin Access' : 'Grant Admin Access'}
        description={
          adminDialog.currentValue
            ? 'This user will no longer have access to the admin panel.'
            : 'This user will gain full admin panel access.'
        }
        loading={togglingAdmin}
        onConfirm={handleToggleAdmin}
        onCancel={() => setAdminDialog({ open: false, userId: '', currentValue: false })}
      />

      {/* Delete user confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Permanently Delete User"
        description={
          `This will destroy the Fly.io machine${deleteDialog.flyApp ? ` (${deleteDialog.flyApp})` : ''}, delete ALL user data from the database, and remove the account from Clerk. This is irreversible.`
        }
        destructive
        loading={deleting}
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteDialog({ open: false, userId: '', flyApp: null })}
      />
    </>
  );
}
