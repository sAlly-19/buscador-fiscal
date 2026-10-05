# Company-Scoped Document Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent every renderer-accessible document operation from reading or exporting a document that does not belong to the active company.

**Architecture:** The renderer will identify both the company and document in typed IPC request objects, while the Electron main process remains authoritative by comparing that company with `CompanyService.getActive()`. Repository lookups will require `company_id` in their SQL predicates, so authorization is enforced at the data access boundary as well as the IPC boundary.

**Tech Stack:** TypeScript, Electron IPC/contextBridge, React 18, sql.js, Vitest.

**Spec:** `C:/Users/alisson.santos/.codex/attachments/8929dc76-3d38-47b1-abd5-783632b8c54c/Texto colado.txt` (item 1)

## Global Constraints

- Apply this plan only to audit item 1; do not bundle other audit fixes.
- The Electron main process must determine the active company and reject a different renderer-supplied company.
- Every document lookup reachable through IPC must include both document ID and company ID in the database predicate.
- Batch downloads must reject documents outside the active company.
- Opening a stored document's folder must be scoped to the active company.
- Preserve current destination-folder approval and IPC-origin checks.

## Review Focus

- A valid document ID belonging to an inactive company must look indistinguishable from a missing document to the operation.
- A stale renderer request after switching companies must be rejected instead of using the newly active company silently.
- A batch containing one foreign-company document must fail without creating a partial ZIP.
- An inactive company's known XML/PDF path must not be accepted by `openFileFolder`.
- Invalid, missing, duplicate, or oversized ID collections must retain the current validation behavior.

---

### Task 1: Company-scoped repository access

**Files:**
- Modify: `packages/database/repositories/DocumentRepository.ts`
- Test: `tests/integration/database.test.ts`

**Interfaces:**
- Produces: `findById(id: number, companyId: number): FiscalDocument | null`
- Produces: `isKnownStoragePath(filePath: string, companyId: number): boolean`

- [ ] **Step 1: Write failing repository tests**

Add tests named `deve buscar documento por ID somente dentro da empresa informada` and `deve reconhecer caminho de storage somente dentro da empresa informada`. Create two companies and documents, then assert that the owner can resolve its document/path and the other company receives `null`/`false`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/integration/database.test.ts`

Expected: FAIL because the repository methods do not yet require or apply `companyId`.

- [ ] **Step 3: Add company predicates to repository methods**

Change `findById` to query `WHERE id = ? AND company_id = ?`, and change `isKnownStoragePath` to query `WHERE company_id = ? AND (xml_path = ? OR pdf_path = ?)` with correctly ordered parameters.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- tests/integration/database.test.ts`

Expected: PASS.

### Task 2: Active-company authorization at the IPC boundary

**Files:**
- Modify: `packages/domain/types.ts`
- Modify: `electron/ipc/documentHandlers.ts`
- Create: `tests/unit/document-access.test.ts`

**Interfaces:**
- Produces: `DocumentReference { company_id: number; document_id: number }`
- Produces: `DocumentDownloadRequest extends DocumentReference { destination_folder?: string }`
- Changes: `DownloadBatchOptions` gains required `company_id: number`
- Produces: `DocumentStoragePathRequest { company_id: number; file_path: string }`

- [ ] **Step 1: Write failing authorization/parser tests**

Test that document requests reject a non-active `company_id`, accept the active company, reject malformed IDs, and that batch/path requests carry the same active-company constraint. Exercise the exported validation helper with a real `CompanyService` backed by an in-memory database; do not mock its authorization decision.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/unit/document-access.test.ts`

Expected: FAIL because the request DTOs and active-company validator do not exist.

- [ ] **Step 3: Implement request parsing and active-company validation**

Add typed DTOs, parse unknown IPC payloads with `requirePositiveInteger`, compare their company ID with `services.companyService.getActive()`, and return one generic authorization error for missing/mismatched active company. Apply the validated active company ID to search, get-by-ID, individual downloads, batch downloads, and folder opening.

- [ ] **Step 4: Run repository and authorization tests**

Run: `npm test -- tests/integration/database.test.ts tests/unit/document-access.test.ts`

Expected: PASS.

### Task 3: Carry company context through preload and renderer

**Files:**
- Modify: `electron/preload/index.ts`
- Modify: `electron/preload/types.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/DownloadModal.tsx`

**Interfaces:**
- Consumes: request DTOs produced by Task 2.
- Changes: preload document methods accept the typed request objects and invoke their existing IPC channels with one payload.
- Changes: `DownloadModal` receives required `companyId: number`.

- [ ] **Step 1: Run the Electron and renderer type checks and verify RED**

Run: `npm run build`

Expected: FAIL at existing preload/renderer call sites because Task 2 made company context mandatory.

- [ ] **Step 2: Update preload and renderer call sites**

Pass `activeCompany.id` for get-by-ID, individual downloads, batch downloads, and folder opening. Ensure modal callbacks cannot issue a request when there is no active company.

- [ ] **Step 3: Run focused tests, full tests, lint, and build**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 4: Review the final diff for scope and generated files**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only source/tests/this plan are changed, with generated `dist*` output left uncommitted.
