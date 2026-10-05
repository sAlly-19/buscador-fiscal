# Buscador Fiscal UI/UX Redesign — Design Specification

**Date:** 2026-10-05  
**Status:** Approved in conversation; awaiting written-spec review  
**Reference:** [Workspace Fiscal](https://github.com/sAlly-19/workspace-fiscal)

## 1. Purpose

Redesign the Buscador NF-e/CT-e as a dense, professional fiscal operations workspace inspired by Workspace Fiscal. The application must support dark and light themes, modular UI components, modal feedback, and an in-context page-size selector while preserving its existing SEFAZ, certificate, storage, download, and IPC behavior.

Before the visual redesign begins, two explicitly requested functional changes must be completed and committed separately:

1. Restore visibility of NF-e issued by the active company when SEFAZ distributed only an event for that access key, without presenting the event name as the issuer.
2. Support exactly 50, 100, 200, 500, or 1000 files per page and move that preference from Settings to the main document workspace.

## 2. Success Criteria

- Users can see their own event-only outbound NF-e records again as partial documents.
- “Ciência da Operação” is never displayed as an issuer.
- Partial records never invent total value, issue date, recipient, or full XML availability.
- The page-size selector is visible at the bottom-left of the document workspace and persists its value.
- All existing banner notifications are replaced by centered feedback dialogs.
- Errors remain open until dismissed and expose a “Copiar erro” action.
- Success and informational dialogs close automatically and can also be dismissed immediately.
- Dark and light themes cover the entire renderer and persist between launches.
- The digital-certificate card retains its current information hierarchy and full-width action button.
- The UI is split into small components with explicit data and callback contracts.
- No SEFAZ, NSU, certificate, parser, storage, download, or IPC behavior changes during the UI/UX phase.

## 3. Non-Goals

- Fixing the `EPERM` database rename failure shown in the supplied screenshot. The redesigned error dialog will present it clearly, but persistence behavior is out of scope.
- Inferring whether an event-only outbound NF-e represents a sale or return. The event XML does not contain enough information to make that claim.
- Reconstructing missing invoice totals, recipients, emission timestamps, products, or DANFE data.
- Replacing the native Electron title bar or changing window lifecycle behavior.
- Rewriting repositories, fiscal services, parsers, or IPC contracts as part of the visual redesign.
- Adding a dashboard or permanent document-preview pane. The selected direction is a dense operational table.

## 4. Delivery Boundaries

Work is divided into independently reviewable phases:

### Phase A — Functional baseline

- Restore only qualifying own-issued event records.
- Introduce the exact page-size value set and persistence behavior.
- Add regression tests.
- Commit these changes before visual work starts.

### Phase B — UI architecture and visual redesign

- Add UI-only dependencies and state.
- Build the theme system, shell, table treatment, modal feedback, and component transitions.
- Keep business data and operations in the existing `App` orchestration flow.
- Do not make opportunistic functional corrections.

### Phase C — Verification and visual review

- Run all automated checks.
- Exercise both themes and all feedback types.
- Confirm that pre-redesign functional tests remain green.
- Report unrelated functional defects separately rather than fixing them inside UI commits.

## 5. Partial Outbound NF-e Representation

### 5.1 Visibility rule

An event-only row is visible when all of the following are true:

- It belongs to the active company.
- It is an NF-e event schema.
- Digits 7 through 20 of its 44-digit access key, which encode the issuer CNPJ, equal the active company CNPJ.

Other event-only rows remain hidden. Normal NF-e and CT-e summaries and complete documents remain visible under the existing rules.

The observed production database contains 235 NF-e event rows for “SUPERMERCADO PRECO BAIXO TODO DIA”; 233 access keys encode that company as issuer. This rule restores those 233 rows without restoring unrelated technical events.

### 5.2 Presentation fields

The repository or a pure presentation mapper will expose explicit derived metadata without altering stored XML:

- `data_level`: `COMPLETE`, `SUMMARY`, or `EVENT_ONLY`.
- `direction`: `OUTBOUND` when the access-key issuer matches the active company; otherwise `INBOUND` when determinable.
- `date_kind`: `EVENT` for event-only rows and `ISSUE` for fiscal documents.

For a qualifying event-only row:

- Type label: `NF-e · Saída`.
- Data badge: `Dados parciais`.
- Issuer name and CNPJ: active company name and CNPJ.
- Number and series: values already decoded from the access key.
- Date: event date, explicitly identified as such in details.
- Total: unavailable, rendered as `—`.
- Recipient: unavailable unless actually present in persisted metadata.
- XML action: identified as `XML do evento`, never as the full NF-e XML.
- PDF/DANFE: unavailable.

Stored legacy values such as issuer name `Ciência da Operação` must be overridden in the returned view model for event-only rows. No destructive database cleanup is required.

### 5.3 Promotion to a full document

The existing upsert behavior remains authoritative. If a summary or complete NF-e later arrives for the same company and access key, it replaces the event placeholder’s schema and fiscal metadata. The row then renders as a normal summary or complete document.

## 6. Page Size

- Allowed values: `50`, `100`, `200`, `500`, and `1000`.
- Default and invalid-value fallback: `50`.
- Label: `Exibir por vez`.
- Option copy: `50 arquivos`, `100 arquivos`, `200 arquivos`, `500 arquivos`, and `1000 arquivos`.
- Location: left side of the document pagination footer on the Home screen.
- Changing the value persists `items_per_page`, clears page selection when necessary, and reloads page 1.
- Settings no longer displays or edits this field and must not overwrite it with stale modal state.
- Search input validation and repository pagination must accept up to 1000 while rejecting or normalizing values outside the allowed set.

## 7. UI Architecture

### 7.1 Dependencies

- `zustand`: UI-only state for theme and feedback dialogs.
- `motion`: visual entry, exit, and theme transitions only.
- Existing React, Tailwind CSS, and Lucide React remain the rendering stack.

No fiscal document, company, certificate, synchronization, or download payload is owned by Zustand. Those remain in the current application orchestration and IPC flow.

### 7.2 Module boundaries

The renderer is organized by responsibility:

- `layout/`
  - `AppShell`: top-level visual grid only.
  - `AppHeader`: identity, active company context, environment, theme toggle, settings, and sync action.
  - `CompanySidebar`: company navigation and new-company action.
  - `WorkspaceFooter`: selected-file count, destination, and batch download action.
- `documents/`
  - `DocumentFilters`: local date filters, search, and NF-e/CT-e type controls.
  - `DocumentTable`: table composition and loading/empty states.
  - `DocumentRow`: one document presentation, including partial state.
  - `DocumentPagination`: page navigation and page-size selector.
  - `DocumentDetailsDialog`: complete, summary, and event-only detail presentation.
- `feedback/`
  - `FeedbackModalHost`: displays one queued feedback item at a time.
  - `FeedbackDialog`: success, info, warning, and error variants.
  - `ConfirmDialog`: destructive or consequential confirmations such as NSU reset.
- `sync/`
  - `SyncProgressDialog`: visual restyle of the existing SEFAZ progress and cancellation flow.
- `theme/`
  - theme tokens and a small UI store selector; no business-state imports.

Visual components consume typed props and callbacks. They do not import database repositories, fiscal services, or Electron IPC handlers.

### 7.3 App orchestration

`App.tsx` remains the owner of existing business workflow during this project. It passes data and handlers to the new shell and feature components. Business hooks are not extracted or behaviorally refactored during the redesign.

## 8. Visual System

### 8.1 Direction

The approved direction is “Painel operacional”:

- Dense table as the primary work surface.
- Company list in the left sidebar.
- Compact filters above the table.
- Pagination and page-size control below the table.
- Strong blue primary action and restrained semantic colors.
- Thin borders, compact spacing, and high information density.

The layout does not add a dashboard or permanent preview panel.

### 8.2 Theme tokens

Both themes share the same spacing, sizing, and component hierarchy. CSS custom properties provide semantic tokens for:

- application, header, sidebar, panel, card, input, and overlay backgrounds;
- subtle, default, and strong borders;
- primary, secondary, and muted text;
- blue primary accent;
- emerald success, amber warning/partial, red error, and blue information states.

Dark is the initial default. The user can toggle dark/light from the header. The Zustand UI store persists the choice in renderer storage under a versioned key. There is no automatic system-theme mode in this scope.

### 8.3 Header

The header contains:

- Buscador Fiscal identity and NF-e/CT-e context.
- Active company context without duplicating business state.
- Production/homologation badge.
- Theme toggle.
- Settings action.
- Primary `Sincronizar` action.

### 8.4 Company sidebar

The sidebar keeps company selection and quick NF-e/CT-e filters. The selected company receives a blue-accent state in both themes. The new-company action remains available near the section title.

### 8.5 Digital certificate card

The approved card structure must remain visually recognizable:

1. Key icon and `Certificado digital` title.
2. Shield icon and semantic state such as `Válido` or `Expirado`.
3. Certificate subject on one truncated line with full value available as a tooltip.
4. `Validade: DD/MM/AAAA`.
5. Full-width outlined `Alterar certificado` or `Associar certificado` button.

Only colors, border tokens, and hover/focus states adapt between themes. The card must not be reduced to a compact status strip.

### 8.6 Document table

- Sticky header and compact rows.
- Explicit type, direction, data-level, fiscal-status, and availability cues.
- Partial outbound documents use amber rather than success green.
- Zero monetary values from real documents remain valid; only event-only missing totals render as `—`.
- Icon actions retain accessible labels and tooltips.
- Loading and empty states occupy the table work surface without shifting the shell.

## 9. Feedback and Confirmation Dialogs

### 9.1 Feedback model

All current banner feedback routes through one typed API with:

- `kind`: `success`, `info`, `warning`, or `error`.
- `title`: short human-readable outcome.
- `message`: actionable description.
- `technicalDetails`: optional raw error details.
- optional auto-dismiss duration.

Only one feedback dialog is visible at a time; later feedback is queued.

### 9.2 Dismissal policy

- Success: auto-dismiss after 3 seconds.
- Information and warning: auto-dismiss after 5 seconds.
- Error: never auto-dismiss.
- All variants expose a close action.
- Escape closes non-busy feedback dialogs.
- Clicking the backdrop does not close an error, preventing accidental loss of diagnostic information.

### 9.3 Copy error

Error dialogs expose `Copiar erro`. The copied text includes title, message, and technical details when present. Copy success is acknowledged inline inside the same dialog rather than opening another feedback item.

Long technical details render in a bounded, scrollable monospace region. Paths and stack information remain selectable.

### 9.4 Confirmations

Native `window.confirm` is replaced by the modular `ConfirmDialog`, but the underlying operation and callback ordering remain unchanged. Confirmation dialogs never auto-dismiss.

### 9.5 Synchronization progress

The existing progress modal remains a dedicated busy dialog. It continues to show stage, NSU, count, and cancellation. Only its visual treatment changes.

## 10. Data Flow

The preserved runtime path is:

`App orchestration → window.fiscalApi → secure IPC handler → domain/repository/service → response → App state → visual component props`

Theme and feedback are the only renderer-global states:

`visual interaction → useUiStore → theme tokens or FeedbackModalHost`

The page-size selector uses the existing settings API and then triggers the existing local document search with page 1. It does not bypass IPC or query the database directly.

## 11. Error Handling

- Existing caught errors are converted to structured feedback without changing their source operation.
- Unknown thrown values are normalized to a safe generic message plus copyable technical text.
- Clipboard failure keeps the error dialog open and shows an inline copy-failure state.
- Automatic feedback timers pause while the window is not active where practical; dismissal never interrupts a running fiscal operation.
- The known `EPERM rename` failure is displayed but not corrected in this scope.

## 12. Accessibility and Desktop UX

- Dialogs use `role="dialog"`, `aria-modal="true"`, labelled titles, focus trapping, initial focus, and focus restoration.
- Theme toggle, icon actions, pagination, and document selectors have accessible names.
- Visible focus rings meet both theme palettes.
- Semantic state is communicated by icon and text, not color alone.
- Motion respects `prefers-reduced-motion`.
- Dense rows retain usable pointer targets and keyboard navigation.

## 13. Testing Strategy

### Functional baseline tests

- Own-issued NF-e event appears as an outbound partial document.
- Third-party event remains excluded.
- Complete and summary documents remain visible.
- Legacy `Ciência da Operação` issuer text is not returned for a partial row.
- Later summary/full NF-e still promotes an event placeholder.
- Exactly 50, 100, 200, 500, and 1000 are accepted page sizes.
- Invalid page sizes normalize to 50.
- Changing page size reloads page 1 and persists the setting.

### UI-state tests

- Theme defaults to dark, toggles to light, and hydrates the persisted choice.
- Success/info/warning schedule their required dismissal durations.
- Error feedback has no automatic dismissal.
- Copy-error text contains human and technical details.
- Queued feedback is displayed in insertion order.

### Component and integration checks

- Partial rows render `NF-e · Saída`, `Dados parciais`, event date semantics, and `—` total.
- Partial details label the stored file as event XML and disable PDF/DANFE.
- Certificate card preserves its approved field order in both themes.
- Page-size selector is absent from Settings and present in the Home footer.
- Existing synchronization, download, company selection, and certificate callbacks are invoked unchanged.

Every phase ends with the full Vitest suite, both TypeScript project checks, ESLint, production build, and `git diff --check`.

## 14. Acceptance Checklist

- [ ] Functional changes are committed separately before UI redesign commits.
- [ ] Event-only outbound NF-e records are visible and honestly labelled.
- [ ] Unrelated technical events remain hidden.
- [ ] Page sizes match the exact approved set through 1000.
- [ ] No page-size field remains in Settings.
- [ ] The operational-table layout matches the approved direction.
- [ ] Dark and light themes cover every screen and dialog.
- [ ] Certificate card retains the approved structure.
- [ ] All banner notifications are removed.
- [ ] Errors offer `Copiar erro` and require manual dismissal.
- [ ] Success/info/warning feedback auto-dismisses.
- [ ] Visual modules do not import fiscal or persistence services.
- [ ] Fiscal logic is unchanged during the UI phase.
- [ ] Full verification passes before completion.
