import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Templates from "@/pages/templates";
import Transform from "@/pages/transform";
import SftpUpload from "@/pages/sftp-upload";
import SftpSettings from "@/pages/sftp-settings";

const routeMeta: Record<string, { title: string; breadcrumbs: { label: string; href?: string }[] }> = {
  "/": {
    title: "Dashboard",
    breadcrumbs: [{ label: "Dashboard" }],
  },
  "/templates": {
    title: "Templates",
    breadcrumbs: [{ label: "Dashboard", href: "/" }, { label: "Templates" }],
  },
  "/transform": {
    title: "Transform File",
    breadcrumbs: [{ label: "Dashboard", href: "/" }, { label: "Transform" }],
  },
  "/sftp": {
    title: "SFTP Upload",
    breadcrumbs: [{ label: "Dashboard", href: "/" }, { label: "SFTP Upload" }],
  },
  "/sftp-settings": {
    title: "SFTP Settings",
    breadcrumbs: [{ label: "Dashboard", href: "/" }, { label: "Settings" }, { label: "SFTP" }],
  },
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/templates" component={Templates} />
      <Route path="/transform" component={Transform} />
      <Route path="/sftp" component={SftpUpload} />
      <Route path="/sftp-settings" component={SftpSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeaderBreadcrumbs() {
  const [location] = useLocation();
  const meta = routeMeta[location] || { title: "Not Found", breadcrumbs: [{ label: "Not Found" }] };

  return (
    <div className="flex items-center gap-3">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex flex-col gap-0.5">
        <h1 className="text-sm font-semibold leading-none">{meta.title}</h1>
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            {meta.breadcrumbs.map((crumb, i) => {
              const isLast = i === meta.breadcrumbs.length - 1;
              return (
                <span key={i} className="inline-flex items-center gap-1.5">
                  {i > 0 && <BreadcrumbSeparator className="[&>svg]:w-3 [&>svg]:h-3" />}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="text-xs">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href || "/"}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
                  <HeaderBreadcrumbs />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
