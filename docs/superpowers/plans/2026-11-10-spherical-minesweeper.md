# Spherical Minesweeper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the project as a complete, high-density spherical Minesweeper game with unrestricted, correctly directed globe rotation.

**Architecture:** Generate a dual mesh from a subdivided icosphere, using source vertices as cells and shared source edges as exact adjacency. Keep game state independent from Three.js; render each cell as an extruded polygon mesh with code-generated number/flag markers. Rotate a globe group with screen-axis quaternions while a pointer gesture state machine separates clicks from drags.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest, HTML/CSS

**Spec:** `docs/superpowers/specs/2026-11-10-spherical-minesweeper-design.md`

## Global Constraints

- Preserve Vite + TypeScript + Three.js and strict TypeScript checks.
- All gameplay logic must be testable without WebGL or DOM mocks.
- No external texture or service dependency.
- The generated concept is the visual source of truth.

## Review Focus

- Duplicate/non-indexed icosphere vertices must still produce unique cells and reciprocal adjacency.
- First reveal and its immediate neighbors must be mine-free at every difficulty.
- Flood reveal must not reveal flagged cells or mines.
- Pointer release after a drag must not reveal or flag a cell.
- Repeated vertical rotation through both poles must remain continuous and preserve the user's drag direction.

---

### Task 1: Dense spherical topology

**Files:**

- Replace: `src/utils/SphereGrid.ts`
- Test: `src/utils/SphereGrid.test.ts`

**Interfaces:**

- Produces: `SphereGrid.generate(detail: number, radius: number): SphereCell[]`, where each cell has stable id, center, ordered boundary, and reciprocal neighbor ids.

- [ ] Write failing tests for Three.js detail levels 1/3 (42/162 cells), exactly 12 pentagons, remaining hexagons, ordered non-degenerate boundaries, and reciprocal neighbors.
- [ ] Run the focused test and confirm the old 32-cell implementation fails.
- [ ] Implement non-indexed vertex deduplication, face centroid ordering, and edge-derived adjacency.
- [ ] Run tests and confirm topology passes.

### Task 2: Complete Minesweeper rules

**Files:**

- Replace: `src/game/MinesweeperGame.ts`
- Test: `src/game/MinesweeperGame.test.ts`

**Interfaces:**

- Consumes: cell ids and neighbor-id map from Task 1.
- Produces: reveal result containing changed cell ids and status; flag toggle; chord reveal; counters and elapsed-state hooks.

- [ ] Write failing tests for first-click safe zone, exact mine count, flood reveal, flags, chording, loss, and win.
- [ ] Run the focused tests and confirm failures against the old API.
- [ ] Implement deterministic injectable RNG and result-based state transitions.
- [ ] Run tests and confirm all rules pass.

### Task 3: Unrestricted gesture rotation

**Files:**

- Replace: `src/controls/CameraControls.ts`
- Create: `src/controls/rotationMath.ts`
- Create: `src/controls/rotationMath.test.ts`

**Interfaces:**

- Produces: screen-relative quaternion delta calculation and gesture callbacks for click versus drag.

- [ ] Write failing tests that upward pointer motion moves the front surface upward and repeated pole-crossing rotations remain normalized and continuous.
- [ ] Run tests and confirm the old controller cannot satisfy the pure interface.
- [ ] Implement quaternion screen-axis rotation, pointer capture, movement threshold, and bounded zoom.
- [ ] Run tests and confirm direction and continuity.

### Task 4: Three.js game presentation and HUD

**Files:**

- Replace: `src/main.ts`
- Replace: `index.html`
- Modify: `src/utils/HexGeometry.ts`
- Delete: `src/utils/PentagonGeometry.ts`

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces: playable canvas, cell materials/labels/flags/mines, difficulty controls, counters, timer, restart, hover, result overlay.

- [ ] Build the globe renderer with one mesh per generated cell and shared cached materials.
- [ ] Wire click, flag, chord, restart, difficulty, timer, and result state to the game engine.
- [ ] Implement the concept's responsive HUD and observatory visual system.
- [ ] Run `pnpm test` and `pnpm run build`; both must pass without warnings from application code.

### Task 5: Browser interaction and visual verification

**Files:**

- Modify as required by observed failures.

**Interfaces:**

- Verifies the complete application.

- [ ] Start Vite and verify reveal, flag, flood, loss/restart, difficulty changes, click-versus-drag, zoom, and repeated pole crossings in a real browser.
- [ ] Capture the implementation at the concept's native aspect ratio and compare both images directly.
- [ ] Fix every material visual or interaction mismatch, rerun tests/build, and repeat browser verification.
- [ ] Remove temporary browser artifacts and request final independent code review.
