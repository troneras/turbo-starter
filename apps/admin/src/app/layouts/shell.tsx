import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/layouts/app-sidebar"
import Header from "@/components/Header"

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <main>
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}