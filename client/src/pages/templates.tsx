import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileSpreadsheet, Plus, Upload, Trash2, Columns3 } from "lucide-react";
import type { Template } from "@shared/schema";

export default function Templates() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !templateName) throw new Error("Missing data");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", templateName);

      const res = await fetch("/api/templates", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || "Failed to create template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setOpen(false);
      setTemplateName("");
      setSelectedFile(null);
      toast({ title: "Template created", description: "Your CSV template has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-templates-title">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a reference CSV/XLS file to define the target format for transformations
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g. Customer Import Format"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Reference File (CSV or XLS)</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : selectedFile
                      ? "border-chart-2 bg-chart-2/5"
                      : "border-border"
                  }`}
                  data-testid="dropzone-template"
                >
                  <input {...getInputProps()} />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="h-8 w-8 text-chart-2" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {isDragActive ? "Drop the file here" : "Drag & drop or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground">CSV, XLS, or XLSX files</p>
                    </div>
                  )}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!templateName || !selectedFile || createMutation.isPending}
                data-testid="button-submit-template"
              >
                {createMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-medium truncate">{template.name}</CardTitle>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(template.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-template-${template.id}`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 mb-3">
                  <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {template.columns.length} columns
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {template.columns.slice(0, 6).map((col) => (
                    <Badge key={col} variant="secondary" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                  {template.columns.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.columns.length - 6} more
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Created {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No templates yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a template by uploading a reference CSV or XLS file
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
