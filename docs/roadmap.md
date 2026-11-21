<div align="center">
  <a href="../README.md"><b>IOloom</b></a>
</div>

# Roadmap

## 5. Roadmap

The roadmap has four tracks:

- Integration (I): close each gap between the schematic and the program.
- Upstream fixes (F): fix the open OpenPLC Editor faults that affect
  IOloom work. Source: the 35 open issues on 2026-11-21. Issues about
  hardware, vendor protocols, and boards are out of scope.
- Quality of life (Q): features that make daily work faster.
- Stability (S): tests, fault fixes, and performance.

The times are for part-time work by one student. They are estimates. Each
time includes 20 percent for faults found in that milestone.

### 5.1 Milestones

| Milestone | Content | Done when | Time | Total |
|-----------|---------|-----------|------|-------|
| M0: spikes | Merge OpenPLC Editor v4.3.5. Build on Apple Silicon. Run a sample in the simulator. Test the WebAssembly path. Read all 9028 `.elmt` files and draw them as SVG. | Each spike has a written result. We choose the simulation path. | 2 weeks | 2 |
| M1: course base | F1 and Q1 (see 5.2). Work offline. Hide the features that are out of scope. | A student can write and simulate an LD program with no network. | 2 weeks | 4 |
| M2: symbols | `.elmt` reader, symbol model, SVG renderer, library browser with search. | You can find and preview any element. | 3 weeks | 7 |
| M3: schematic | Q2 (see 5.2). Sheets, symbols, orthogonal wires, designations, title block, save and load, undo and redo. | You can draw a motor start circuit and open it again. | 6 weeks | 13 |
| M4: signals and links | I1 (see 5.2). Signal table, PLC I/O card, link to variables, rename in both directions, wire check, cross-references, polarity check. | A rename in the schematic changes the LD program. A contact in a rung jumps to its device. | 6 weeks | 19 |
| M5: live schematic | I2 and F2 (see 5.2). The simulation drives the schematic. Analog values. Force from the schematic. Online view. Step mode. | A start-stop circuit runs in the schematic. | 4 weeks | 23 |
| M6: plant and faults | I3 (see 5.2). Tank and conveyor models wired to devices. Fault injection. Course exercises. Example projects on the start screen. | A tank fill exercise runs with no hardware, and a broken wire shows in the program. | 5 weeks | 28 |
| M7: language fixes | F3 and Q3 (see 5.2). | Each listed issue has a test that passes. | 3 weeks | 31 |
| M8: export and reports | I4 (see 5.2). PDF, terminal and wire reports, I/O cross-reference report, PLCopen XML, export of single elements. | A PLCopen file opens in a CODESYS-based tool. | 4 weeks | 35 |
| M9: stability | S1 (see 5.2). | No known fault of high severity is open. | 4 weeks | 39 |
| M10: more | DXF export. Read-only `.qet` import. Windows and Linux builds. | | open | |

M5 is the first point where IOloom is useful in class, at about week 23.

### 5.2 Work items

I1: integration in M4

- Signal table, PLC I/O card, link from a signal to a global variable.
- Rename in both directions, with undo, through a parser and not a text
  search.
- Wire check: compare the hand links with the wires. Report each difference.
- Cross-references: a contact in a rung shows the sheet and position of its
  device (for example `-S1 /3.4`). A device lists the rungs that use it.
  A click jumps between the two.
- Polarity check: warn when a normally closed contact in the field and the
  contact type in the program do not agree.
- Create from either side: draw a PLC I/O card from the signal table, or
  create the variable list from the schematic.
- Where-used list for each signal.

I2: integration in M5

- Live state on symbols: lamps, coils, contacts.
- Live analog values on the schematic.
- Force a signal from the schematic.

I3: integration in M6

- The plant connects to devices in the schematic, not to bare addresses.
- Fault injection: a broken wire, a stuck sensor, a tripped overload.

I4: integration in M8

- I/O cross-reference report: address, device, sheet position, and each use
  in the program.
- PLCopen XML export with the signal comments.

F1: upstream fixes in M1 (course critical)

- #1172: the compiler requires a remote library. IOloom must work offline.
- #1202: the ladder editor cannot make nested parallel branches.
- #1232: local constants are not in the auto-completion list.
- #553: rising or falling edge on a negated contact.

F2: upstream fixes in M5 (simulation and debug)

- #585: an array is not green in the debugger.
- #536: online view of the program.
- #557: step through the program.

F3: upstream fixes in M7 (language)

- #1264: `EXTENDS` on a project function block is lost when compiling.
- #1265: a `METHOD` with its own `VAR` block breaks the POU parser.
- #1266: the editor refuses `FUNCTION_BLOCK ABSTRACT` and `INTERFACE`.
- #1171: print and export drop characters outside the Latin set (for
  example the degree sign in `℃`).
- #1107: a C function block fails to compile with an installed library.
- #1131: many instances of one Python function block are not independent.
- #326: each window creates a new POU service.
- #946: `npm audit` fails.

Q1: quality of life in M1

- #443: autosave, default 10 minutes.
- #496: keyboard shortcuts.
- A course mode that hides cloud, Modbus, EtherCAT, OPC UA, and board
  features.

Q2: quality of life in M3

- Grid snap, copy and paste, multi-select, align, zoom to fit.
- Automatic wire numbers and device designations.
- Find a device by name.

Q3: quality of life in M7

- #576: auto-completion of function block parameters.
- #539: auto-connect in FBD.
- #552: delete unused variables, functions, and function blocks.
- #1184: a dialog for initial values of function block and struct
  variables.
- #620: filter for basic data types in the FBD view.
- #450: a comments column in the UDT structure editor.
- #648: export single POUs, functions, function blocks, and UDTs.
- #245: example projects on the start screen.

S1: stability in M9

- Read each of the 9028 elements in a test. Each element must load or give
  a clear error.
- Save and load round-trip tests for each file in the `ioloom/` folder.
- Performance test with a schematic of 50 sheets.
- A fault review of all open issues in this repository.

### 5.3 Rules for upstream fixes

- Fix the fault in IOloom first. Add a test.
- Each fix is a separate commit, so it can go to upstream as a pull request.
- A pull request to upstream needs the Autonomy CLA. The human decides for
  each pull request.
- Before work on an issue, check that upstream did not fix it in a newer
  release tag.
- Do not do the work in an issue that upstream marks for a person who helps
  for the first time.

## 6. Open questions for the human

1. Do you accept the fork at a release tag (v4.3.5) and merges only at new
   release tags?
2. Do you accept manual signal links first and a wire check later?
3. Must sample projects follow the exercises of your course? If yes, send one
   exercise for M5.
