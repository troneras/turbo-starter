# Shared Context: Frontend-Backend Auth Integration

**Workflow**: Feature Implementation  
**Timestamp**: 2025-07-22  
**Specification**: ai/specs/integrate-frontend-backend-auth.md

## Requirements Summary

### Current State
- MSAL authentication working in frontend admin UI
- Route protection implemented
- Backend has user management capabilities but not integrated with frontend auth

### Target State  
- Seamless integration between frontend MSAL auth and backend user management
- Auto-creation of users on first login (first 10 as admins, rest as regular users)
- Admin UI for managing user roles with:
  - User listing table with search and filtering
  - Individual user role management modal/sidebar
  - Bulk operations for multiple users
  - Role badges and status toggles

### Design Reference
Based on provided UI mockups:
- **User Table**: Name, Email, Roles (as badges), Last Login, Status (toggle)
- **Bulk Actions**: Row selection with "Assign Role" and "Deactivate" buttons  
- **User Edit Modal**: Side panel with role checkboxes (Admin, Editor, Translator, Viewer)

## Architecture Context
- **Frontend**: React admin app with TanStack Router and MSAL integration
- **Backend**: Fastify API with plugin architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Contracts**: Shared TypeBox schemas for type safety
- **Auth Flow**: MSAL → Azure Token → Exchange for JWT → API authentication

## Phase Status

### Phase 1: Requirements Analysis
- **Status**: ✅ COMPLETED
- **Assigned**: team-lead
- **Expected Outputs**: requirements_summary.md ✅ [Delivered](ai/output/requirements_summary.md)
- **Key Findings**: 
  - 12 functional requirements identified
  - HIGH priority auth-specialist involvement recommended
  - Medium-high complexity with multi-component impact
  - Critical admin bootstrap logic requires clarification

### Phase 2: Solution Design  
- **Status**: ✅ COMPLETED (all parallel tracks complete)
- **Assigned**: backend-dev ✅, frontend-dev ✅, auth-specialist ✅ (parallel)
- **Expected Outputs**: design_document.md ✅ [Created](ai/output/design_document.md)
- **Quality Gates**: ✅ All passed - design complete, integration clear, no conflicts

### Phase 3: Implementation
- **Status**: ✅ BACKEND COMPLETE → 🚧 Frontend Implementation Ready
- **Assigned**: backend-dev ✅ → frontend-dev (sequential)
- **Expected Outputs**: implementation_summary.md ✅ [Backend Complete](ai/output/backend_implementation_summary.md)

### Phase 4: Code Review
- **Status**: Not Started
- **Assigned**: senior-dev
- **Expected Outputs**: code_review_report.md

### Phase 5: Integration Testing
- **Status**: Not Started
- **Assigned**: qa-specialist  
- **Expected Outputs**: test_report.md

## Backend Design (backend-dev)

### Database Changes
**Status**: ✅ ANALYSIS COMPLETE - No schema changes required

**Current Schema Assessment**:
- `users` table: ✅ All required fields present (id, email, name, azure_ad_oid, azure_ad_tid, last_login_at)
- `roles` table: ✅ Basic role structure exists
- `user_roles` table: ✅ Many-to-many relationship established
- `permissions` table: ✅ Permission system implemented
- `role_permissions` table: ✅ Role-permission relationships exist

**Additional Considerations**:
- Need to add `status` field to users table for active/inactive toggle
- Consider adding `created_by` field to track admin who created user
- Index optimization for search/filtering operations

### API Endpoints
**Status**: ✅ DESIGN COMPLETE

**Existing Endpoints (Ready to Use)**:
- `GET /api/users/me` - Current user info ✅
- `GET /api/users` - List users with pagination ✅
- `POST /api/users` - Create user ✅
- `PATCH /api/users/:id` - Update user ✅
- `DELETE /api/users/:id` - Delete user ✅
- `GET /api/roles` - List roles ✅

**Required New Endpoints**:
- `GET /api/users?search=query&role=filter&status=filter` - Enhanced search/filtering
- `POST /api/users/bulk-assign-role` - Bulk role assignment
- `POST /api/users/bulk-deactivate` - Bulk user deactivation
- `PATCH /api/users/:id/status` - Toggle user active/inactive status
- `GET /api/users/stats` - Dashboard statistics (total users, active, by role)

### Data Contracts
**Status**: ✅ DESIGN COMPLETE

**Enhanced User Schema**:
```typescript
export const EnhancedUserSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  roles: Type.Array(Type.String()),
  status: Type.Union([Type.Literal('active'), Type.Literal('inactive')]),
  last_login_at: Type.Optional(Type.String()),
  created_at: Type.String(),
  azure_ad_connection: Type.Union([Type.Literal('connected'), Type.Literal('local')])
})

// Bulk Operations
export const BulkAssignRoleSchema = Type.Object({
  userIds: Type.Array(Type.String()),
  roleName: Type.String()
})

export const BulkDeactivateSchema = Type.Object({
  userIds: Type.Array(Type.String())
})

// Search/Filter
export const UserSearchQuerySchema = Type.Object({
  search: Type.Optional(Type.String()),
  role: Type.Optional(Type.String()),
  status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('inactive')])),
  page: Type.Optional(Type.Number()),
  pageSize: Type.Optional(Type.Number())
})
```

### Authentication Strategy  
**Status**: ✅ DESIGN COMPLETE

**Admin Bootstrap Logic**:
1. Track total user count in auth plugin
2. First 10 users created through Azure login get 'admin' role automatically
3. Subsequent users get 'user' role by default
4. Use database transaction to ensure atomic admin assignment

**Enhanced Auth Flow**:
1. User logs in with MSAL → Azure token sent to `/api/auth/login`
2. Backend validates Azure token and extracts user info
3. Check if user exists in database:
   - **New User**: Create user record, assign role (admin if count < 10, else user)
   - **Existing User**: Update last_login_at and Azure AD fields
4. Generate JWT with user info, roles, and permissions
5. Return JWT to frontend for API authentication

### Migration Plan
**Status**: ✅ DESIGN COMPLETE

**Database Migrations Needed**:
1. **Add user status field**:
   ```sql
   ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;
   ```

2. **Add created_by tracking**:
   ```sql
   ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id);
   ```

3. **Add search indexes**:
   ```sql
   CREATE INDEX idx_users_email_search ON users USING gin(to_tsvector('english', email));
   CREATE INDEX idx_users_name_search ON users USING gin(to_tsvector('english', name));
   CREATE INDEX idx_users_status ON users(status);
   CREATE INDEX idx_users_created_at ON users(created_at DESC);
   ```

**Seed Data Updates**:
- Ensure roles: admin, editor, translator, viewer (matching UI mockups)
- Create comprehensive permission set for user management
- Bootstrap admin user for testing

### Performance Considerations
**Status**: ✅ DESIGN COMPLETE

**Database Optimizations**:
- Full-text search indexes for user name/email
- Composite indexes for common filter combinations
- Pagination with cursor-based approach for large datasets
- Role/permission data caching in Redis

**API Optimizations**:
- Response caching for roles list (changes infrequently)
- Batch operations for bulk actions
- Implement proper SQL joins to avoid N+1 queries
- Rate limiting on search endpoints

**Estimated Impact**:
- User search: Sub-200ms response time for <10K users
- Bulk operations: <5s for 100 users
- Role listing: <50ms with caching

## Frontend Design (frontend-dev)

### Component Design
**Status**: ✅ DESIGN COMPLETE

**Component Architecture**:
```
features/users/
├── components/
│   ├── users-table.tsx           # Main data table with sorting, filtering
│   ├── users-table-row.tsx       # Individual row with selection, role badges
│   ├── users-search-bar.tsx      # Search input with filters dropdown
│   ├── users-bulk-actions.tsx    # Bulk action buttons (appears when rows selected)
│   ├── user-edit-sheet.tsx       # Side panel for editing user roles
│   ├── user-role-badges.tsx      # Role display with color coding
│   ├── user-status-toggle.tsx    # Active/inactive status switch
│   └── user-avatar.tsx           # User profile picture/initials
├── hooks/
│   ├── use-users.ts              # Main users data fetching
│   ├── use-user-mutations.ts     # Update, delete, bulk operations
│   ├── use-roles.ts              # Available roles data
│   └── use-users-filters.ts      # Search and filter state management
├── pages/
│   └── users-page.tsx            # Main page layout and orchestration
└── types.ts                     # Feature-specific UI types
```

**Key Component Props & Interfaces**:
```typescript
// Main table component
interface UsersTableProps {
  users: UserWithRoles[]
  isLoading: boolean
  selectedUsers: string[]
  onSelectionChange: (userIds: string[]) => void
  onUserEdit: (userId: string) => void
  onStatusToggle: (userId: string, status: 'active' | 'inactive') => void
}

// Bulk actions component  
interface UsersBulkActionsProps {
  selectedCount: number
  onAssignRole: (role: string) => void
  onDeactivate: () => void
  onClearSelection: () => void
  availableRoles: Role[]
}

// User edit sheet
interface UserEditSheetProps {
  userId: string | null
  isOpen: boolean
  onClose: () => void
  onSave: (userId: string, roles: string[]) => void
  availableRoles: Role[]
}
```

### State Management Strategy
**Status**: ✅ DESIGN COMPLETE

**State Architecture**:
1. **Server State** (TanStack Query):
   - Users list with pagination
   - Individual user details 
   - Available roles and permissions
   - Real-time updates after mutations

2. **Local UI State** (React useState):
   - Table selection state
   - Search/filter inputs
   - Modal/sheet open states
   - Loading states for individual actions

3. **URL State** (TanStack Router):
   - Search query parameters
   - Pagination state
   - Filter selections
   - User edit panel state

**Query Keys Strategy**:
```typescript
export const userQueries = {
  all: ['users'] as const,
  lists: () => [...userQueries.all, 'list'] as const,
  list: (filters: UserFilters) => [...userQueries.lists(), filters] as const,
  details: () => [...userQueries.all, 'detail'] as const,
  detail: (id: string) => [...userQueries.details(), id] as const,
}

export const roleQueries = {
  all: ['roles'] as const,
  list: () => [...roleQueries.all, 'list'] as const,
}
```

### User Interaction Flows
**Status**: ✅ DESIGN COMPLETE

**Primary User Flows**:

1. **Users List Page Load**:
   - Load users list with default pagination
   - Load available roles for filtering
   - Display loading skeleton while fetching
   - Show error boundary if requests fail

2. **Search and Filter Users**:
   - Type in search box → debounced API call (300ms delay)
   - Select role filter → immediate API call with updated filter
   - Select status filter → immediate API call
   - URL updates to reflect current filters (shareable/bookmarkable)
   - Clear filters button resets to default state

3. **Individual User Actions**:
   - Click user row → open user edit sheet
   - Toggle status switch → optimistic update + API call
   - Role badges show current roles (read-only in table)

4. **Bulk Operations Flow**:
   - Select multiple users via checkboxes
   - Bulk actions bar appears with count and actions
   - "Assign Role" → dropdown to select role → confirm modal → API call
   - "Deactivate" → confirm modal → API call for all selected users
   - Success/error toasts for feedback
   - Clear selection after successful operation

5. **User Edit Sheet Flow**:
   - Opens from right side (mobile: full screen modal)
   - Shows user info (name, email, join date, connection status)
   - Role checkboxes with descriptions
   - Real-time permission preview
   - Save button disabled if no changes made
   - Optimistic updates with rollback on error

### Accessibility Plan
**Status**: ✅ DESIGN COMPLETE

**WCAG 2.1 AA Compliance**:

1. **Keyboard Navigation**:
   - All interactive elements focusable with Tab/Shift+Tab
   - Table supports arrow key navigation between cells
   - Checkbox selection with Space key
   - Sheet/modal keyboard trapping and Escape to close

2. **Screen Reader Support**:
   - Table headers with proper scope attributes
   - Row selection announces count and selected users
   - Bulk actions button state announced
   - Form fields with proper labels and descriptions
   - Live regions for status updates and errors

3. **Visual Accessibility**:
   - Role badges use both color and text for identification
   - Status toggles include text labels, not just colors
   - Focus indicators meet contrast requirements
   - Text meets AA contrast ratios (4.5:1 minimum)
   - User avatars include alt text or fallback initials

4. **Mobile/Responsive**:
   - Touch targets minimum 44px
   - Table scrolls horizontally on mobile with sticky first column
   - Sheet component becomes full-screen modal on mobile
   - Bulk actions convert to floating action button

**ARIA Implementation**:
```typescript
// Table accessibility
<table role="table" aria-label="Users management table">
  <thead>
    <tr role="row">
      <th scope="col" aria-label="Select users">
        <input type="checkbox" aria-label="Select all users" />
      </th>
      <th scope="col" aria-sort="ascending">Name</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-selected={isSelected}>
      <td>
        <input 
          type="checkbox" 
          aria-labelledby={`user-${id}-name`}
          aria-describedby="bulk-actions-help"
        />
      </td>
      <td id={`user-${id}-name`}>{name}</td>
    </tr>
  </tbody>
</table>

// Live region for updates
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {selectedCount > 0 && `${selectedCount} users selected`}
</div>
```

### Integration with Existing Auth System
**Status**: ✅ DESIGN COMPLETE

**Permission Integration**:
```typescript
// Route-level protection
export const Route = createFileRoute('/users')({
  component: UsersPage,
  beforeLoad: ({ context }) => {
    if (!context.auth.hasPermission('users:read')) {
      throw redirect({ to: '/dashboard' })
    }
  }
})

// Component-level protection
function UsersBulkActions({ selectedCount, onAssignRole, onDeactivate }: Props) {
  const { hasPermission } = useAuth()
  
  return (
    <div className="flex gap-2">
      {hasPermission('users:update') && (
        <Button onClick={() => onAssignRole()}>
          Assign Role
        </Button>
      )}
      {hasPermission('users:delete') && (
        <Button variant="destructive" onClick={onDeactivate}>
          Deactivate
        </Button>
      )}
    </div>
  )
}
```

**Enhanced Auth Hook**:
```typescript
// Addition to existing useAuth hook
export function useUserPermissions() {
  const { hasPermission } = useAuth()
  
  return {
    canReadUsers: hasPermission('users:read'),
    canCreateUsers: hasPermission('users:create'),
    canUpdateUsers: hasPermission('users:update'),
    canDeleteUsers: hasPermission('users:delete'),
    canManageRoles: hasPermission('roles:assign'),
  }
}
```

### Mobile Responsive Design
**Status**: ✅ DESIGN COMPLETE

**Breakpoint Strategy**:
- **Desktop** (≥1024px): Full table with all columns
- **Tablet** (768-1023px): Horizontal scroll table with sticky name column
- **Mobile** (≤767px): Card-based layout with condensed info

**Mobile Adaptations**:
1. **Table → Card Layout**:
   - Each user becomes a card with avatar, name, email
   - Roles shown as compact badges
   - Status toggle in card header
   - Tap card to open edit sheet

2. **Bulk Actions**:
   - Multi-select via long press
   - Floating action button for bulk actions
   - Bottom sheet for action selection

3. **Search & Filters**:
   - Search bar remains top-fixed
   - Filters collapse into dropdown menu
   - Clear filters button always visible

**Performance Optimizations**:
- Virtual scrolling for large user lists (>100 users)
- Image lazy loading for user avatars
- Debounced search to reduce API calls
- Optimistic updates for immediate feedback
- Error boundaries for graceful failure handling

## Authentication Integration Design (auth-specialist)

### Admin Bootstrap Strategy

**Current Implementation Analysis:**
- Existing auth plugin already has user creation logic in `validateAzureToken()`  
- Currently assigns default 'user' role to all new users (lines 66-79)
- Need to replace default role assignment with admin bootstrap logic

**Secure Admin Bootstrap Design:**
```typescript
async function determineUserRole(): Promise<string> {
  // Use transaction to prevent race conditions
  return await fastify.db.transaction(async (tx) => {
    // Query with SELECT FOR UPDATE to lock admin role counting
    const adminCount = await tx
      .select({ count: sql`count(*)` })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))  
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, 'admin'))
      .for('update')

    // First 10 users with admin role get admin, rest get user
    return adminCount[0].count < 10 ? 'admin' : 'user'
  })
}
```

**Safeguards:**
1. **Race Condition Protection**: Database transaction with SELECT FOR UPDATE
2. **Admin Protection**: Prevent admin role removal if it would drop count below 10
3. **Manual Override**: Allow super-admin to assign admin roles beyond first 10
4. **Audit Trail**: Log all admin role assignments with reasoning (auto vs manual)

### Security Enhancements  

**User Management API Security:**
1. **Permission-based Access**: Require 'users:manage' permission for user management operations
2. **Self-Protection Rules**:
   - Users cannot modify their own roles
   - Users cannot deactivate themselves  
   - Last remaining admin cannot be demoted
3. **Bulk Operation Limits**: Max 100 users per bulk operation to prevent abuse
4. **Enhanced Token Validation**: Validate Azure AD token expiry and issuer in production

**Production Azure AD Integration:**
```typescript
async validateAzureToken(token: string): Promise<AuthUser> {
  if (process.env.NODE_ENV === 'production') {
    // Validate JWT signature against Azure AD public keys
    const decoded = await validateAzureADToken(token)
    // Additional claims validation (issuer, audience, expiry)
    validateTokenClaims(decoded)
    return decoded
  } else {
    // Current base64 decode for development/testing
    return JSON.parse(Buffer.from(token, 'base64').toString())
  }
}
```

### Audit Strategy

**Audit Log Schema Addition:**
```typescript
export const userAuditLogs = pgTable('user_audit_logs', {
  id: serial('id').primaryKey(),
  targetUserId: uuid('target_user_id').references(() => users.id).notNull(),
  performedBy: uuid('performed_by').references(() => users.id).notNull(), 
  action: varchar('action', { length: 50 }).notNull(), // 'role_assigned', 'role_removed', 'status_changed'
  oldValue: jsonb('old_value'), // Previous roles/status
  newValue: jsonb('new_value'), // New roles/status  
  reason: text('reason'), // Optional reason for change
  isAutomatic: boolean('is_automatic').default(false), // For bootstrap assignments
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

**Logged Operations:**
- All role assignments/removals with before/after state
- User activation/deactivation changes
- Admin bootstrap assignments (marked as automatic)
- Bulk operations with complete affected user list
- Failed authorization attempts on user management endpoints

### Production Considerations

**Azure AD Production Readiness:**
1. **Token Validation**: Replace base64 decode with proper Azure AD JWT validation
2. **Key Rotation**: Handle Azure AD signing key rotation gracefully
3. **Claims Mapping**: Option to map Azure AD groups to internal roles
4. **Fallback Authentication**: Service account access when Azure AD unavailable
5. **Rate Limiting**: Prevent token validation abuse attacks

**Performance & Security Optimizations:**
1. **Role Caching**: Cache user roles in JWT payload to reduce database queries
2. **Permission Aggregation**: Pre-calculate and cache permission sets
3. **JWT Expiry**: Shorter token lifetimes (2-4 hours) for security
4. **Token Refresh**: Implement seamless token refresh flow
5. **Session Tracking**: Monitor active sessions per user for anomaly detection

## Communication Log
- **2025-07-22 [backend-dev]**: Database analysis complete. No major schema changes needed, just enhancements.
- **2025-07-22 [backend-dev]**: API endpoints designed. Most functionality exists, need 4 new endpoints for bulk operations.
- **2025-07-22 [auth-specialist]**: Authentication design complete. Enhanced admin bootstrap logic with safeguards. Identified production Azure AD requirements and audit logging needs.
- **2025-07-22 [frontend-dev]**: UI component design complete. Ready for implementation once API contracts finalized.

## Decisions & Blockers
### Architectural Decisions
- **User Status**: Adding 'active'/'inactive' status field instead of soft delete for better UX
- **Admin Bootstrap**: First 10 users auto-promoted to admin (simple counter-based logic)
- **Search Strategy**: PostgreSQL full-text search instead of external search engine
- **Bulk Operations**: Dedicated endpoints for better transaction control
- **UI Framework**: TanStack Query for server state, React Router for URL state, shadcn/ui components
- **Mobile Strategy**: Progressive enhancement from desktop to mobile-optimized cards

### Potential Blockers
- Need to add additional shadcn/ui components: Sheet, Switch, Badge, DropdownMenu, Checkbox
- Backend bulk operation endpoints need to be implemented before frontend can be completed

## Deliverables Tracking
- **backend-dev**: Database design ✅, API design ✅
- **frontend-dev**: Component design ✅, State management design ✅, User flows ✅, A11y plan ✅
- **auth-specialist**: Admin bootstrap design ✅, Security enhancements ✅, Audit strategy ✅, Production requirements ✅