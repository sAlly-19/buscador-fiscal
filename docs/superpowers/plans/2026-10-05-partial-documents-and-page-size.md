# Partial Documents and Page Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore honest visibility of own-issued event-only NF-e records and move the persisted 50/100/200/500/1000 page-size choice to the Home document footer.

**Architecture:** Keep storage unchanged. `DocumentRepository.search` joins the active company only to decide visibility, then a pure domain mapper derives presentation metadata for returned rows. A shared page-size domain module is consumed by settings, repository pagination, the Home selector, and its controller.

**Tech Stack:** TypeScript 5.7, React 18, Vitest 5, Testing Library, sql.js/SQLite, Electron IPC already present.

**Spec:** `docs/superpowers/specs/2026-10-05-buscador-fiscal-ui-redesign-design.md`

## Global Constraints

- Work directly on `main`, create local commits, and do not push.
- Do not mutate or clean the user's existing database; derive partial-document presentation at read time.
- Only own-issued NF-e event rows are restored; CT-e events and third-party NF-e events remain hidden.
- Never infer sale versus return, invoice total, recipient, emission timestamp, full XML, or DANFE from an event.
- Allowed page sizes are exactly `50`, `100`, `200`, `500`, and `1000`; fallback is `50`.
- Finish and commit this functional plan before starting the visual redesign plan.
- Use TDD for every behavior change and run the full verification suite at the end.

## Review Focus

- Malformed or short access keys must not make event rows visible; covered in Task 1 repository tests.
- Search counts and result rows must use the same event-visibility predicate; covered in Task 1 pagination assertions.
- Searching by the active company's displayed name must find its partial outbound rows even when legacy storage says `Ciência da Operação`; covered in Task 1.
- Invalid stored and request page sizes must fall back to 50, while invalid updates must be rejected; covered in Task 3.
- Removing page size from Settings must not cause that modal to overwrite the Home preference; covered in Task 4.

---

### Task 1: Own-issued event visibility and presentation metadata

**Files:**
- Create: `packages/domain/document-presentation.ts`
- Create: `tests/unit/document-presentation.test.ts`
- Modify: `packages/domain/types.ts`
- Modify: `packages/database/repositories/DocumentRepository.ts`
- Modify: `tests/integration/database.test.ts`

**Interfaces:**
- Produces `DocumentDataLevel = 'COMPLETE' | 'SUMMARY' | 'EVENT_ONLY'`.
- Produces `DocumentDirection = 'INBOUND' | 'OUTBOUND'` and `DocumentDateKind = 'ISSUE' | 'EVENT'`.
- Extends `FiscalDocument` with optional `data_level`, `direction`, and `date_kind`.
- Produces `deriveDocumentPresentation(document: FiscalDocument, company: Pick<Company, 'name' | 'cnpj'>): FiscalDocument`.
- Produces `isOwnIssuedNfeEvent(documentType: DocumentType, schemaType: string, accessKey: string, companyCnpj: string): boolean`.

- [ ] **Step 1: Write failing unit tests for event classification**

Cover an own-issued NF-e event, a third-party NF-e event, a CT-e event, a malformed key, a summary, and a complete document. Assert that an own event becomes `EVENT_ONLY`/`OUTBOUND`/`EVENT`, uses the company as issuer, and exposes `total_value` as `undefined` without changing `xml_path`.

- [ ] **Step 2: Write failing repository integration tests**

Add cases asserting that:

- an own-issued NF-e event appears with the derived fields and without `Ciência da Operação`;
- the existing third-party event case remains excluded;
- an own-issued CT-e event remains excluded;
- malformed event keys remain excluded;
- `total` equals the number of returned visible rows under pagination;
- `search_query` using the active company name finds its partial outbound row;
- a subsequent summary/full NF-e still promotes the same row and removes `EVENT_ONLY` presentation.

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/document-presentation.test.ts tests/integration/database.test.ts`  
Expected: FAIL because the presentation types/functions and own-event visibility do not exist.

- [ ] **Step 4: Implement the presentation mapper**

Use the access-key issuer CNPJ at zero-based slice `[6, 20)`. Event-only records override only returned presentation fields; do not update stored columns or paths.

- [ ] **Step 5: Implement one shared SQL visibility predicate in `DocumentRepository.search`**

Alias tables as `d` and `c`, join the owning company, and reuse the same predicate for count and data queries:

```sql
d.schema_type NOT LIKE '%Evento%'
OR (
  d.document_type = 'NFE'
  AND d.schema_type LIKE '%Evento%'
  AND length(d.access_key) = 44
  AND substr(d.access_key, 7, 14) = c.cnpj
)
```

Apply search terms to the effective issuer (`c.name`/`c.cnpj` for qualifying event rows, stored issuer otherwise), then map returned items with `deriveDocumentPresentation`.

- [ ] **Step 6: Run focused and full tests**

Run: `npm.cmd test -- tests/unit/document-presentation.test.ts tests/integration/database.test.ts`  
Expected: PASS.  
Run: `npm.cmd test`  
Expected: all existing and new tests pass.

- [ ] **Step 7: Commit the functional document fix**

```bash
git add packages/domain/document-presentation.ts packages/domain/types.ts packages/database/repositories/DocumentRepository.ts tests/unit/document-presentation.test.ts tests/integration/database.test.ts
git commit -m "fix: restore partial outbound invoices"
```

### Task 2: Honest partial-document UI on the existing screen

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vitest.config.mts`
- Create: `tests/setup.ts`
- Create: `tests/unit/document-presentation-ui.test.tsx`
- Modify: `src/components/DocumentTable/DocumentRow.tsx`
- Modify: `src/components/DocumentDetailsModal.tsx`

**Interfaces:**
- Consumes the `FiscalDocument` presentation fields from Task 1.
- Produces `isEventOnlyDocument(document: FiscalDocument): boolean` from `packages/domain/document-presentation.ts` for consistent UI branching.

- [ ] **Step 1: Add component-test dependencies and configuration**

Run: `npm.cmd install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`.

Change Vitest include to `tests/**/*.test.{ts,tsx}` and load `tests/setup.ts`, which imports `@testing-library/jest-dom/vitest`.

- [ ] **Step 2: Write failing component tests for a partial row and details dialog**

Assert `NF-e · Saída`, `Dados parciais`, company issuer, `—` total, event-date wording, `XML do evento`, and disabled/unavailable PDF. Also assert that a real complete document with numeric zero still formats `R$ 0,00`.

- [ ] **Step 3: Run the component test and verify RED**

Run: `npm.cmd test -- tests/unit/document-presentation-ui.test.tsx`  
Expected: FAIL because the current components label the event as a normal authorized invoice and render `R$ 0,00`.

- [ ] **Step 4: Update row and detail presentation without changing callbacks**

Keep the existing download/view handler signatures. For event-only rows, label the stored XML action as event XML and keep PDF disabled; normal summary/full behavior remains unchanged.

- [ ] **Step 5: Run focused and full tests**

Run: `npm.cmd test -- tests/unit/document-presentation-ui.test.tsx`  
Expected: PASS.  
Run: `npm.cmd test`  
Expected: all tests pass.

- [ ] **Step 6: Commit the partial-document presentation**

```bash
git add package.json package-lock.json vitest.config.mts tests/setup.ts tests/unit/document-presentation-ui.test.tsx src/components/DocumentTable/DocumentRow.tsx src/components/DocumentDetailsModal.tsx packages/domain/document-presentation.ts
git commit -m "feat: label event-only invoices as partial"
```

### Task 3: Shared page-size rules and persistence validation

**Files:**
- Create: `packages/domain/page-size.ts`
- Create: `tests/unit/page-size.test.ts`
- Modify: `packages/database/repositories/SettingsRepository.ts`
- Modify: `packages/database/repositories/DocumentRepository.ts`
- Modify: `tests/integration/database.test.ts`

**Interfaces:**
- Produces `PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000] as const`.
- Produces `PageSize` from that tuple.
- Produces `isPageSize(value: unknown): value is PageSize`.
- Produces `normalizePageSize(value: unknown): PageSize`, returning `50` for invalid input.

- [ ] **Step 1: Write failing domain and repository tests**

Assert every allowed value, invalid values `25`, `0`, `2000`, fractions, strings, and missing values. In repository integration tests, assert settings accepts all five values, rejects invalid updates, invalid persisted values read as 50, search accepts 1000, and invalid request sizes normalize to 50.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/page-size.test.ts tests/integration/database.test.ts`  
Expected: FAIL because values above 200 are rejected and no shared rule exists.

- [ ] **Step 3: Implement the shared page-size domain module**

Replace range-based validation in both repositories. `SettingsRepository.updateSettings` throws for a non-member; stored or search-request values use `normalizePageSize`.

- [ ] **Step 4: Run focused and full tests**

Run: `npm.cmd test -- tests/unit/page-size.test.ts tests/integration/database.test.ts`  
Expected: PASS.  
Run: `npm.cmd test`  
Expected: all tests pass.

- [ ] **Step 5: Commit page-size rules**

```bash
git add packages/domain/page-size.ts packages/database/repositories/SettingsRepository.ts packages/database/repositories/DocumentRepository.ts tests/unit/page-size.test.ts tests/integration/database.test.ts
git commit -m "feat: support page sizes up to one thousand"
```

### Task 4: Move the persisted selector to Home

**Files:**
- Create: `src/features/documents/page-size-controller.ts`
- Create: `tests/unit/page-size-ui.test.tsx`
- Modify: `src/components/DocumentTable/Pagination.tsx`
- Modify: `src/components/DocumentTable/DocumentTable.tsx`
- Modify: `src/components/SettingsModal.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes `PageSize` and `PAGE_SIZE_OPTIONS` from Task 3.
- Produces `changePageSize(size: PageSize, save: (value: Partial<AppSettings>) => Promise<AppSettings>, reloadFirstPage: (size: PageSize) => Promise<void>): Promise<AppSettings>`.
- Extends pagination props with `pageSize: PageSize` and `onPageSizeChange(size: PageSize): void`.

- [ ] **Step 1: Write failing controller and component tests**

Assert that save completes before reload, reload receives page size and page 1 semantics, the selector renders exactly five `arquivos` options at the footer's left, changing to 500 invokes the callback, and Settings no longer renders or submits `items_per_page`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/page-size-ui.test.tsx`  
Expected: FAIL because the selector is still inside Settings and pagination has no size props.

- [ ] **Step 3: Implement the controller and existing-screen selector**

In `App`, persist through `window.fiscalApi.settings.update({ items_per_page: size })`, set returned settings, clear selected document IDs, and call the existing local search for page 1 with the new size. Do not change the document search IPC contract.

- [ ] **Step 4: Remove page-size state and payload from Settings**

Keep environment and default-folder behavior untouched. The Settings save payload must omit `items_per_page` entirely.

- [ ] **Step 5: Run focused and full tests**

Run: `npm.cmd test -- tests/unit/page-size-ui.test.tsx`  
Expected: PASS.  
Run: `npm.cmd test`  
Expected: all tests pass.

- [ ] **Step 6: Run the functional-plan verification gate**

Run in order:

```bash
npx.cmd tsc -p tsconfig.json --noEmit
npx.cmd tsc -p tsconfig.electron.json --noEmit
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 7: Commit the Home selector**

```bash
git add src/features/documents/page-size-controller.ts src/components/DocumentTable/Pagination.tsx src/components/DocumentTable/DocumentTable.tsx src/components/SettingsModal.tsx src/App.tsx tests/unit/page-size-ui.test.tsx
git commit -m "feat: move page size to document workspace"
```

### Task 5: Functional-baseline review checkpoint

**Files:**
- Review only: all files changed by Tasks 1–4

**Interfaces:**
- Produces a clean, committed functional baseline consumed by the UI redesign plan.

- [ ] **Step 1: Inspect commit boundaries and working tree**

Run: `git status --short` and `git log -4 --oneline`.  
Expected: clean tree; document visibility, partial presentation, page-size rules, and Home selector are separate local commits.

- [ ] **Step 2: Verify the user's live data non-destructively**

Run a read-only diagnostic against `data/fiscal_storage.db` and confirm that qualifying own-issued events are returned by the same predicate. Do not update the database or delete event XML files.

- [ ] **Step 3: Request code review before visual work**

Review specifically for company isolation, count/data predicate parity, misleading fiscal labels, and any hidden business-logic change. Address Important findings before starting the redesign plan.
