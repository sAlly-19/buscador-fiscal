# Workspace Fiscal UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the renderer as a modular dark/light fiscal operations workspace with modal feedback while preserving all established business workflows.

**Architecture:** Add a Zustand store only for theme and feedback, Motion only for visual transitions, and shared dialog/layout primitives. `App.tsx` retains business orchestration and passes typed props/callbacks into presentation modules; fiscal services, repositories, IPC, and Electron window behavior remain frozen throughout this plan.

**Tech Stack:** React 18, TypeScript 5.7, Tailwind CSS 4, Zustand, Motion for React, Lucide React, Vitest 5, Testing Library, Electron 44.

**Spec:** `docs/superpowers/specs/2026-10-05-buscador-fiscal-ui-redesign-design.md`

## Global Constraints

- Start only after `2026-10-05-partial-documents-and-page-size.md` is complete and reviewed.
- Work directly on `main`, create local commits, and do not push.
- Do not change SEFAZ/NSU, parser, repository, certificate, download, storage, IPC, or Electron window behavior.
- Do not fix the known `EPERM rename` failure in this plan; only present it correctly.
- Zustand may own only theme and feedback state; business entities and operations remain in `App.tsx`.
- Motion may animate only visual entry/exit/theme transitions and must respect reduced motion.
- Preserve the native title bar.
- Preserve the approved certificate-card hierarchy and full-width action.
- Dark is the default; only dark and light themes are in scope.
- Use TDD, keep components focused, and run the complete verification gate before completion.

## Review Focus

- Corrupt or unknown persisted theme values must fall back to dark; covered in Task 1.
- Feedback arriving while another dialog is open must preserve FIFO order and timers; covered in Tasks 1–2.
- Clipboard absence or rejection must keep the error open and show inline failure; covered in Task 2.
- Long company names, certificate subjects, paths, and technical errors must truncate or scroll without breaking layout; covered in Tasks 5 and 7.
- Rendering 1000 document rows must preserve controls and complete without component errors; covered in Task 6.

---

### Task 1: UI dependencies, theme state, and feedback queue

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/stores/ui.store.ts`
- Create: `tests/unit/ui-store.test.ts`

**Interfaces:**
- Produces `UiTheme = 'dark' | 'light'`.
- Produces `FeedbackKind = 'success' | 'info' | 'warning' | 'error'`.
- Produces `FeedbackInput { kind; title; message; technicalDetails?; durationMs? }` and `FeedbackItem` with generated `id`.
- Produces `feedbackDuration(kind): number | null` using success `3000`, info/warning `5000`, and error `null`.
- Produces `formatFeedbackForClipboard(item: FeedbackItem): string`.
- Produces `useUiStore` actions `setTheme`, `toggleTheme`, `pushFeedback`, and `dismissFeedback` with FIFO queue behavior.

- [ ] **Step 1: Install UI dependencies**

Run: `npm.cmd install zustand motion`.

- [ ] **Step 2: Write failing store tests**

With local storage cleared per test, assert dark default, light persistence/hydration, corrupt-value fallback, exact feedback durations, FIFO queue order, dismissal exposing the next item, and clipboard formatting with and without technical details.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/ui-store.test.ts`  
Expected: FAIL because `ui.store.ts` does not exist.

- [ ] **Step 4: Implement the UI-only persisted store**

Persist only the theme under versioned key `buscador-fiscal-ui-v1`; exclude the feedback queue from persisted state. Validate hydrated theme values before use.

- [ ] **Step 5: Run focused and full tests**

Run: `npm.cmd test -- tests/unit/ui-store.test.ts`  
Expected: PASS.  
Run: `npm.cmd test`  
Expected: all tests pass.

- [ ] **Step 6: Commit the UI state foundation**

```bash
git add package.json package-lock.json src/stores/ui.store.ts tests/unit/ui-store.test.ts
git commit -m "feat: add visual theme and feedback state"
```

### Task 2: Accessible dialog shell and feedback system

**Files:**
- Create: `src/components/ui/DialogShell.tsx`
- Create: `src/hooks/useDialogFocus.ts`
- Create: `src/components/feedback/FeedbackDialog.tsx`
- Create: `src/components/feedback/FeedbackModalHost.tsx`
- Create: `src/components/feedback/ConfirmDialog.tsx`
- Create: `tests/unit/dialog-system.test.tsx`

**Interfaces:**
- Produces controlled `DialogShellProps { isOpen; titleId; children; onClose; closeOnBackdrop?; closeOnEscape?; initialFocusRef?; size? }`.
- Produces `FeedbackModalHost`, connected only to `useUiStore`.
- Produces controlled `ConfirmDialogProps { isOpen; title; description; confirmLabel; variant; isBusy; onConfirm; onCancel }`.

- [ ] **Step 1: Write failing accessibility and behavior tests**

Assert dialog role/title, initial focus, Tab focus containment, Escape behavior, focus restoration, non-closing error backdrop, success auto-dismiss at 3000 ms, info/warning at 5000 ms, no error timer, FIFO transition, successful copy acknowledgement, and clipboard-rejection inline failure without dismissal.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/dialog-system.test.tsx`  
Expected: FAIL because the dialog modules do not exist.

- [ ] **Step 3: Implement `useDialogFocus` and `DialogShell`**

Keep focus management local to the renderer. Use Motion's `AnimatePresence`/`motion` for overlay and panel transitions, disabling transform-heavy animation when reduced motion is requested.

- [ ] **Step 4: Implement feedback and confirmation components**

Technical details use a bounded selectable monospace region. `Copiar erro` copies title, message, and details and reports copy state inline.

- [ ] **Step 5: Run focused and full tests**

Run: `npm.cmd test -- tests/unit/dialog-system.test.tsx`  
Expected: PASS.  
Run: `npm.cmd test`  
Expected: all tests pass.

- [ ] **Step 6: Commit dialog primitives**

```bash
git add src/components/ui/DialogShell.tsx src/hooks/useDialogFocus.ts src/components/feedback tests/unit/dialog-system.test.tsx
git commit -m "feat: add accessible modal feedback system"
```

### Task 3: Theme tokens, application shell, and header

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/AppHeader.tsx`
- Create: `tests/unit/app-shell.test.tsx`
- Modify: `src/index.css`
- Modify: `src/App.tsx`

**Interfaces:**
- `AppShellProps { header; sidebar; toolbar; content; footer; overlays? }` controls layout only.
- `AppHeaderProps` consumes active company, environment, theme, and callbacks for theme, settings, and synchronization.
- Consumes `UiTheme` and `useUiStore` from Task 1.

- [ ] **Step 1: Write failing shell/header tests**

Assert dark default class, light toggle, persisted theme re-render, production/homologation badge, active-company text truncation with full title, and unchanged invocation of settings/sync callbacks.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/app-shell.test.tsx`  
Expected: FAIL because the modular shell and header do not exist.

- [ ] **Step 3: Define semantic theme tokens in `src/index.css`**

Define app/header/sidebar/panel/card/input/overlay backgrounds; subtle/default/strong borders; primary/secondary/muted text; blue primary and semantic state colors for `.theme-dark` and `.theme-light`. Retain scrollbar styling in both themes.

- [ ] **Step 4: Implement shell and header as presentation-only components**

Move the synchronization action to the header while passing the existing callback unchanged. Keep NSU controls in the document toolbar. Do not replace the native Electron frame.

- [ ] **Step 5: Integrate the shell root without moving business state**

Replace only the outer JSX structure in `App.tsx`; business state, effects, IPC calls, and handler bodies remain in place.

- [ ] **Step 6: Run focused and full tests, then commit**

Run: `npm.cmd test -- tests/unit/app-shell.test.tsx && npm.cmd test`  
Expected: PASS.

```bash
git add src/components/layout/AppShell.tsx src/components/layout/AppHeader.tsx src/index.css src/App.tsx tests/unit/app-shell.test.tsx
git commit -m "feat: add themed fiscal workspace shell"
```

### Task 4: Replace banners and native confirmation without changing operations

**Files:**
- Create: `src/features/feedback/feedback-adapters.ts`
- Create: `tests/unit/feedback-adapters.test.ts`
- Modify: `src/App.tsx`
- Modify: `packages/domain/sync-result.ts`
- Modify: `tests/unit/sync-result.test.ts`
- Delete: `src/components/AlertBanner.tsx`

**Interfaces:**
- Produces `feedbackFromError(title: string, error: unknown, fallback: string): FeedbackInput`.
- Produces `feedbackFromSyncResult(result: CombinedSefazQueryResult): FeedbackInput` while preserving existing result wording.
- App consumes `pushFeedback` and controlled `ConfirmDialog` from Tasks 1–2.

- [ ] **Step 1: Write failing adapter tests**

Assert sync complete/partial/rate-limited/error mapping, unknown thrown values, technical details, and human titles. Extend the existing refresh-order test so final sync feedback is pushed only after local documents reload.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/feedback-adapters.test.ts tests/unit/sync-result.test.ts`  
Expected: FAIL because structured feedback adapters do not exist.

- [ ] **Step 3: Implement adapters and migrate every `setBannerAlert` call**

Map initial load, company selection, search, synchronization, reset, individual downloads, and batch download outcomes. Mount `FeedbackModalHost` once in `AppShell.overlays`.

- [ ] **Step 4: Replace `window.confirm` for NSU reset with controlled confirmation state**

The confirm callback must invoke the existing reset handler only after confirmation; cancellation invokes no IPC call. Do not alter the reset message, refresh ordering, or result handling.

- [ ] **Step 5: Run focused and full tests, then commit**

Run: `npm.cmd test -- tests/unit/feedback-adapters.test.ts tests/unit/sync-result.test.ts && npm.cmd test`  
Expected: PASS.

```bash
git add src/features/feedback/feedback-adapters.ts src/App.tsx packages/domain/sync-result.ts tests/unit/feedback-adapters.test.ts tests/unit/sync-result.test.ts src/components/AlertBanner.tsx
git commit -m "feat: replace banners with modal feedback"
```

### Task 5: Modular company sidebar, certificate card, and workspace footer

**Files:**
- Create: `src/components/layout/CompanySidebar.tsx`
- Create: `tests/unit/company-sidebar.test.tsx`
- Modify: `src/components/Sidebar/CompanyList.tsx`
- Modify: `src/components/Sidebar/CertificateCard.tsx`
- Modify: `src/components/FooterDownloadBar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `CompanySidebarProps` composes the existing company/filter callbacks plus `CertificateCard` props.
- `CertificateCard` retains its existing props and behavior.
- `WorkspaceFooter` retains existing download callback and selection data.

- [ ] **Step 1: Write failing sidebar/card tests**

Assert company selection/filter callbacks, long-name tooltip/truncation, and certificate field order: title, status, subject, validity, then full-width action. Cover valid, expired, missing-certificate, and no-company states in both theme containers.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/company-sidebar.test.tsx`  
Expected: FAIL because the composed sidebar and themed approved card do not exist.

- [ ] **Step 3: Implement the sidebar and restyle the footer**

Use theme tokens and Lucide icons. Preserve all callback signatures, subject tooltip, validity formatting, and action text.

- [ ] **Step 4: Integrate with `AppShell` and run tests**

Run: `npm.cmd test -- tests/unit/company-sidebar.test.tsx && npm.cmd test`  
Expected: PASS.

- [ ] **Step 5: Commit the navigation shell**

```bash
git add src/components/layout/CompanySidebar.tsx src/components/Sidebar/CompanyList.tsx src/components/Sidebar/CertificateCard.tsx src/components/FooterDownloadBar.tsx src/App.tsx tests/unit/company-sidebar.test.tsx
git commit -m "feat: redesign company workspace navigation"
```

### Task 6: Dense document workspace

**Files:**
- Create: `src/components/documents/DocumentWorkspace.tsx`
- Create: `src/components/documents/DocumentFilters.tsx`
- Create: `tests/unit/document-workspace.test.tsx`
- Modify: `src/components/DocumentTable/DocumentTable.tsx`
- Modify: `src/components/DocumentTable/DocumentRow.tsx`
- Modify: `src/components/DocumentTable/Pagination.tsx`
- Modify: `src/components/DocumentDetailsModal.tsx`
- Modify: `src/App.tsx`
- Delete: `src/components/FilterBar.tsx`

**Interfaces:**
- `DocumentWorkspaceProps` composes filter props, document table props, NSU status, reset callbacks, page size, and page navigation.
- `DocumentFilters` has no SEFAZ sync action; synchronization belongs to `AppHeader`.
- Consumes the Task 1 partial-document metadata and Task 4 page-size selector from the functional plan.

- [ ] **Step 1: Write failing workspace tests**

Assert sticky table headers, dense rows, loading/empty states, local-period explanation, search Enter callback, NF-e/CT-e toggles, NSU reset callbacks, exact page-size options at bottom-left, page buttons, partial badges, and a 1000-row render without component errors.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/document-workspace.test.tsx`  
Expected: FAIL because the modular workspace and approved visual hierarchy do not exist.

- [ ] **Step 3: Implement `DocumentFilters` and `DocumentWorkspace`**

Compose existing handlers through props. Do not change search timing, date semantics, selected-type state, NSU values, reset behavior, selection behavior, or downloads.

- [ ] **Step 4: Apply dense theme-aware table styling**

Use amber for event-only partial rows, semantic text plus icons for all statuses, stable loading/empty regions, accessible action labels, and `title` for truncated values.

- [ ] **Step 5: Integrate and run focused/full tests**

Run: `npm.cmd test -- tests/unit/document-workspace.test.tsx tests/unit/document-presentation-ui.test.tsx tests/unit/page-size-ui.test.tsx`  
Expected: PASS.  
Run: `npm.cmd test`  
Expected: all tests pass.

- [ ] **Step 6: Commit the document workspace**

```bash
git add src/components/documents src/components/DocumentTable src/components/DocumentDetailsModal.tsx src/App.tsx tests/unit/document-workspace.test.tsx src/components/FilterBar.tsx
git commit -m "feat: redesign dense document workspace"
```

### Task 7: Restyle existing operational dialogs through the shared shell

**Files:**
- Create: `tests/unit/operational-dialogs.test.tsx`
- Modify: `src/components/CompanyModal.tsx`
- Modify: `src/components/CertificateModal.tsx`
- Modify: `src/components/SettingsModal.tsx`
- Modify: `src/components/DownloadModal.tsx`
- Modify: `src/components/SefazProgressModal.tsx`
- Modify: `src/components/DocumentDetailsModal.tsx`
- Modify: `src/components/ui/DialogShell.tsx`

**Interfaces:**
- Consumes `DialogShell` from Task 2.
- Preserves every public prop and callback on existing operational dialogs.

- [ ] **Step 1: Write failing dialog regression tests**

For each dialog, assert its existing primary/cancel callbacks and disabled/busy behavior. Also cover long technical text scrolling, long paths, certificate subjects, theme classes, and that sync progress still exposes company, document stage, NSU, count, message, and cancel.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/operational-dialogs.test.tsx`  
Expected: FAIL because dialogs do not share the themed shell.

- [ ] **Step 3: Migrate dialog markup one component at a time**

Use the shared shell for overlay/header/footer semantics while leaving each component's state, effects, validation, IPC calls, and callback order unchanged. Field validation stays inline inside its owning form.

- [ ] **Step 4: Run focused and full tests**

Run: `npm.cmd test -- tests/unit/operational-dialogs.test.tsx`  
Expected: PASS.  
Run: `npm.cmd test`  
Expected: all tests pass.

- [ ] **Step 5: Commit operational dialog styling**

```bash
git add src/components/CompanyModal.tsx src/components/CertificateModal.tsx src/components/SettingsModal.tsx src/components/DownloadModal.tsx src/components/SefazProgressModal.tsx src/components/DocumentDetailsModal.tsx src/components/ui/DialogShell.tsx tests/unit/operational-dialogs.test.tsx
git commit -m "feat: unify fiscal operation dialogs"
```

### Task 8: Final composition, regression audit, and verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Delete if unused: `src/components/Header.tsx`
- Review: all files changed in this plan

**Interfaces:**
- Produces the final renderer composition only; no new business interface.

- [ ] **Step 1: Remove obsolete visual components and imports**

Delete old header/banner/filter implementations only after `Select-String` confirms no imports remain. Keep all business handlers in `App.tsx`.

- [ ] **Step 2: Audit the frozen business boundary**

Run: `git diff <functional-baseline-commit>..HEAD -- electron packages/fiscal packages/database packages/storage packages/downloads`.  
Expected: no UI-phase changes in frozen directories, except no changes at all unless explicitly documented before proceeding.

- [ ] **Step 3: Run the full verification gate**

Run in order:

```bash
npm.cmd test
npx.cmd tsc -p tsconfig.json --noEmit
npx.cmd tsc -p tsconfig.electron.json --noEmit
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: every command exits 0 and Vitest reports zero failures.

- [ ] **Step 4: Perform the visual acceptance pass**

Verify dark and light at desktop sizes; long company/certificate/error text; 50 and 1000 page sizes; partial and complete rows; each feedback kind; confirmation; synchronization progress; empty/loading states; and reduced motion. Record any unrelated functional defect instead of fixing it.

- [ ] **Step 5: Commit final composition cleanup**

```bash
git add src/App.tsx src/index.css src/components/Header.tsx
git commit -m "refactor: complete modular fiscal workspace UI"
```

- [ ] **Step 6: Request final code review**

Review against the spec, both plans, the frozen business boundary, modal dismissal/copy behavior, accessibility, and all automated evidence. Address Critical and Important findings, rerun the full verification gate, and leave the branch ready for the user's manual push.
