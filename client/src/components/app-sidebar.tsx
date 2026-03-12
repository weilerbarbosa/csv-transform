import { FileSpreadsheet, Upload, Settings, LayoutDashboard, FolderUp } from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Templates", url: "/templates", icon: FileSpreadsheet },
  { title: "Transform", url: "/transform", icon: Upload },
  { title: "SFTP Upload", url: "/sftp", icon: FolderUp },
  { title: "SFTP Settings", url: "/sftp-settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/20">
            <FileSpreadsheet className="h-4 w-4 text-black" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground" data-testid="text-app-title">CSV Transform</h2>
            <p className="text-[10px] text-cyan-400/60 font-medium uppercase tracking-wider">File Processor</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Separator className="mb-3 opacity-30" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-cyan-500/40 font-mono">v1.0.0</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-cyan-500/40 hover:text-cyan-400 transition-colors"
          >
            Docs
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
