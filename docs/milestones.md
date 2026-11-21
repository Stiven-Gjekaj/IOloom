<div align="center">
  <a href="../README.md"><b>IOloom</b></a>
</div>

# Milestones

This file holds the decisions that shape the work, and the reason behind each
one. It also holds the options that lost, because the reason a choice lost is
the part that a later reader needs. The newest decision is at the top.
[The roadmap](roadmap.md) says what comes next.

## 2026-11-21: development runs without a stop

Decision: the agent works through the roadmap without a stop for approval at
each phase. It cuts the releases that [docs/releasing.md](releasing.md)
describes, and pushes them.

- A separate session is allowed for a one-off job, such as one fault fix.
  The agent archives each session when it is done.
- A background subagent is not used, because the human cannot see it.

## 2026-11-21: semantic versions with codenames

Decision: `MAJOR.MINOR.PATCH`, a minor release at each phase, a patch release
for each hotfix, and a codename for each minor release.
[docs/releasing.md](releasing.md) gives the rules.

Reasons:

- The project format decides what a version means to a user. A semantic
  version shows if a file opens in an older IOloom.
- A patch number has no limit, so frequent hotfixes need no new scheme.
- The other repositories of the owner use semantic versions (Burnout,
  inkland) and codenames (AllTheOddities).

Rejected options:

- A date version (`YYYY.MM.N`), as in AllTheOddities. It hides changes to the
  project format.
- A version that holds the upstream version. Upstream releases each week, so
  the version of IOloom would follow a schedule that IOloom does not control.

## 2026-11-21: the roadmap holds formats and all platforms

Decision: imports and exports of the common formats, and builds for macOS,
Windows, and Linux, are part of the roadmap. The builds start in P1, the
first release.

Reason: upstream already builds for the three operating systems, so the
builds cost little at the start and much more later.

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
