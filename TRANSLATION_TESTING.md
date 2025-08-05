# Translation System Testing Guide

## Overview

The translation system has been refactored and a basic testing interface has been created. All field names have been standardized to use `entityKey` instead of `fullKey` for consistency with the generic entity service architecture.

## What's Been Fixed/Updated

### ✅ Field Name Consistency
- **Backend API**: Updated to use `entityKey` consistently
- **Contracts/Schemas**: All TypeBox schemas now use `entityKey`
- **Type Definitions**: TypeScript interfaces updated
- **Admin UI Components**: All React components updated
- **Plugin Registration**: Fixed translation plugin export issue

### ✅ Basic Translation Interface
- **New Simple UI**: Created `/translations-simple` route with basic CRUD functionality
- **Default Locale**: New translation keys automatically get an `en-US` variant
- **Inline Editing**: Edit translations directly in the table
- **Status Management**: Update translation status (DRAFT → PENDING → APPROVED)

## How to Test the Translation System

### 1. Start the Development Environment

```bash
# Start services (PostgreSQL + Redis)
docker-compose up -d

# Run database migrations
bun run db:migrate

# Start API server
bun run --filter=api dev

# Start admin UI (in separate terminal)
bun run --filter=admin dev
```

### 2. Access the Simple Translation Interface

Navigate to: `http://localhost:3000/translations-simple`

### 3. Test Scenarios

#### Creating Translation Keys
1. Click "New Key" in the top-right header
2. Enter a key name (e.g., `app.welcome.title`)
3. Add optional description
4. Click "Create Key"
5. ✅ Key should be created with automatic `en-US` variant

#### Creating New Translations
**Method 1: From Header**
1. Click "New Translation" in the top-right header
2. Select an existing translation key from dropdown
3. Choose target locale (en-US, es-ES, fr-FR, etc.)
4. Enter translation value
5. Click "Create Translation"

**Method 2: From Selected Key**
1. Select a translation key from the left panel
2. Click "Add Translation" in the translations panel
3. Choose locale and enter value
4. Click "Create Translation"

**Method 3: For Empty Keys**
1. Select a key marked with "Empty" badge
2. Click "Add First Translation" button
3. Choose locale and enter value

#### Managing Existing Translations
1. Select a translation key from the left panel
2. View existing translations in the right panel
3. Use edit button (✏️) to modify translation values
4. Use status buttons to approve translations

#### Inline Editing
1. Click the edit icon (✏️) next to any translation
2. Modify the text in the textarea
3. Click checkmark (✅) to save or X to cancel

#### Status Management
1. Click the green checkmark to approve translations
2. Status badges show current state (DRAFT/PENDING/APPROVED)

## API Endpoints Being Tested

The interface tests these API endpoints:

- `GET /api/translations/keys` - List translation keys
- `POST /api/translations/keys` - Create new key
- `GET /api/translations/variants` - List translation variants
- `POST /api/translations/variants` - Create new translation
- `PUT /api/translations/variants/:id` - Update translation
- `PATCH /api/translations/variants/:id/status` - Update status

## Key Features

### 🎯 Default Behavior
- **Auto en-US Creation**: Every new translation key gets a default `en-US` variant
- **Placeholder Values**: Default variants use `[key.name]` as placeholder text
- **Draft Status**: New translations start as DRAFT status
- **Key Selection**: Creating translation for selected key auto-populates the key field

### 🔐 Permissions
- **Create**: Requires `translations:create` permission
- **Update**: Requires `translations:update` permission  
- **Approve**: Requires `translations:approve` permission

### 🎨 User Experience
- **Real-time Updates**: Changes reflect immediately via TanStack Query
- **Visual Indicators**: Keys show translation count and approval status (2/5 approved)
- **Empty Key Badges**: Keys without translations are clearly marked
- **Multiple Creation Methods**: Create translations from header, selected key, or empty state
- **Smart Key Selection**: Context-aware key pre-selection in dialogs
- **Error Handling**: Clear error messages for validation failures
- **Loading States**: Proper loading indicators during operations
- **Toast Notifications**: Success/error feedback for all operations

## Navigation

The simple translation interface is available in the sidebar under:
**Core → Simple Translations**

## File Structure

### New Files Created
- `apps/admin/src/features/translations/pages/simple-translations-page.tsx` - Enhanced translation management interface
- `apps/admin/src/app/routes/translations-simple.tsx` - Route for simple translations
- `TRANSLATION_TESTING.md` - This testing guide

### Updated Files
- All translation-related components updated to use `entityKey`
- API routes updated for field consistency
- Contracts schemas standardized
- Sidebar navigation updated

## Troubleshooting

### Common Issues

1. **"Plugin not loaded" errors**: Ensure Docker services are running
2. **Field validation errors**: Check that locale codes follow `xx-XX` format
3. **Permission denied**: Ensure user has appropriate translation permissions
4. **Database connection**: Verify PostgreSQL is running on port 5432

### Development Tips

- Use browser DevTools Network tab to monitor API calls
- Check console for any JavaScript errors
- Verify database migrations have run successfully
- Test with different user roles to verify permission system

## Next Steps

This basic interface provides a foundation for translation management. Future enhancements could include:

- Bulk operations for multiple translations
- Import/export functionality
- Advanced filtering and search
- Translation history and change tracking
- Integration with external translation services