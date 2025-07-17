import { Calendar, Home, Inbox, Link, Search } from "lucide-react"

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
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
    {
        title: "Home",
        url: "#",
        icon: Home,
    },
    {
        title: "Inbox",
        url: "#",
        icon: Inbox,
    },
    {
        title: "Calendar",
        url: "#",
        icon: Calendar,
    },
    {
        title: "Search",
        url: "#",
        icon: Search,
    },
    {
        title: "Settings",
        url: "#",
        icon: Settings,
    },
]

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
            { name: "Feature Flags", href: "/feature-flags", icon: ToggleRight },
            { name: "Glossary", href: "/glossary", icon: BookText },
            { name: "Audit", href: "/audit", icon: GanttChart },
            { name: "Settings", href: "/settings", icon: Settings },
        ],
    },
]

export function AppSidebar() {
    return (
        <Sidebar className="overflow-hidden" collapsible="icon">
            <SidebarContent className="overflow-y-auto overflow-x-hidden">
                {navItems.map((section, idx) => (
                    <>
                        <SidebarGroup key={section.section}>
                            <SidebarGroupLabel>{section.section}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {section.items.map((item) => (
                                        <SidebarMenuItem key={item.name}>
                                            <SidebarMenuButton asChild tooltip={item.name}>
                                                {/* <Link to={item.href}> */}
                                                <div>
                                                    <item.icon />
                                                    <span>{item.name}</span>
                                                </div>
                                                {/* </Link> */}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>

                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                        {/* Separator (except after the last section) */}
                        {idx < navItems.length - 1 && <SidebarSeparator />}
                    </>
                ))}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}

