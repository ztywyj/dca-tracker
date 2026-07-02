# DCA Tracker UI Redesign Design

Date: 2026-06-29

## Goal

Redesign the DCA Tracker interface while preserving the existing product logic, data model, and user workflow. The redesign adds coordinated day and night modes, improves desktop dashboard maturity, keeps mobile navigation familiar, and makes the recurring DCA/VA execution flow clearer.

## Selected Direction

Use the **Responsive Fintech Console** direction:

- Desktop uses a fixed left sidebar.
- Mobile keeps a bottom tab bar.
- Theme uses a Graphite + Lime day/night pair.
- Dashboard uses a balanced control-console layout.
- Operation page uses an asset-card workspace.
- History and Settings retain their current capabilities with clearer layout and visual hierarchy.

This direction combines the light management-console feel of the finance management reference with the darker premium fintech feel of the Terlice-style reference.

## Non-Goals

- Do not rewrite DCA, VA, budget, record rebuild, or portfolio cost calculations.
- Do not change backup JSON shape or CSV export fields.
- Do not introduce routing; the app remains a tabbed single-page React app.
- Do not remove existing capabilities such as multi-plan switching, history editing, import/export, or quote fetching.

## Architecture

Keep the existing `App` tab model:

- `dashboard`
- `operation`
- `history`
- `settings`

Replace the current layout shell with a responsive shell:

- Desktop: left sidebar with app identity, four navigation entries, active plan selector, and theme toggle.
- Mobile: compact top area for page title, active plan selector, and theme toggle, plus bottom four-tab navigation.
- Main content remains rendered through the current lazy-loaded screen components.

The shell owns navigation presentation only. It should not own calculation logic, record mutation logic, or page-specific form state.

## Theme System

Add a lightweight theme state:

- Read user preference from localStorage.
- If no user preference exists, follow `prefers-color-scheme`.
- When the user toggles theme, persist the explicit choice.
- Apply the active theme to the root layout with `data-theme="light"` or `data-theme="dark"`.

Theme tokens:

- Light mode: near-white app background, white panels, graphite text, low-saturation borders, muted gray secondary text.
- Dark mode: graphite black app background, deep green/gray panels, soft white text, muted gray secondary text.
- Lime is reserved for primary action, active navigation, key progress, positive emphasis, and selected states.
- Negative, warning, and informational states must remain visually distinct from lime.

Charts should derive axis, tooltip, grid, and series colors from the same theme tokens so Recharts components stay legible in both modes.

## Layout And Navigation

Desktop sidebar:

- Four nav entries with lucide icons: Overview, Operation, History, Settings.
- Current active entry uses lime accent and clear contrast.
- Active plan selector is visible when plans exist.
- Theme toggle sits near the lower part of the sidebar.

Mobile shell:

- Top area shows current page context, active plan selector when needed, and theme toggle.
- Bottom tab bar keeps the existing four-tab mental model.
- Bottom navigation must not cover form inputs or confirmation controls.

## Dashboard

Use a balanced control-console layout.

Primary region:

- Portfolio market value.
- Total invested.
- Floating profit/loss amount and percent.
- Performance trend.

Action/status region:

- Next period status and call-to-action to go to the operation page.
- Budget health: deployable budget, cumulative invested, remaining budget, reserve floor when relevant.

Analysis region:

- Current weight allocation.
- Funding trend.
- Average cost and price-gap indicators.
- Latest record summary.

Empty state:

- If no plan exists, guide the user to Settings.
- If a plan exists but no records exist, guide the user to Operation.

## Operation Panel

Use an asset-card workspace.

Top summary:

- Current period.
- Execution date.
- Strategy and frequency.
- Latest record reference.
- Asset count and price readiness.
- Budget or open-ended target summary.

Asset cards:

- One card per asset.
- Show ticker, name, target weight, current shares, target value, required amount, suggested shares, price source, actual shares, and actual amount.
- Keep existing quote fetch behavior.
- Keep manual price and actual-share override behavior.
- Clearly show fetch errors inside the relevant asset card.

Confirmation area:

- Show actual total, cumulative invested, and remaining budget.
- Keep existing execution tag choices: normal, underweight, paused.
- Keep note field.
- Confirm button remains disabled until all required prices are ready and the plan is not complete.

Responsive behavior:

- Desktop can use a two-column asset-card grid.
- Mobile uses a single column with stable input widths and no text overflow.

## History

Retain current behavior:

- Filter by all, normal, underweight, paused.
- Expand and collapse records.
- Edit tag, note, asset price, and actual shares.
- Delete records with confirmation.
- Export CSV.
- Export/import JSON backup.

Redesign presentation:

- Use timeline-like record cards.
- Default view shows period, date, tag, total actual amount, cumulative invested, and remaining budget.
- Expanded view shows asset-level details.
- Editing view should remain inline and clearly separated from read-only details.

## Settings

Retain current behavior:

- Create and update plans.
- Switch active plan.
- Configure strategy, frequency, budget mode, total periods, total budget, reserve ratio, periodic target, and assets.
- Import/export backup and clear all data.

Redesign presentation:

- Use grouped form sections.
- Keep labels concise and place explanatory copy near complex fields only.
- Use stable controls and input widths so long plan names, tickers, and numeric values do not break layout.

## Data Flow

Keep current data modules and callback flow:

- `usePlan`
- `useRecords`
- `dcaCalc`
- `vaCalc`
- `budget`
- `portfolioCost`
- `storage`
- `useQuote`

Theme state is the only new cross-cutting state. It should be isolated in a small hook or helper and consumed by the layout.

Record save, edit, delete, import, clear, and active-plan switching should continue to flow through `App` callbacks and existing hooks.

## Accessibility And Interaction

- Theme toggle must be a real button with an accessible label.
- Navigation buttons must expose active state with `aria-current` or equivalent.
- Form controls keep visible labels.
- Focus states must be visible in both themes.
- Text and numbers must not overflow buttons, cards, tabs, or inputs at mobile widths.
- Color cannot be the only status signal for critical states such as errors or disabled confirmation.

## Testing And Verification

Automated checks:

- Run `npm test`.
- Run `npm run build`.

Manual desktop checks:

- Sidebar navigation changes tabs correctly.
- Active plan selector works.
- Theme toggle persists user choice.
- Dashboard, Operation, History, and Settings remain usable in both themes.

Manual mobile checks:

- Bottom tab navigation remains reachable.
- Top controls do not crowd page titles or plan selector.
- Operation inputs are not covered by fixed navigation.
- Long values and labels do not overflow.

Behavior checks:

- Theme follows system when no preference is stored.
- Manual theme choice overrides system and persists after reload.
- Price fetch, manual price entry, actual-share override, and record save keep existing behavior.
- History edit/delete/import/export keep existing behavior.
- Empty states still route users toward Settings or Operation as appropriate.
