# Jurisdictions Management

The Jurisdictions Management interface provides administrators with comprehensive tools to manage regulatory jurisdictions in the CMS platform. This feature enables content compliance across different legal frameworks and geographical regions.

## Overview

The jurisdictions management system allows administrators to:
- Create, edit, and delete regulatory jurisdictions
- Search and filter jurisdictions by various criteria
- Perform bulk operations on multiple jurisdictions
- Manage jurisdiction status and regional organization
- Maintain compliance with regulatory requirements

## Accessing Jurisdictions Management

1. **Authentication Required**: Users must be authenticated with admin privileges
2. **Navigation**: Access via the main navigation menu at `/jurisdictions`
3. **Role Requirements**: Admin role required for create, edit, and delete operations

## User Interface Features

### Main Jurisdictions Page

The jurisdictions page provides a comprehensive view of all jurisdictions with the following components:

#### Page Header
- **Title**: "Jurisdictions" with descriptive subtitle
- **Add Jurisdiction Button**: Available to admin users for creating new jurisdictions
- **Role-based Access**: Non-admin users see a read-only interface

#### Search and Filtering

**Search Bar**
- Global search across jurisdiction code, name, and region
- Real-time filtering as you type
- Debounced input to prevent excessive API calls

**Filter Options**
- **Status Filter**: Filter by `active` or `inactive` jurisdictions
- **Region Filter**: Filter by geographic regions
- **Combined Filtering**: Multiple filters can be applied simultaneously

**Search Examples:**
- Search for "gambling" to find gambling-related regulators
- Filter by "Europe" region to see European jurisdictions
- Combine status "active" + region "North America" for active North American jurisdictions

#### Jurisdictions Table

**Column Layout:**
1. **Selection Checkbox**: For bulk operations (admin only)
2. **Code**: Jurisdiction identifier (e.g., UKGC, MGA)
3. **Name**: Full jurisdiction name
4. **Description**: Regulatory description (truncated if long)
5. **Status**: Active/Inactive badge with color coding
6. **Region**: Geographic region
7. **Actions**: Edit/Delete buttons (admin only)

**Sorting Features:**
- Click column headers to sort
- Toggle between ascending/descending order
- Visual indicators show current sort state
- Sortable fields: name, code, status, region

**Status Indicators:**
- **Active**: Green badge with "Active" label
- **Inactive**: Gray badge with "Inactive" label

#### Pagination

**Pagination Controls:**
- Shows current page and total results
- Previous/Next navigation buttons
- 20 items per page (configurable)
- Displays result range (e.g., "Showing 1 to 20 of 45 jurisdictions")

**State Management:**
- URL synchronization with filters and pagination
- Browser back/forward navigation support
- Shareable URLs with applied filters

### Bulk Operations

Admin users can perform bulk operations on selected jurisdictions:

#### Selection Management
- **Select All**: Checkbox in table header to select all visible items
- **Individual Selection**: Checkboxes for each jurisdiction
- **Selection Counter**: Shows "X jurisdictions selected"
- **Clear Selection**: Button to deselect all items

#### Bulk Actions Bar
Appears when jurisdictions are selected:
- **Clear Selection**: Remove all selections
- **Bulk Delete**: Delete multiple jurisdictions at once
- **Selection Persistence**: Selections maintained across page navigation

### Create/Edit Jurisdiction Dialog

#### Form Fields

**Required Fields:**
- **Code**: Jurisdiction identifier
  - Format: Uppercase alphanumeric with underscores/hyphens
  - Pattern validation: `^[A-Z0-9_-]+$`
  - Unique constraint enforced
  - Examples: "UKGC", "MGA", "DGOJ"

- **Name**: Human-readable jurisdiction name
  - Minimum 1 character required
  - Examples: "UK Gambling Commission", "Malta Gaming Authority"

**Optional Fields:**
- **Description**: Detailed regulatory information
  - Supports multi-line text
  - Helpful for team understanding and compliance notes

- **Status**: Active or Inactive (defaults to Active)
  - Dropdown selection
  - Affects visibility in operational workflows

- **Region**: Geographic classification
  - Free text field for flexibility
  - Examples: "Europe", "North America", "Asia-Pacific"

#### Form Validation

**Client-side Validation:**
- Real-time field validation as user types
- Visual error indicators with specific messages
- Submit button disabled until all required fields are valid

**Server-side Validation:**
- Code uniqueness verification
- Format validation for all fields
- Error messages displayed in form

**Validation Messages:**
- "Code is required and must be unique"
- "Code must contain only uppercase letters, numbers, underscores, and hyphens"
- "Name is required"

#### Dialog Behavior

**Create Mode:**
- Triggered by "Add Jurisdiction" button
- Empty form with default values
- "Create Jurisdiction" as submit button text

**Edit Mode:**
- Triggered by edit action in table
- Form pre-populated with existing data
- "Update Jurisdiction" as submit button text

**Form Submission:**
- Loading state during API request
- Success: Dialog closes, table refreshes, success message
- Error: Error messages displayed in form

### Delete Confirmation

#### Single Jurisdiction Delete
- Triggered by delete button in table row
- Confirmation dialog with jurisdiction details
- Shows jurisdiction code and name for verification
- "Delete" and "Cancel" options

#### Bulk Delete
- Triggered when multiple jurisdictions selected
- Lists all jurisdictions to be deleted
- Count display (e.g., "Delete 3 jurisdictions?")
- Batch deletion with progress indication

**Delete Protection:**
- Jurisdictions referenced by other entities cannot be deleted
- Clear error messages explain dependencies
- Suggestion to use "inactive" status instead

### Responsive Design

#### Desktop Layout (≥768px)
- Full table view with all columns
- Side-by-side layout for filters and actions
- Horizontal button layout

#### Mobile Layout (<768px)
- Stacked card layout instead of table
- Collapsible filters
- Vertical button stacks
- Touch-friendly interaction areas

#### Accessibility Features
- ARIA labels for screen readers
- Keyboard navigation support
- Focus management in dialogs
- Color contrast compliance
- Semantic HTML structure

## User Workflows

### Creating a New Jurisdiction

1. **Access**: Navigate to `/jurisdictions` (admin required)
2. **Initiate**: Click "Add Jurisdiction" button
3. **Form Entry**:
   - Enter unique jurisdiction code (e.g., "AGCO")
   - Provide descriptive name
   - Add optional description and region
   - Select appropriate status
4. **Validation**: Real-time feedback on field requirements
5. **Submit**: Click "Create Jurisdiction"
6. **Confirmation**: Success message and updated jurisdiction list

### Searching and Filtering

1. **Global Search**:
   - Type in search bar to filter across code, name, region
   - Results update in real-time
   - Clear button to reset search

2. **Status Filtering**:
   - Select "Active" or "Inactive" from status dropdown
   - Combines with other filters

3. **Region Filtering**:
   - Enter region name to filter
   - Case-insensitive matching

4. **Combined Filtering**:
   - Use multiple filters simultaneously
   - URL updates to reflect current filter state
   - Share filtered views via URL

### Bulk Management

1. **Selection**:
   - Use individual checkboxes or "Select All"
   - Selection counter shows progress
   - Bulk actions bar appears

2. **Bulk Delete**:
   - Click "Delete Selected" in bulk actions
   - Review list in confirmation dialog
   - Confirm deletion or cancel

3. **Selection Management**:
   - Clear selections with dedicated button
   - Selections persist across pagination

### Editing Jurisdictions

1. **Access**: Click edit button in table row (admin required)
2. **Form Pre-population**: Existing data loaded in form
3. **Modifications**: Update any field as needed
4. **Validation**: Real-time validation feedback
5. **Save**: Click "Update Jurisdiction"
6. **Confirmation**: Success message and updated display

### Error Handling

**Network Errors:**
- Loading states during API requests
- Error boundaries for unhandled exceptions
- Retry mechanisms for failed requests

**Validation Errors:**
- Inline field-level error messages
- Form-level error summaries
- Server validation error display

**Permission Errors:**
- Graceful handling of insufficient permissions
- Read-only mode for non-admin users
- Clear messaging about access requirements

## Integration Points

### Brand Associations
- Jurisdictions can be linked to brands
- Affects content visibility and compliance rules
- Managed through brand configuration interface

### Translation Context
- Jurisdictions provide context for content translations
- Enables jurisdiction-specific content variations
- Supports compliance with local regulations

### Content Hierarchy
- Jurisdictions participate in content inheritance
- Override rules: Global → Brand → Jurisdiction → Brand+Jurisdiction
- Affects translation resolution and display

## Best Practices for Administrators

### Jurisdiction Code Management
- Use official regulator abbreviations when available
- Keep codes concise but meaningful
- Follow consistent naming conventions
- Document code meanings in descriptions

### Status Management
- Use "inactive" for temporary or deprecated jurisdictions
- Consider impact on existing content before status changes
- Maintain inactive jurisdictions for historical reference

### Regional Organization
- Use consistent region naming across jurisdictions
- Group related jurisdictions logically
- Consider regulatory relationships when organizing

### Bulk Operations
- Review selections carefully before bulk actions
- Use filters to narrow selection scope
- Verify bulk changes align with compliance requirements

### Data Quality
- Provide comprehensive descriptions for team clarity
- Keep jurisdiction information up-to-date
- Regular review of active/inactive status

## Troubleshooting

### Common Issues

**Cannot Create Jurisdiction:**
- Check for duplicate codes
- Verify code format (uppercase, alphanumeric, underscores/hyphens only)
- Ensure all required fields are completed

**Cannot Delete Jurisdiction:**
- Check if jurisdiction is referenced by brands or translations
- Consider setting status to "inactive" instead
- Review dependency relationships

**Search Not Working:**
- Verify search terms match jurisdiction data
- Try partial matches or alternative terms
- Check network connectivity for API calls

**Permission Denied:**
- Verify admin role assignment
- Check authentication token validity
- Contact system administrator for access

### Performance Considerations

**Large Jurisdiction Lists:**
- Pagination automatically applied at 20 items
- Use filters to narrow results
- Search functionality helps locate specific jurisdictions

**Bulk Operations:**
- Large bulk operations may take time
- Loading indicators show progress
- Operations are atomic (all succeed or all fail)

## Technical Implementation Notes

### State Management
- React hooks for local component state
- URL synchronization for shareable links
- Optimistic updates for better UX

### API Integration
- RESTful API calls with proper error handling
- Automatic retry logic for network failures
- Caching for improved performance

### Security
- Role-based access control at component level
- Server-side permission validation
- Secure API token management

### Performance Optimization
- Debounced search input to reduce API calls
- Pagination to handle large datasets
- Optimized re-rendering with React hooks