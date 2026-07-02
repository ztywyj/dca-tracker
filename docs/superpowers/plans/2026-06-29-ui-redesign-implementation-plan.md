# DCA Tracker UI Redesign Implementation Plan

Date: 2026-06-29

Design spec: `docs/superpowers/specs/2026-06-29-ui-redesign-design.md`

## Scope

Implement the approved Responsive Fintech Console redesign without changing calculation behavior, persisted data shape, backup format, or tab workflow.

## Phase 1: Theme Foundation

Files:

- `src/hooks/useTheme.js` or equivalent small helper
- `src/index.css`
- `tailwind.config.js`

Tasks:

- Add a theme hook that resolves `light` or `dark` from localStorage or `prefers-color-scheme`.
- Persist explicit user choices.
- Update the root layout to expose `data-theme`.
- Replace hard-coded dark-only design tokens with CSS variables for background, panel, elevated surface, border, text, muted text, accent, positive, negative, warning, and chart colors.
- Keep existing utility class names where practical so page migration can be incremental.
- Ensure form controls and select option colors work in both themes.

Verification:

- Toggle theme and reload; explicit choice persists.
- Clear stored theme; system preference is used.
- No page becomes unreadable in either theme.

## Phase 2: Responsive App Shell

Files:

- `src/components/Layout.jsx`
- `src/index.css`

Tasks:

- Replace current sticky topbar + bottom-only nav with a responsive shell.
- Desktop: add fixed/narrow left sidebar with app identity, nav icons, active plan selector, and theme toggle.
- Mobile: keep bottom tabs and add compact top controls for page title, active plan selector, and theme toggle.
- Preserve `activeTab`, `onChangeTab`, `plans`, `activePlanId`, and `onChangeActivePlan` props.
- Use accessible labels and active nav state.
- Remove or simplify the existing scroll-compact chrome behavior if it conflicts with the new shell.

Verification:

- All four tabs still switch correctly.
- Plan selector still changes active plan.
- Mobile bottom nav does not cover content or inputs.

## Phase 3: Shared Surface And Control Classes

Files:

- `src/index.css`
- Existing component files as class consumers

Tasks:

- Create/refresh shared classes for cards, stats, panels, controls, badges, filter chips, inputs, text hierarchy, financial values, and chart containers.
- Keep radii at or below the approved 8px style for the new design unless an existing control requires a pill shape.
- Move one-off dark-only classes toward tokenized classes.
- Make long numbers and labels resilient with `min-w-0`, tabular numbers, wrapping, and stable dimensions.

Verification:

- Existing screens still render before page-specific redesigns.
- Buttons, inputs, selects, disabled states, and badges remain legible in both themes.

## Phase 4: Dashboard Redesign

Files:

- `src/components/Dashboard.jsx`
- `src/index.css`

Tasks:

- Keep existing calculations and derived values.
- Reorganize layout into primary portfolio region, action/status region, and analysis region.
- Add a strong next-operation card that routes to `operation`.
- Add a budget-health card using existing budget values.
- Retain current charts: performance, allocation, funding rhythm, and average-cost checks.
- Theme chart tooltip, grid, axis, and series colors through tokens or helper constants derived from tokens.
- Preserve empty states and navigation targets.

Verification:

- Dashboard with no plan routes users toward Settings.
- Dashboard with plan and no records routes users toward Operation.
- Dashboard with records shows all existing metrics without calculation changes.

## Phase 5: Operation Panel Redesign

Files:

- `src/components/OperationPanel.jsx`
- `src/index.css`

Tasks:

- Keep existing asset state, quote fetch, price input, actual-share override, and save behavior.
- Rework top summary into a compact execution header.
- Rework each asset into the approved asset-card workspace.
- Keep visible fetch errors inside the relevant card.
- Keep execution tag and note controls.
- Rework confirmation summary with actual total, cumulative invested, remaining budget, and disabled/ready states.
- Ensure desktop two-column layout and mobile one-column layout.

Verification:

- Manual price entry still normalizes and formats correctly.
- Auto quote fetch still populates price or shows error.
- Actual-share override still changes actual amount.
- Save still creates a record and navigates to History.
- Completed fixed-period plans cannot be saved again.

## Phase 6: History Redesign

Files:

- `src/components/History.jsx`
- `src/index.css`

Tasks:

- Preserve filtering, expand/collapse, edit, delete, delete asset, CSV export, JSON export, and JSON import.
- Rework records into timeline-like cards.
- Keep default summaries compact.
- Keep expanded asset details clear and scannable.
- Keep inline edit mode visually separated from read-only state.
- Ensure import/export buttons remain reachable and labeled.

Verification:

- Filtering count and displayed records remain correct.
- Editing record recalculates via existing callback flow.
- Deleting record and deleting asset retain current confirmation behavior.
- CSV and JSON export still download.
- Import still validates payload and overwrites after confirmation.

## Phase 7: Settings Redesign

Files:

- `src/components/Settings.jsx`
- `src/index.css`

Tasks:

- Preserve all existing plan form fields and data handling.
- Group settings into plan identity, schedule/strategy, budget, assets, and backup/danger sections.
- Reduce long explanatory copy while keeping complex-field help near the relevant control.
- Make asset rows/cards stable on mobile and desktop.
- Keep destructive actions visually distinct from normal actions.

Verification:

- Creating and updating plans still works.
- Multi-plan selection remains compatible with the app shell.
- Budget mode fields still show/hide correctly.
- Backup export/import and clear data remain functional.

## Phase 8: Final Verification And Polish

Commands:

- `npm test`
- `npm run build`

Manual QA:

- Desktop light mode.
- Desktop dark mode.
- Mobile light mode.
- Mobile dark mode.
- Empty data state.
- Plan with no records.
- Plan with multiple records.
- Operation flow with manual prices.
- Operation flow with quote fetch success/failure.
- History edit/delete/import/export.

Polish checklist:

- No text overlap or clipped financial values.
- No dark-only color leftovers in light mode.
- Focus states visible.
- Chart tooltip legible in both themes.
- Bottom mobile nav does not cover action buttons or inputs.
- Lime accent is used sparingly and consistently.

## Suggested Commit Slices

1. Theme hook and token system.
2. Responsive layout shell.
3. Shared surface/control styling.
4. Dashboard redesign.
5. Operation panel redesign.
6. History redesign.
7. Settings redesign.
8. Verification and final polish.
