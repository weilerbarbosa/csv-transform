import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  FolderUp,
  CheckCircle2,
  XCircle,
  Upload,
  RotateCw,
  Server,
  AlertCircle,
  Settings,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import type { Transformation, SftpConfig, UploadLog } from "@shared/schema";

export default function SftpUpload() {
  const { toast } = useToast();
  const [selectedTransformationId, setSelectedTransformationId] = useState<string>("");
  const [selectedSftpId, setSelectedSftpId] = useState<string>("");
  const [uploadResult, setUploadResult] = useState<{ status: string; message: string } | null>(null);

  const { data: transformations, isLoading: loadingTransformations } = useQuery<Transformation[]>({
    queryKey: ["/api/transformations"],
  });

  const { data: sftpConfigs, isLoading: loadingSftp } = useQuery<SftpConfig[]>({
    queryKey: ["/api/sftp-configs"],
  });

  const { data: uploadLogs, isLoading: loadingLogs } = useQuery<UploadLog[]>({
    queryKey: ["/api/upload-logs"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTransformationId || !selectedSftpId) throw new Error("Missing selection");
      const res = await fetch("/api/sftp/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transformationId: parseInt(selectedTransformationId),
          sftpConfigId: parseInt(selectedSftpId),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setUploadResult({ status: "success", message: data.message || "File uploaded successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/upload-logs"] });
      toast({ title: "Upload successful", description: "File has been uploaded to SFTP server." });
    },
    onError: (err: Error) => {
      setUploadResult({ status: "error", message: err.message });
      queryClient.invalidateQueries({ queryKey: ["/api/upload-logs"] });
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const completedTransformations = transformations?.filter((t) => t.status === "completed") ?? [];

  // Get selected items for preview
  const selectedTransformation = useMemo(() => {
    if (!selectedTransformationId || !transformations) return null;
    return transformations.find((t) => String(t.id) === selectedTransformationId) || null;
  }, [selectedTransformationId, transformations]);

  const selectedSftpConfig = useMemo(() => {
    if (!selectedSftpId || !sftpConfigs) return null;
    return sftpConfigs.find((s) => String(s.id) === selectedSftpId) || null;
  }, [selectedSftpId, sftpConfigs]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-sftp-title">SFTP Upload</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload transformed CSV files to your SFTP server
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Upload Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Transformed File</Label>
                {loadingTransformations ? (
                  <Skeleton className="h-9 w-full" />
                ) : completedTransformations.length > 0 ? (
                  <Select value={selectedTransformationId} onValueChange={setSelectedTransformationId}>
                    <SelectTrigger data-testid="select-transformation">
                      <SelectValue placeholder="Select a file" />
                    </SelectTrigger>
                    <SelectContent>
                      {completedTransformations.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.originalFileName} ({t.successRows} rows)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No completed transformations available.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>SFTP Server</Label>
                {loadingSftp ? (
                  <Skeleton className="h-9 w-full" />
                ) : sftpConfigs && sftpConfigs.length > 0 ? (
                  <Select value={selectedSftpId} onValueChange={setSelectedSftpId}>
                    <SelectTrigger data-testid="select-sftp-config">
                      <SelectValue placeholder="Select SFTP server" />
                    </SelectTrigger>
                    <SelectContent>
                      {sftpConfigs.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} ({s.host})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No SFTP servers configured.
                    </p>
                    <Link href="/sftp-settings">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Settings className="h-3.5 w-3.5" />
                        Go to SFTP Settings
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Preview selected items before upload */}
              {(selectedTransformation || selectedSftpConfig) && (
                <div className="rounded-md border p-3 bg-muted/30 space-y-3">
                  <span className="text-xs font-medium text-muted-foreground">Upload Summary</span>
                  {selectedTransformation && (
                    <div className="flex items-start gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{selectedTransformation.originalFileName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedTransformation.successRows} rows &middot; {selectedTransformation.status}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedTransformation && selectedSftpConfig && (
                    <div className="flex justify-center">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  {selectedSftpConfig && (
                    <div className="flex items-start gap-2">
                      <Server className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{selectedSftpConfig.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedSftpConfig.host}:{selectedSftpConfig.port} &middot; {selectedSftpConfig.remotePath}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => {
                  setUploadResult(null);
                  uploadMutation.mutate();
                }}
                disabled={!selectedTransformationId || !selectedSftpId || uploadMutation.isPending}
                data-testid="button-sftp-upload"
              >
                {uploadMutation.isPending ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FolderUp className="h-4 w-4 mr-2" />
                    Upload to SFTP
                  </>
                )}
              </Button>

              {uploadResult && (
                <Alert variant={uploadResult.status === "success" ? "default" : "destructive"}>
                  {uploadResult.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {uploadResult.status === "success" ? "Upload Successful" : "Upload Failed"}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {uploadResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">Upload History</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : uploadLogs && uploadLogs.length > 0 ? (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-upload-log-${log.id}`}>
                          <TableCell className="text-xs font-medium">{log.fileName}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                log.status === "success"
                                  ? "bg-cyan-500/15 text-cyan-400 border-transparent"
                                  : log.status === "error" || log.status === "failed"
                                  ? "bg-destructive/15 text-red-400 border-transparent"
                                  : "bg-amber-500/15 text-amber-400 border-transparent"
                              }
                            >
                              {log.status === "success" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                            {log.errorMessage || "--"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No uploads yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a transformation and SFTP server to start
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
