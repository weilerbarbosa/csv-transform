import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, CheckCircle2, XCircle, Clock, Upload } from "lucide-react";
import type { Transformation, Template, UploadLog } from "@shared/schema";

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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your file transformations and uploads</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Templates"
          value={stats.totalTemplates}
          icon={<FileSpreadsheet className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
          testId="stat-templates"
        />
        <StatCard
          title="Transformations"
          value={stats.totalTransformations}
          icon={<Upload className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
          testId="stat-transformations"
        />
        <StatCard
          title="Successful"
          value={stats.successful}
          icon={<CheckCircle2 className="h-4 w-4 text-chart-2" />}
          loading={isLoading}
          testId="stat-successful"
        />
        <StatCard
          title="Failed"
          value={stats.failed}
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          loading={isLoading}
          testId="stat-failed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Transformations</CardTitle>
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
                {transformations.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`row-transformation-${t.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.originalFileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.successRows}/{t.totalRows} rows
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No transformations yet" icon={<Upload className="h-8 w-8 text-muted-foreground" />} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent SFTP Uploads</CardTitle>
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
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`row-upload-${u.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
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
    completed: { label: "Success", className: "bg-chart-2/15 text-chart-2 border-transparent" },
    success: { label: "Success", className: "bg-chart-2/15 text-chart-2 border-transparent" },
    error: { label: "Error", className: "bg-destructive/15 text-destructive border-transparent" },
    failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-transparent" },
    pending: { label: "Pending", className: "bg-chart-4/15 text-chart-4 border-transparent" },
    processing: { label: "Processing", className: "bg-primary/15 text-primary border-transparent" },
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
