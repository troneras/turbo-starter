
We have implemented a cms release system based on the requirements in this file: @ai/specs/releases.md

The following is the current state of development:

  Main database changes were done in the following files:
    @packages/db/schema/entities.ts
    @packages/db/schema/releases.ts  
    @packages/db/schema/views.ts
    @packages/db/custom-migrations/migrations/001_release_views.sql
    @packages/db/custom-migrations/migrations/002_release_functions.sql
    @packages/db/custom-migrations/migrations/003_release_permissions.sql

  In the api part, new routes, repository and request context was added for release management:
    @apps/api/src/plugins/app/releases/index.ts
    @apps/api/src/plugins/app/releases/releases-repository.ts
    @apps/api/src/plugins/app/releases/release-context.ts
    @apps/api/src/routes/api/releases/index.ts


 In the admin panel, a release feature was added as well:
    @apps/admin/src/app/providers/release-provider.tsx
    @apps/admin/src/app/routes/releases.tsx
    @apps/admin/src/features/releases/components/release-switcher.tsx
    @apps/admin/src/features/releases/pages/releases-page.tsx

Here’s a focused punch‑list of UX improvements that would turn the screen you shared into a full‑fledged “release cockpit” while fitting naturally into the vertical side‑navigation you already have.

|  #     | What to add / tweak                                                                                                                                                                                                      | Why it matters                                                           | Where it lives                                                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **Inline status‑aware actions** (Close → Deploy → Rollback) in the table row, not a generic “Set active”. Use a compact **ellipsis menu** like you started, but surface only the actions that are valid for that status. | Avoids a second navigation click and prevents invalid operations.        | Replace the single *Actions ⋯* popover per row with context‑specific items:<br>• **OPEN** → “Close”, “Delete”<br>• **CLOSED** → “Re‑open”, **primary** “Deploy”<br>• **DEPLOYED** → “Rollback”, “Diff previous” |
| **2**  | **One‑glance change count** column.  A grey pill “12 changes” lets editors spot big releases instantly.                                                                                                                  | Helps triage, highlights releases that still need review.                | New column after *Status*.                                                                                                                                                                                      |
| **3**  | Click a row to drill into a **drawer** (slide‑over) showing the change list & diff preview (the two‑pane layout from the mock‑up).                                                                                       | Keeps users on one page; no hard navigation jumps.                       | Drawer slides over the right 40 % of the existing view.                                                                                                                                                         |
| **4**  | **Header‑level branch switcher** (you have it) → add a tiny “Preview” pill when the selected release is not deployed.                                                                                                    | Makes it clear whether the admin UI is in production or preview context. | Upper‑right switcher (already present).                                                                                                                                                                         |
| **5**  | **Deploy banner** when a CLOSED release is opened in the drawer: “All checks passed · 0 conflicts · Ready to deploy” with a primary CTA.                                                                                 | Encourages the single‑path workflow (Close → QA → Deploy).               | Top of the drawer.                                                                                                                                                                                              |
| **6**  | **Conflict indicator** in table row: small red ⚠︎ icon if `check_release_conflicts` reports >0. Tooltip: “3 parallel, 1 overwrite”.                                                                                      | Surfaces hidden problems early.                                          | Next to status chip.                                                                                                                                                                                            |
| **7**  | Global **filters & search** bar above the table: *status multiselect*, *created by*, *date range*, free‑text search.                                                                                                     | Lets power‑users wrangle dozens of releases.                             | Bar below “All Releases”.                                                                                                                                                                                       |
| **8**  | **Bulk ops** checkbox column (only for OPEN releases): “Close selected”, “Delete selected”.                                                                                                                              | Saves time when sweeping old experimental branches.                      | First column in table.                                                                                                                                                                                          |
| **9**  | **Keyboard shortcut** hints in tooltip: e.g. press *D* to deploy a closed release, *R* to rollback current.                                                                                                              | Power‑user delight; aligns with Git tooling muscle memory.               | Tooltip on action buttons.                                                                                                                                                                                      |
| **10** | **Empty‑state illustrations / copy** when no releases exist (“Create your first release to start working safely in isolation”).                                                                                          | Makes first‑time onboarding clearer.                                     | Replace blank table.                                                                                                                                                                                            |

### Visual tweaks to the layout you posted

1. **Active Release card**

   * Make the status chip **clickable** to jump to the drawer for that release.
   * Grey background (#f9fafb) to separate it visually from “All Releases”.

2. **Table typography**

   * Left‑align “Name”; keep timestamps lighter (`font‑weight: 400; color: #6b7280`).
   * Compress date + “by user” onto **two lines** in the same cell to keep the row height tidy.

3. **Floating “New Release” button**

   * You already have it top‑right. Show **a small plus icon inside the table header** as well for users who scroll far down.

---

### Interaction flow example

1. **Click “+ New Release”** → modal asks name & optional description.
2. Row appears in table with *OPEN* status and “0 changes”.
3. Author works in UI; change count pill ticks up live via websockets.
4. Once satisfied, author presses **Close** (inline action) → status changes to *CLOSED*, row shows blue “Ready to deploy” badge.
5. Reviewer clicks row → drawer opens with diff table; presses **Deploy** inside drawer.
6. Success toast, *DEPLOYED* chip turns green, Active Release card auto‑updates.
7. If a hot‑fix is needed, reviewer clicks *⋯ > Rollback* on previous release; confirmation dialog; green banner switches back.

---

These additions keep the cognitive load low—everything fits on the current page & side‑nav—while surfacing the power features your edition‑based backend makes possible: conflict warnings, diff previews, and status‑driven actions. Let me know which items resonate and I can turn specific pieces into component code or detailed Figma‑style specs.
