import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Upload,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  RotateCw,
  RefreshCcw,
  Columns3,
} from "lucide-react";
import type { Template, Transformation, ColumnMapping, TransformationError } from "@shared/schema";

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Select Template" },
    { num: 2, label: "Upload File" },
    { num: 3, label: "Review Results" },
  ];

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const isActive = currentStep === step.num;
        const isDone = currentStep > step.num;
        return (
          <div key={step.num} className="flex items-center">
            {i > 0 && (
              <div className={`w-8 sm:w-12 h-0.5 ${isDone ? "bg-primary" : "bg-muted"}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.num}
              </div>
              <span className={`text-[10px] sm:text-xs whitespace-nowrap ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Transform() {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentTransformation, setCurrentTransformation] = useState<Transformation | null>(null);

  const { data: templates, isLoading: loadingTemplates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const transformMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !selectedTemplateId) throw new Error("Missing data");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("templateId", selectedTemplateId);

      const res = await fetch("/api/transform", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || "Transformation failed");
      }
      return res.json();
    },
    onSuccess: (data: Transformation) => {
      setCurrentTransformation(data);
      queryClient.invalidateQueries({ queryKey: ["/api/transformations"] });
      toast({ title: "Transformation complete", description: "Your file has been processed." });
    },
    onError: (err: Error) => {
      toast({ title: "Transformation failed", description: err.message, variant: "destructive" });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setCurrentTransformation(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const downloadCsv = () => {
    if (!currentTransformation?.id) return;
    window.open(`/api/transformations/${currentTransformation.id}/download`, "_blank");
  };

  const resetForm = () => {
    setSelectedTemplateId("");
    setSelectedFile(null);
    setCurrentTransformation(null);
  };

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || !templates) return null;
    return templates.find((t) => String(t.id) === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  const mappings = currentTransformation?.columnMappings as ColumnMapping[] | null;
  const errors = currentTransformation?.errors as TransformationError[] | null;
  const successRate =
    currentTransformation && currentTransformation.totalRows
      ? Math.round(((currentTransformation.successRows ?? 0) / currentTransformation.totalRows) * 100)
      : 0;

  // Determine current step
  const currentStep = currentTransformation ? 3 : selectedFile && selectedTemplateId ? 2 : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-transform-title">Transform File</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a file and let AI match columns to your target template
        </p>
      </div>

      {/* Step Indicator */}
      <Card>
        <CardContent className="py-4">
          <StepIndicator currentStep={currentStep} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Template</Label>
                {loadingTemplates ? (
                  <Skeleton className="h-9 w-full" />
                ) : templates && templates.length > 0 ? (
                  <Select value={selectedTemplateId} onValueChange={(v) => { setSelectedTemplateId(v); setCurrentTransformation(null); }}>
                    <SelectTrigger data-testid="select-template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name} ({t.columns.length} cols)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No templates available. Create one first.
                  </p>
                )}
              </div>

              {/* Template column preview */}
              {selectedTemplate && (
                <div className="rounded-md border p-3 bg-muted/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Target columns ({selectedTemplate.columns.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.columns.map((col) => (
                      <Badge key={col} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Source File</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : selectedFile
                      ? "border-chart-2 bg-chart-2/5"
                      : "border-border"
                  }`}
                  data-testid="dropzone-source"
                >
                  <input {...getInputProps()} />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="h-6 w-6 text-chart-2" />
                      <p className="text-sm font-medium truncate max-w-full">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {isDragActive ? "Drop here" : "Drag & drop or click"}
                      </p>
                      <p className="text-xs text-muted-foreground">CSV, XLS, XLSX</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => transformMutation.mutate()}
                disabled={!selectedTemplateId || !selectedFile || transformMutation.isPending}
                data-testid="button-transform"
              >
                {transformMutation.isPending ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Transform with AI
                  </>
                )}
              </Button>

              {/* Transform Another button */}
              {currentTransformation && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetForm}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Transform Another
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {transformMutation.isPending && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-4">
                <RotateCw className="h-8 w-8 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium">Processing your file...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI is analyzing columns and matching them to the template
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentTransformation && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Transformation Results</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        currentTransformation.status === "completed"
                          ? "bg-chart-2/15 text-chart-2 border-transparent"
                          : "bg-destructive/15 text-destructive border-transparent"
                      }
                    >
                      {currentTransformation.status === "completed" ? "Success" : "Has Errors"}
                    </Badge>
                    {currentTransformation.status === "completed" && (
                      <Button size="sm" variant="outline" onClick={downloadCsv} data-testid="button-download-csv">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download CSV
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Success rate</span>
                        <span className="text-xs font-medium">{successRate}%</span>
                      </div>
                      <Progress value={successRate} className="h-2" />
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
                        {currentTransformation.successRows} rows
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        {currentTransformation.errorRows} rows
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {mappings && mappings.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Column Mapping (AI-Powered)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Visual mapping flow */}
                    <div className="space-y-2 mb-4">
                      {mappings.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/40"
                          data-testid={`row-mapping-${i}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
                              m.status === "matched" ? "bg-background border" : "bg-destructive/10 border border-destructive/20"
                            }`}>
                              {m.sourceColumn || "No match"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            {m.status === "matched" && m.confidence >= 0.8 ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
                            ) : m.status === "matched" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-chart-4" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20 text-xs font-mono">
                              {m.targetColumn}
                            </div>
                          </div>
                          <div className="shrink-0 w-14 text-right">
                            {m.status === "matched" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      m.confidence >= 0.8
                                        ? "bg-chart-2/15 text-chart-2 border-transparent"
                                        : m.confidence >= 0.5
                                        ? "bg-chart-4/15 text-chart-4 border-transparent"
                                        : "bg-destructive/15 text-destructive border-transparent"
                                    }`}
                                  >
                                    {Math.round(m.confidence * 100)}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>AI confidence score</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">--</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Table fallback for detail */}
                    <details className="group">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        Show detailed table view
                      </summary>
                      <div className="mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Source Column</TableHead>
                              <TableHead className="w-10"></TableHead>
                              <TableHead>Target Column</TableHead>
                              <TableHead className="text-right">Confidence</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mappings.map((m, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono text-xs">{m.sourceColumn || "--"}</TableCell>
                                <TableCell>
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </TableCell>
                                <TableCell className="font-mono text-xs">{m.targetColumn}</TableCell>
                                <TableCell className="text-right">
                                  {m.status === "matched" ? (
                                    <Badge
                                      variant="outline"
                                      className={
                                        m.confidence >= 0.8
                                          ? "bg-chart-2/15 text-chart-2 border-transparent"
                                          : m.confidence >= 0.5
                                          ? "bg-chart-4/15 text-chart-4 border-transparent"
                                          : "bg-destructive/15 text-destructive border-transparent"
                                      }
                                    >
                                      {Math.round(m.confidence * 100)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">--</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {m.status === "matched" ? (
                                    <CheckCircle2 className="h-4 w-4 text-chart-2 inline" />
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="h-4 w-4 text-chart-4 inline" />
                                      </TooltipTrigger>
                                      <TooltipContent>No matching source column found</TooltipContent>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  </CardContent>
                </Card>
              )}

              {errors && errors.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Transformation Errors ({errors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Column</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errors.slice(0, 50).map((e, i) => (
                            <TableRow key={i} data-testid={`row-error-${i}`}>
                              <TableCell className="text-xs">{e.row}</TableCell>
                              <TableCell className="font-mono text-xs">{e.column}</TableCell>
                              <TableCell className="text-xs max-w-32 truncate">{e.value}</TableCell>
                              <TableCell className="text-xs text-destructive">{e.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {errors.length > 50 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Showing first 50 of {errors.length} errors
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentTransformation.outputData &&
                (currentTransformation.outputData as Record<string, string>[]).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        Preview (first 10 rows)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto max-h-72">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(
                                (currentTransformation.outputData as Record<string, string>[])[0] || {}
                              ).map((key) => (
                                <TableHead key={key} className="font-mono text-xs whitespace-nowrap">
                                  {key}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(currentTransformation.outputData as Record<string, string>[])
                              .slice(0, 10)
                              .map((row, i) => (
                                <TableRow key={i}>
                                  {Object.values(row).map((val, j) => (
                                    <TableCell
                                      key={j}
                                      className="text-xs max-w-40 truncate whitespace-nowrap"
                                    >
                                      {val || "--"}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </>
          )}

          {!currentTransformation && !transformMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a template and upload a file to start
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI will automatically map your columns to the target format
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
