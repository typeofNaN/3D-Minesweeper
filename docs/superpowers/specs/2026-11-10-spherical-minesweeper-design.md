# Spherical Minesweeper Design

## Intent

Replace the existing 32-tile globe demo with a complete, readable spherical Minesweeper game built with Three.js and TypeScript. The result should feel like a focused desktop puzzle game rather than an Earth visualization.

## Gameplay

- Cover the entire sphere with a dense dual-icosphere grid: 12 pentagons and the remaining cells hexagons.
- Classic Minesweeper rules: first reveal is safe, numbered cells count adjacent mines, empty regions flood-reveal, right click toggles a flag, revealing a mine loses, revealing every safe cell wins.
- Clicking a revealed number with the correct adjacent flag count reveals its remaining hidden neighbors (chording).
- Difficulties change grid detail and mine density; restarting creates a fresh board.
- HUD shows configured mine count, flags remaining, elapsed time, and current status.

## Interaction

- Drag rotates the globe around screen-relative axes with quaternions and no polar clamp or dead zone.
- Dragging upward moves the grabbed globe surface upward; dragging downward moves it downward.
- Pointer movement beyond a small threshold is a drag and must never reveal a cell on release.
- Click reveals, right click flags, wheel zooms, hover highlights the target cell.

## Visual direction

- Use the generated `ORBITAL SWEEP` concept as the visual reference.
- Deep navy observatory background, cool slate hidden cells, pale recessed revealed cells, cyan/blue/purple numbers, amber flags, restrained red mines.
- Central globe is the sole visual focus. HUD is code-native HTML/CSS and remains compact.
- A thin orbital calibration ring and restrained lighting provide depth without obscuring cell readability.

## Constraints

- Keep Vite, TypeScript, Three.js, and Vitest.
- No external runtime services or textures are required.
- Desktop-first, responsive down to narrow screens, keyboard-visible controls, reduced-motion friendly.
- Generated concept art is a design reference only; gameplay surfaces and UI are rendered in code.

## Non-goals

- Do not copy Globesweeper branding, art, levels, or proprietary assets.
- Do not implement accounts, persistence, achievements, multiplayer, or guaranteed no-guess generation in this pass.
