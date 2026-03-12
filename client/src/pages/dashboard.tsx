import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Plus,
  Sparkles,
  FolderUp,
  ArrowRight,
} from "lucide-react";
import type { Transformation, Template, UploadLog } from "@shared/schema";

function relativeTime(dateStr: string | Date): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Dashboard() {
  const { data: transformations, isLoading: loadingTransformations } = useQuery<Transformation[]>({
    queryKey: ["/api/transformations"],
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: uploads, isLoading: loadingUploads } = useQuery<UploadLog[]>({
    queryKey: ["/api/upload-logs"],
  });

  const stats = {
    totalTemplates: templates?.length ?? 0,
    totalTransformations: transformations?.length ?? 0,
    successful: transformations?.filter((t) => t.status === "completed").length ?? 0,
    failed: transformations?.filter((t) => t.status === "error").length ?? 0,
    pending: transformations?.filter((t) => t.status === "pending" || t.status === "processing").length ?? 0,
    totalUploads: uploads?.length ?? 0,
  };

  const isLoading = loadingTransformations || loadingTemplates || loadingUploads;

  // Build a template lookup map
  const templateMap = new Map<number, Template>();
  templates?.forEach((t) => templateMap.set(t.id, t));

  // Success rate visual
  const totalDone = stats.successful + stats.failed;
  const successPct = totalDone > 0 ? Math.round((stats.successful / totalDone) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your file transformations and uploads</p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/templates">
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Create Template
              </Button>
            </Link>
            <Link href="/transform">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Transform File
              </Button>
            </Link>
            <Link href="/sftp">
              <Button variant="outline" size="sm" className="gap-2">
                <FolderUp className="h-3.5 w-3.5" />
                Upload to SFTP
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Templates"
          value={stats.totalTemplates}
          icon={<FileSpreadsheet className="h-4 w-4 text-cyan-400" />}
          loading={isLoading}
          testId="stat-templates"
        />
        <StatCard
          title="Transformations"
          value={stats.totalTransformations}
          icon={<Upload className="h-4 w-4 text-cyan-400" />}
          loading={isLoading}
          testId="stat-transformations"
        />
        <StatCard
          title="Successful"
          value={stats.successful}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          loading={isLoading}
          testId="stat-successful"
        />
        <StatCard
          title="Failed"
          value={stats.failed}
          icon={<XCircle className="h-4 w-4 text-red-400" />}
          loading={isLoading}
          testId="stat-failed"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          loading={isLoading}
          testId="stat-pending"
        />
      </div>

      {/* Success Rate Visual */}
      {!isLoading && totalDone > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Transformation Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {stats.successful} successful / {totalDone} total
                  </span>
                  <span className="text-sm font-semibold">{successPct}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                    style={{ width: `${successPct}%` }}
                  />
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${100 - successPct}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Successful ({stats.successful})
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    Failed ({stats.failed})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Transformations</CardTitle>
            {transformations && transformations.length > 0 && (
              <Link href="/transform">
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transformations && transformations.length > 0 ? (
              <div className="space-y-3">
                {transformations.slice(0, 5).map((t) => {
                  const tpl = templateMap.get(t.templateId);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors"
                      data-testid={`row-transformation-${t.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.originalFileName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {tpl && (
                              <>
                                <span className="truncate max-w-[120px]">{tpl.name}</span>
                                <span>&middot;</span>
                              </>
                            )}
                            <span>{t.successRows}/{t.totalRows} rows</span>
                            <span>&middot;</span>
                            <span>{relativeTime(t.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No transformations yet" icon={<Upload className="h-8 w-8 text-muted-foreground" />} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent SFTP Uploads</CardTitle>
            {uploads && uploads.length > 0 && (
              <Link href="/sftp">
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : uploads && uploads.length > 0 ? (
              <div className="space-y-3">
                {uploads.slice(0, 5).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors"
                    data-testid={`row-upload-${u.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FolderUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {relativeTime(u.createdAt)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No uploads yet" icon={<Upload className="h-8 w-8 text-muted-foreground" />} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  loading,
  testId,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold" data-testid={`text-${testId}-value`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    completed: { label: "Success", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    success: { label: "Success", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    error: { label: "Error", className: "bg-red-500/15 text-red-400 border-red-500/20" },
    failed: { label: "Failed", className: "bg-red-500/15 text-red-400 border-red-500/20" },
    pending: { label: "Pending", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    processing: { label: "Processing", className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  };
  const v = variants[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icon}
      <p className="text-sm text-muted-foreground mt-2">{message}</p>
    </div>
  );
}
