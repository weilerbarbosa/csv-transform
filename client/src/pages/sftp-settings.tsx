import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Server, Plug, CheckCircle2, XCircle, RotateCw } from "lucide-react";
import type { SftpConfig } from "@shared/schema";

const sftpFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1).max(65535).default(22),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  remotePath: z.string().min(1, "Remote path is required").default("/"),
});

type SftpFormValues = z.infer<typeof sftpFormSchema>;

export default function SftpSettings() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ id: number; status: string; message: string } | null>(null);

  const { data: configs, isLoading } = useQuery<SftpConfig[]>({
    queryKey: ["/api/sftp-configs"],
  });

  const form = useForm<SftpFormValues>({
    resolver: zodResolver(sftpFormSchema),
    defaultValues: {
      name: "",
      host: "",
      port: 22,
      username: "",
      password: "",
      remotePath: "/",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SftpFormValues) => {
      const res = await apiRequest("POST", "/api/sftp-configs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sftp-configs"] });
      setOpen(false);
      form.reset();
      toast({ title: "SFTP server added", description: "Connection saved successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sftp-configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sftp-configs"] });
      toast({ title: "Server removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/sftp-configs/${id}/test`);
      return res.json();
    },
    onSuccess: (data, id) => {
      setTestResult({ id, status: "success", message: data.message || "Connection successful!" });
    },
    onError: (err: Error, id) => {
      setTestResult({ id, status: "error", message: err.message });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-sftp-settings-title">
            SFTP Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your SFTP server connections
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-sftp">
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add SFTP Server</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Production Server" {...field} data-testid="input-sftp-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Host</FormLabel>
                        <FormControl>
                          <Input placeholder="sftp.example.com" {...field} data-testid="input-sftp-host" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-sftp-port" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-sftp-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} data-testid="input-sftp-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="remotePath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remote Path</FormLabel>
                      <FormControl>
                        <Input placeholder="/uploads" {...field} data-testid="input-sftp-path" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-sftp"
                >
                  {createMutation.isPending ? "Saving..." : "Save Connection"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : configs && configs.length > 0 ? (
        <div className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id} data-testid={`card-sftp-${config.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 shrink-0">
                      <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{config.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.host}:{config.port} &middot; {config.username} &middot; {config.remotePath}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(config.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTestResult(null);
                        testMutation.mutate(config.id);
                      }}
                      disabled={testMutation.isPending}
                      data-testid={`button-test-sftp-${config.id}`}
                    >
                      {testMutation.isPending && testMutation.variables === config.id ? (
                        <RotateCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Plug className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Test
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(config.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-sftp-${config.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {testResult && testResult.id === config.id && (
                  <Alert
                    variant={testResult.status === "success" ? "default" : "destructive"}
                    className="mt-3"
                  >
                    {testResult.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription className="text-xs">
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No SFTP servers configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a server connection to start uploading files
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
