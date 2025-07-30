import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { SidebarTrigger } from './ui/sidebar'
import { Separator } from './ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb'
import { UserProfile } from './user-profile'
import { ReleaseSwitcher } from '@/features/releases/components/release-switcher'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateReleaseRequest, Release } from '@cms/contracts/types/releases'
import { Loader2 } from 'lucide-react'
import { useRelease } from '@/app/providers/release-provider'

export default function Header() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setActiveRelease } = useRelease()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CreateReleaseRequest>({
    name: '',
    description: '',
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateReleaseRequest) => {
      const response = await apiClient.post<Release>('/releases', data)
      return response.data
    },
    onSuccess: (newRelease) => {
      toast.success('Release created successfully', {
        description: `${newRelease.name} has been created.`,
      })
      queryClient.invalidateQueries({ queryKey: ['releases'] })
      setCreateDialogOpen(false)
      setFormData({ name: '', description: '' })
      setActiveRelease(newRelease)
      navigate({ to: '/releases' })
    },
    onError: (error: any) => {
      toast.error('Failed to create release', {
        description: error.response?.data?.message || 'An error occurred',
      })
    },
  })

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4 flex-1">
          <SidebarTrigger className="-ml-1" data-testid="sidebar-toggle" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  CMS Platform
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-4 px-4">
          <ReleaseSwitcher onCreateNew={() => setCreateDialogOpen(true)} />
          <UserProfile />
        </div>
      </header>

      {/* Create Release Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Release</DialogTitle>
            <DialogDescription>
              Create a new release to start making content changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Release Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Campaign 2025"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the changes in this release..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
