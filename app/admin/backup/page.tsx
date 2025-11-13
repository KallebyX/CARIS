'use client';

/**
 * Admin Backup Dashboard
 * Comprehensive backup and recovery management interface
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Upload,
  Database,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface BackupItem {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental';
  size: number;
  compressed: boolean;
  encrypted?: boolean;
  status: string;
  checksum?: string;
  filesBackedUp?: number;
  totalSize?: number;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  totalSizeMB: string;
  oldestBackup: string | null;
  newestBackup: string | null;
}

export default function BackupDashboard() {
  const [loading, setLoading] = useState(true);
  const [databaseBackups, setDatabaseBackups] = useState<BackupItem[]>([]);
  const [fileBackups, setFileBackups] = useState<BackupItem[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [activeTab, setActiveTab] = useState<'database' | 'files'>('database');
  const [creatingBackup, setCreatingBackup] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/backup/list?includeFiles=true&includeStats=true');
      const data = await response.json();

      if (data.success) {
        setDatabaseBackups(data.data.database || []);
        setFileBackups(data.data.files || []);
        setStats(data.data.stats);
      } else {
        toast.error('Failed to load backups');
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async (type: 'full' | 'incremental') => {
    try {
      setCreatingBackup(true);
      toast.info(`Creating ${type} backup...`);

      const response = await fetch('/api/admin/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, includeFiles: true }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${type} backup created successfully!`);
        fetchBackups();
      } else {
        toast.error(data.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  const verifyBackup = async (backupId: string, type: 'database' | 'files') => {
    try {
      toast.info('Verifying backup...');

      const response = await fetch('/api/admin/backup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId, type }),
      });

      const data = await response.json();

      if (data.success && data.data.isValid) {
        toast.success('Backup verification successful!');
      } else {
        toast.error('Backup verification failed!');
      }
    } catch (error) {
      console.error('Error verifying backup:', error);
      toast.error('Failed to verify backup');
    }
  };

  const testRestore = async (backupId: string, type: 'database' | 'files') => {
    try {
      toast.info('Testing restoration (dry run)...');

      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId, type, dryRun: true }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Restore test successful! Backup can be restored.');
      } else {
        toast.error('Restore test failed!');
      }
    } catch (error) {
      console.error('Error testing restore:', error);
      toast.error('Failed to test restore');
    }
  };

  const performRestore = async (backupId: string, type: 'database' | 'files') => {
    const confirmed = window.confirm(
      `⚠️ WARNING: This will OVERWRITE your current ${type}!\n\n` +
      `Are you absolutely sure you want to restore from backup ${backupId}?\n\n` +
      `This action cannot be undone!`
    );

    if (!confirmed) return;

    try {
      toast.info(`Restoring ${type}...`);

      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId, type, dryRun: false }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${type} restored successfully!`);
        if (type === 'database') {
          toast.info('Please refresh the page to see updated data.');
        }
      } else {
        toast.error(data.error || 'Restoration failed!');
      }
    } catch (error) {
      console.error('Error restoring:', error);
      toast.error('Failed to restore');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'verified':
        return <Badge variant="default" className="bg-blue-500">Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const currentBackups = activeTab === 'database' ? databaseBackups : fileBackups;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Backup & Recovery</h1>
        <p className="text-muted-foreground">
          Manage database and file backups, verify integrity, and restore from backups
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBackups}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSizeMB} MB</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest Backup</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {stats.newestBackup ? formatDate(stats.newestBackup) : 'No backups'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Oldest Backup</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {stats.oldestBackup ? formatDate(stats.oldestBackup) : 'No backups'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Actions</CardTitle>
          <CardDescription>Create new backups or refresh the list</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={() => createBackup('full')}
            disabled={creatingBackup}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            Create Full Backup
          </Button>

          <Button
            onClick={() => createBackup('incremental')}
            disabled={creatingBackup}
            variant="secondary"
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            Create Incremental Backup
          </Button>

          <Button
            onClick={fetchBackups}
            disabled={loading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Always test backups before relying on them for recovery.
          Verify backup integrity regularly and test restore procedures monthly.
        </AlertDescription>
      </Alert>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backups</CardTitle>
              <CardDescription>View and manage your backup history</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'database' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('database')}
              >
                Database ({databaseBackups.length})
              </Button>
              <Button
                variant={activeTab === 'files' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('files')}
              >
                Files ({fileBackups.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading backups...</div>
          ) : currentBackups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {activeTab} backups found. Create your first backup to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  {activeTab === 'files' && <TableHead>Files</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBackups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-mono text-xs">{backup.id}</TableCell>
                    <TableCell>{formatDate(backup.timestamp)}</TableCell>
                    <TableCell>
                      <Badge variant={backup.type === 'full' ? 'default' : 'secondary'}>
                        {backup.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatBytes(backup.size || backup.totalSize || 0)}</TableCell>
                    {activeTab === 'files' && (
                      <TableCell>{backup.filesBackedUp || 0}</TableCell>
                    )}
                    <TableCell>{getStatusBadge(backup.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verifyBackup(backup.id, activeTab)}
                          title="Verify backup integrity"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testRestore(backup.id, activeTab)}
                          title="Test restore (dry run)"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => performRestore(backup.id, activeTab)}
                          title="Restore from backup"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Backup Schedule Info */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Backup Schedule</CardTitle>
          <CardDescription>Backups are automatically created according to this schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Daily Incremental:</span>
            <span className="text-muted-foreground">3:00 AM (every day)</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Weekly Full:</span>
            <span className="text-muted-foreground">2:00 AM (Sundays)</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Monthly Archival:</span>
            <span className="text-muted-foreground">1:00 AM (1st of month)</span>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">
              Retention: 7 daily, 4 weekly, 12 monthly backups
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
