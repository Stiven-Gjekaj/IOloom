# Decisions

This file records each decision that the human makes.
The newest decision is at the top.

## 2026-11-21: fork OpenPLC Editor

Decision: IOloom is a fork of OpenPLC Editor v4.
IOloom does not rewrite OpenPLC Editor or QElectroTech in Rust and Slint.

Reasons:

- The fork gives the five IEC 61131-3 editors, the compiler pipeline, and the
  debugger now.
- A rewrite of both tools is too large for one person in the time of the
  course.
- Slint has no ready canvas for a CAD editor and no code editor with syntax
  highlighting.

Rejected options:

- A full rewrite of both tools in Rust and Slint.
- A new Rust app with ST and LD only.
- A Rust core inside the fork, as a Node native module or WebAssembly.
  This option can come back later for the simulation engine.

Consequences:

- The risks in section 2 of `docs/research.md` stay: upstream changes, the
  emulated Arduino simulator, and the features that are out of scope.
- The fork follows upstream release tags, not the `main` branch.
