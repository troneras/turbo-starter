
import {
    LayoutDashboard,
    Rocket,
    Languages,
    KeyRound,
    Building2,
    Users,
    ShieldCheck,
    ToggleRight,
    BookText,
    GanttChart,
    Settings,
    Globe,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar"
import { useAuth } from "@/app/hooks/use-auth"
import { Link } from '@tanstack/react-router'


const navItems = [
    {
        section: "Core",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Releases", href: "/releases", icon: Rocket },
            { name: "Translations", href: "/translations", icon: Languages },
            { name: "Keys", href: "/keys", icon: KeyRound },
            { name: "Brands", href: "/brands", icon: Building2 },
        ],
    },
    {
        section: "Team",
        items: [
            { name: "Users", href: "/users", icon: Users },
            { name: "Roles", href: "/roles", icon: ShieldCheck },
        ],
    },
    {
        section: "System",
        items: [
            { name: "Languages", href: "/languages", icon: Languages },
            { name: "Jurisdictions", href: "/jurisdictions", icon: Globe },
            { name: "Feature Flags", href: "/feature-flags", icon: ToggleRight },
            { name: "Glossary", href: "/glossary", icon: BookText },
            { name: "Audit", href: "/audit", icon: GanttChart },
            { name: "Settings", href: "/settings", icon: Settings },
        ],
    },
]

export function AppSidebar() {
    const { hasRole } = useAuth()

    return (
        <Sidebar className="overflow-hidden" collapsible="icon" data-testid="app-sidebar">
            <SidebarContent className="overflow-y-auto overflow-x-hidden">
                {navItems.map((section, idx) => (
                    <div key={`${section.section}-${idx}`}>
                        <SidebarGroup>
                            <SidebarGroupLabel>{section.section}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {section.items.map((item) => (
                                        <SidebarMenuItem key={item.name}>
                                            <SidebarMenuButton asChild tooltip={item.name}>
                                                <Link to={item.href}>
                                                    <item.icon />
                                                    <span>{item.name}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>

                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                        {/* Separator (except after the last section) */}
                        {idx < navItems.length - 1 && <SidebarSeparator />}
                    </div>
                ))}

                {/* Admin-only section */}
                {hasRole('admin') && (
                    <div data-testid="admin-menu">
                        <SidebarSeparator />
                        <SidebarGroup>
                            <SidebarGroupLabel>Admin</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild tooltip="System Settings">
                                            <Link to="/admin/system">
                                                <Settings />
                                                <span>System Settings</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </div>
                )}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}

