<div align="center">
  <a href="../README.md"><b>IOloom</b></a>
</div>

# The roadmap to version 1

[docs/milestones.md](milestones.md) holds each decision and the reason for
it. [docs/research.md](research.md) holds the facts and the risks behind the
plan. This file says in what order to build IOloom.

Each phase has a goal, the work in it, an exit test, and the release that
holds it. Do not start a phase until the phase it depends on passes its exit
test. The times are estimates for part-time work by one student. Each time
includes 20 percent for the faults that the phase finds.

P0 is complete. [docs/spikes/p0.md](spikes/p0.md) holds the results.
P1 is next.

---

## The order, and the reason for it

Three rules set the order.

**Risk first.** The simulator is the largest unknown, so P0 tests it before
any feature work.

**Class use early.** Each phase up to P5 adds a part that a student needs in
the automation course. P5 is the first phase where the schematic and the
program run together.

**A release at each phase.** Each phase ends with a minor release. A fault
gets a patch release at any time. [docs/releasing.md](releasing.md) gives the
rules.

---

## The four tracks

- **Integration (I):** close each gap between the schematic and the program.
- **Upstream fixes (F):** fix the open faults of OpenPLC Editor that affect
  IOloom work. Source: the 35 open issues on 2026-11-21. Issues about
  hardware, vendor protocols, and boards are out of scope.
- **Quality of life (Q):** features that make daily work faster.
- **Stability (S):** tests, fault fixes, and performance.

Imports, exports, and the builds for each operating system are part of the
phases. [Formats](#formats) and [Platforms](#platforms) list them in one place.

---

## The phases

| Phase | Goal | Exit test | Release | Weeks | Total |
|-------|------|-----------|---------|-------|-------|
| P0 | Spikes | Each spike has a written result. We choose the simulation path. | none | 2 | 2 |
| P1 | Course base and builds | An installer for each operating system installs, and it simulates a sample LD program with no network. | 0.1.0 | 3 | 5 |
| P2 | Symbols | Each of the 9028 elements loads, or gives a clear error. | 0.2.0 | 3 | 8 |
| P3 | Schematic | You draw a motor start circuit, save it, open it again, and export it to PDF. | 0.3.0 | 6 | 14 |
| P4 | Signals and links | A rename in the schematic changes the LD program. A contact in a rung jumps to its device. An I/O list goes out to Excel and back with no change. | 0.4.0 | 6 | 20 |
| P5 | Live schematic | A start-stop circuit runs in the schematic. | 0.5.0 | 4 | 24 |
| P6 | Plant and faults | A tank fill exercise runs with no hardware. A broken wire shows in the program. | 0.6.0 | 5 | 29 |
| P7 | PLC exchange | A project goes out as PLCopen XML, into a CODESYS-based tool, and back, with no lost POU. | 0.7.0 | 4 | 33 |
| P8 | Language fixes and quality of life | Each listed issue has a test that passes. | 0.8.0 | 3 | 36 |
| P9 | Schematic exchange and reports | A `.qet` project opens in IOloom and in QElectroTech after an export. A DXF export opens in LibreCAD. | 0.9.0 | 5 | 41 |
| P10 | Stability and packages | No fault of high severity is open. A release candidate holds for two weeks of real course work. | 1.0.0 | 4 | 45 |
| P11 | Engineering exchange | Each format has a round-trip test. | 1.x | open | |

### P0: spikes

- Merge OpenPLC Editor v4.3.5 into this repository, with its history.
- Build on macOS with Apple Silicon.
- Run a sample project in the simulator.
- Test the WebAssembly path for the simulation.
- Read all 9028 `.elmt` files with a TypeScript reader, and draw them as SVG.
- Run the upstream build workflow for Windows and Linux in this repository.

### P1: course base and builds

- F1 and Q1 (see [the work items](#the-work-items)).
- Work offline. Hide the features that are out of scope.
- Builds for six targets: see [Platforms](#platforms).
- A release workflow that builds, hashes, and attests each file, and opens a
  draft release.

### P2: symbols

- `.elmt` reader, symbol model, SVG renderer.
- Library browser with search, in the languages of the element names.
- Import: one `.elmt` file, or a folder of them, into the user library.

### P3: schematic

- Q2 (see [the work items](#the-work-items)).
- Sheets, symbols, orthogonal wires, designations, title block.
- Save and load. Undo and redo.
- Export: SVG and PNG of one sheet, PDF of all sheets.

### P4: signals and links

- I1 (see [the work items](#the-work-items)).
- Import and export of the I/O list as CSV and XLSX.

### P5: live schematic

- I2 and F2 (see [the work items](#the-work-items)).

### P6: plant and faults

- I3 (see [the work items](#the-work-items)).
- Course exercises as example projects.

### P7: PLC exchange

- PLCopen XML (TC6) import and export. CODESYS, Machine Expert, TwinCAT, and
  Beremiz read this format.
- Import of OpenPLC Editor v3 projects.
- Import and export of one POU as a plain `.st` file.
- Export of single POUs, functions, function blocks, and UDTs (#648).
- I4 (see [the work items](#the-work-items)).

### P8: language fixes and quality of life

- F3 and Q3 (see [the work items](#the-work-items)).

### P9: schematic exchange and reports

- `.qet` project import and export.
- DXF import as a drawing, and DXF export of each sheet.
- PDF of all sheets with title blocks and a table of contents.
- Reports as PDF, CSV, and XLSX: parts list, terminal plan, wire list, cable
  list, I/O cross-reference.

### P10: stability and packages

- S1 (see [the work items](#the-work-items)).
- Release candidates `1.0.0-rc.N` before 1.0.0.
- Packages: a Homebrew cask in `Stiven-Gjekaj/homebrew-tap`, a Scoop
  manifest in `Stiven-Gjekaj/scoop-bucket`, and a winget manifest.

### P11: engineering exchange

Each item needs a decision before work starts.

- AutomationML (IEC 62714) import and export. This standard holds the plant,
  the devices, and the PLC links in one file.
- FMU import (FMI 2.0 and 3.0), for plant models from Modelica tools such as
  OpenModelica.
- Candidates that touch vendor formats: Rockwell L5X and Siemens SimaticML.
  These are formats and not protocols, but they map vendor instructions.

---

## Formats

| Format | Import | Export | Phase |
|--------|--------|--------|-------|
| QElectroTech element (`.elmt`) | yes | no | P2 |
| SVG and PNG, one sheet | no | yes | P3 |
| PDF, all sheets | no | yes | P3, title blocks in P9 |
| I/O list (CSV, XLSX) | yes | yes | P4 |
| PLCopen XML (TC6) | yes | yes | P7 |
| OpenPLC Editor v3 project | yes | no | P7 |
| Structured Text (`.st`), one POU | yes | yes | P7 |
| QElectroTech project (`.qet`) | yes | yes | P9 |
| DXF | yes, as a drawing | yes | P9 |
| Reports (PDF, CSV, XLSX) | no | yes | P9 |
| AutomationML (`.aml`) | yes | yes | P11 |
| FMU (FMI 2.0, 3.0) | yes | no | P11 |
| DWG | no | no | out of scope |

---

## Platforms

Builds start in P1. Each release holds all six.

| Operating system | Architectures | Files |
|------------------|---------------|-------|
| macOS 12 and later | arm64, x64 | `.dmg`, `.zip` |
| Windows 10 and 11 | x64, arm64 | `.exe` installer |
| Linux (glibc 2.31 and later) | x64, arm64 | `.AppImage`, `.deb` |

- Each release has `SHA256SUMS` and an attestation of build provenance for
  each file.
- The builds carry no code signing certificate yet. macOS shows a Gatekeeper
  warning, and Windows shows a SmartScreen warning.
  [docs/releasing.md](releasing.md) says how to pass them.
- Homebrew, Scoop, and winget follow in P10.

---

## The work items

**I1: integration in P4**

- Signal table, PLC I/O card, link from a signal to a global variable.
- Rename in both directions, with undo, through a parser and not a text
  search.
- Wire check: compare the hand links with the wires. Report each difference.
- Cross-references: a contact in a rung shows the sheet and position of its
  device (for example `-S1 /3.4`). A device lists the rungs that use it. A
  click jumps between the two.
- Polarity check: warn when a normally closed contact in the field and the
  contact type in the program do not agree.
- Create from either side: draw a PLC I/O card from the signal table, or
  create the variable list from the schematic.
- Where-used list for each signal.

**I2: integration in P5**

- Live state on symbols: lamps, coils, contacts.
- Live analog values on the schematic.
- Force a signal from the schematic.

**I3: integration in P6**

- The plant connects to devices in the schematic, not to bare addresses.
- Fault injection: a broken wire, a stuck sensor, a tripped overload.

**I4: integration in P7**

- PLCopen XML export with the signal comments.

**F1: upstream fixes in P1 (course critical)**

The numbers in F1, F2, F3, Q1, and Q3 are upstream issues. Each one has an
issue in this repository that names the upstream number.

- #1172: a library that you remove stays in `project.json`, and the compiler still asks for it.
- #1202: the ladder editor cannot make nested parallel branches.
- #1232: local constants are not in the auto-completion list.
- #553: rising or falling edge on a negated contact.
- #1189: the serial port stays busy after the debugger disconnects.
- #1188: the CLI debug daemon fails on Windows with "Malformed daemon config".

**F2: upstream fixes in P5 (simulation and debug)**

- #585: an array is not green in the debugger.
- #536: online view of the program.
- #557: step through the program.

**F3: upstream fixes in P8 (language)**

- #1264: `EXTENDS` on a project function block is lost when compiling.
- #1265: a `METHOD` with its own `VAR` block breaks the POU parser.
- #1266: the editor refuses `FUNCTION_BLOCK ABSTRACT` and `INTERFACE`.
- #1171: print and export drop characters outside the Latin set (for
  example the degree sign in `℃`).
- #1107: a C function block fails to compile with an installed library.
- #1131: many instances of one Python function block are not independent.
- #326: each window creates a new POU service.
- #946: `npm audit` fails.

**Q1: quality of life in P1**

- #443: autosave, default 10 minutes.
- #496: keyboard shortcuts.
- A course mode that hides cloud, Modbus, EtherCAT, OPC UA, and board
  features.

**Q2: quality of life in P3**

- Grid snap, copy and paste, multi-select, align, zoom to fit.
- Automatic wire numbers and device designations.
- Find a device by name.

**Q3: quality of life in P8**

- #576: auto-completion of function block parameters.
- #539: auto-connect in FBD.
- #552: delete unused variables, functions, and function blocks.
- #1184: a dialog for initial values of function block and struct
  variables.
- #620: filter for basic data types in the FBD view.
- #450: a comments column in the UDT structure editor.
- #245: example projects on the start screen.

**S1: stability in P10**

- Read each of the 9028 elements in a test.
- Save and load round-trip tests for each file in the `ioloom/` folder.
- Round-trip tests for each format that IOloom imports and exports.
- Performance test with a schematic of 50 sheets.
- A fault review of all open issues in this repository.

---

## Rules for upstream fixes

- Fix the fault in IOloom first. Add a test.
- Each fix is a separate commit, so it can go to upstream as a pull request.
- A pull request to upstream needs the Autonomy CLA. The human decides for
  each pull request.
- Before work on an issue, check that upstream did not fix it in a newer
  release tag.
- Do not do the work in an issue that upstream marks for a person who helps
  for the first time.

## Upstream releases

- IOloom merges a new upstream release tag, not the upstream `main` branch.
- The merge goes into the next minor release of IOloom.
- An upstream security fix gets a patch release of IOloom at once.
- Each release note names the upstream tag that it holds.

---

## Open questions for the human

1. Must the sample projects follow the exercises of your course? If yes, send
   one exercise for P6.
2. Code signing costs money: an Apple Developer ID is 99 USD each year, and a
   Windows certificate costs more. Do the releases stay unsigned?
