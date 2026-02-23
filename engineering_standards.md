
* Project Engineering Standards (Standing Instructions)

This document serves as the authoritative guide for AI-assisted development in this environment. These rules are to be treated as hard constraints to foster disciplined engineering, modularity, and stability.

## 1. Master Manifest Integrity (Primary Directive)
*   **Zero Deletion Policy:** Never remove an entry from any registry, command list, menu, or modal state object. Even if a feature appears redundant, it must be preserved.
*   **Nomenclature Lock:** Do not rename or "rebrand" any existing command labels, IDs, or UI headers. The names you see in the code are sacred (e.g., "Angela Mode", "Centurion Kernel", "PDX").
*   **Diff-Audit Protocol:** Before submitting a file that contains a list of features (like `useCommands.ts`), verify that the total count of features has not decreased and that all IDs match the handlers in the router.

## 2. Non-Regression & UI Integrity
*   **Standing Instruction:** Do not modify any existing UI elements or state logic in a file or component unless explicitly directed to change that specific feature.
*   **Additive-Only Logic:** Use an additive approach. Append new functions, state variables, and UI elements to the end of their respective blocks.
*   **Transparency:** If a change requires a modification to a stable API or command ID for technical reasons, you must notify the user in the "Engineering Specification" before providing the code.

## 3. File Size & Modularity
*   **File Size Limit:** Strictly limit each source code file to **1000 lines**.
*   **Proactive Refactoring:** If a file exceeds **800 lines**, prioritize splitting into logical sub-modules (e.g., `utils/`, `services/`).
*   **Naming Consistency:** Use kebab-case for file names and avoid deep nesting beyond 3 directory levels.

## 4. Stability & API Integrity
*   **No Breaking Changes:** Preserve all public APIs verbatim. Function names, parameter lists, and return types must remain unchanged.
*   **Backward Compatibility:** If an internal algorithm is optimized, ensure external compatibility via adapters if necessary.

## 5. Development Protocols
*   **Thinking Mode:** Always articulate assumptions, trade-offs, and verifications in a verbose "Thinking Mode" before outputting code changes.
*   **Deep Debug Protocol:** When debugging, fix *only* the reported issue.
*   **Atomic Commits:** Group related logic into single, cohesive changes with descriptive descriptions.

## 6. Architectural Principles (SOLID)
*   **SRP:** Break down monolithic components into smaller, focused ones.
*   **OCP:** Software entities should be open for extension but closed for modification.
*   **LSP:** Subtypes must be substitutable for their base types.
*   **ISP:** Prefer many small, specific interfaces over one large one.
*   **DIP:** High-level modules should not depend on low-level modules; both should depend on abstractions.

## 7. Core Systems Architecture (PhotoPal Specifics)
*   **Strict Typing:** Prohibit the use of `any`. Force explicit type narrowing.
*   **State Normalization:** Eliminate "Boolean Explosions." Use discriminated unions for mutually exclusive UI states.
*   **Separation of Concerns:** Deeply nested components should consume specific React Contexts directly rather than relying on prop drilling.

## 8. Mandatory Parity Verification
*   **Feature Inventory:** For any file exceeding 300 lines, the "Engineering Specification" MUST include a list of all existing Command IDs and UI Triggers being preserved.
*   **Verification Note:** You must explicitly state: "Verified [X] existing features remain intact."

## 9. Structural Preservation
*   **JSX Lock:** Do not reorganize the `return()` block of a functional component for "cleanliness." Only modify the specific lines required for the requested feature or bug fix.

---
*Verification: Every output must comply with these standards. Report file sizes in the final summary.*
