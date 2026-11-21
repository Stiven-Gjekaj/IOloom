# IOloom: research, architecture, and plan

Status: proposal. The human did not approve it yet.
Research date: 2026-11-21.

## 1. Research results

### 1.1 OpenPLC Editor v4

Source: `github.com/Autonomy-Logic/openplc-editor`, branch `main`.

| Item | Result |
|------|--------|
| License | GPL-3.0. Contributions to upstream need a CLA to Autonomy Logic Inc. The CLA lets Autonomy relicense a contribution. |
| Activity | Very high. Pushes each day. Releases each one or two weeks (v4.3.3 to v4.3.5 in October and November 2026). 57 open issues. |
| Size | About 2700 files. Electron, React, TypeScript, Node 22, Jest, Playwright. |
| Process | Autonomy runs it as a product: Jira, a CLA, AI review bots, and cloud features (Edge account, cloud projects, AI). |
| Shared code | `src/frontend`, `src/middleware/shared`, and `src/backend/shared` are byte-identical with a second product, `openplc-web`. |
| Main libraries | `@xyflow/react` (graph canvas for LD and FBD), `zustand` (state), `monaco-editor`, `fast-xml-parser`, `xmlbuilder2`, `pdf-lib`, `avr8js`. |
| Platforms | Signed and notarized builds for macOS, Windows, and Linux, x64 and ARM64. |

Project storage. A project is a folder:

    project.json                  project data (PLCProjectSchema)
    devices/configuration.json    target device
    devices/pin-mapping.json      pins to IEC addresses
    pous/programs/                programs
    pous/function-blocks/         function blocks
    pous/functions/               functions
    datatypes/                    user data types
    build/                        build output

Compilation. The editor generates XML from the project, `xml2st` converts it
to ST, and STruC++ compiles the ST to C++. The graphical languages (LD, FBD,
SFC) go through this XML to ST step. MatIEC is no longer in the editor.

Simulation. The built-in simulator is not a soft PLC. It is an emulated
Arduino Mega (ATmega2560) in `avr8js`. The editor compiles the C++ for AVR
with `arduino-cli`, then runs the firmware in the emulator. The I/O uses the
Mega pin map (`resources/sources/hal/simulator.cpp`). The emulated board has
256 KB flash and about 8 KB RAM.

A second path exists in the code: `src/backend/shared/wasm-toolchain` compiles
STruC++ output to WebAssembly with clang in WebAssembly (`@yowasp/clang`).
I did not verify if the simulator uses this path yet.

Address registry. The document `docs/iec-address-registry.md` describes a
central IEC address registry ("approved design, in implementation"). It has
consumers, channels with a stable `channelId`, address classes, and aliases
that are unique in the project. An alias attaches to the channel, not to the
address. This is almost the shared signal model that IOloom needs.

### 1.2 QElectroTech

Source: `github.com/qelectrotech/qelectrotech-source-mirror`, and the
`qelectrotech-elements` repository (a git submodule).

| Item | Result |
|------|--------|
| Code license | The `LICENSE` file is the GPLv2 text. The source headers say "version 2 of the License, or (at your option) any later version". So the code is GPL-2.0-or-later. You can use it under GPLv3. Both reports that you saw are partly correct. |
| Element license | Different from the code. `ELEMENTS.LICENSE`: use in a diagram is free with no condition. Redistribution of the collection outside a diagram must follow CC-BY 3.0. It also forbids the use of the files as sample data to train machine learning models. |
| Activity | Active. Pushes each day in November 2026. |
| Element count | 9028 `.elmt` files. 776 match "plc" or "automat" in the path. |

Element format (`.elmt`). An XML file with a `<definition>` root. It has
names in many languages, a `<description>` with primitives (`line`, `rect`,
`ellipse`, `arc`, `polygon`, `text`, `dynamic_text`), and `<terminal>` items
with a UUID, a position, an orientation, and a type. Fonts are Qt `QFont`
strings. The terminal names are often empty. A PLC input card shows "I0.0" as
drawn text only. The element does not know that a terminal is a PLC input.

Project format (`.qet`). One XML file. It holds the diagrams, the
conductors, the title blocks, and a copy of each element definition that the
project uses.

### 1.3 Compilers and runtimes

| Project | License | State | Use for IOloom |
|---------|---------|-------|------------------|
| STruC++ (`Autonomy-Logic/STruCpp`) | GPL-3.0 | Active. TypeScript. ST to C++. Has a test runner and a REPL. | Keep. It is already the compiler of the editor. |
| RuSTy (`PLC-lang/rusty`) | LGPL-3.0 | Active. ST to native code through LLVM. | Do not use. LLVM is a large dependency. It adds no feature that we need. |
| rust-plc (bartei) | not checked | Small project. ST to bytecode VM with a scan cycle, LSP, and DAP. | Do not use. ST only. Small team. |
| IronPLC (`ironplc/ironplc`) | MIT | Active (moved from `garretfick/ironplc`). Compiler, bytecode VM, browser playground. ST only. | Fallback only, if the WebAssembly path fails. |

Recommendation: use one compiler, STruC++. A second compiler gives two sets
of language faults and no gain.

## 2. Your assumptions: what is wrong or riskier

1. "The editor has a built-in simulator." It has one, but it is an emulated
   Arduino Mega. The I/O count, the memory, and the speed are those of an
   8-bit microcontroller. A simulated plant must write to emulated pins. This
   is the largest technical risk. The WebAssembly path can remove it, but I
   did not verify that path.
2. "Keep the module separate so upstream updates merge." Upstream changes
   very fast and does large refactors (STruC++ migration, address registry).
   Its shared code also follows a second product. Merges will cost time. Use
   release tags, not `main`, and touch upstream files in few places.
3. You inherit features that are out of scope: cloud account, Modbus,
   EtherCAT, vendor packages, AI. Hide them behind a build flag. Do not delete
   them, because deletions make merges harder.
4. "Rename in either place updates both." On the program side, a name is
   text in ST and IL, and a label in LD and FBD. A rename is a refactor across
   all POUs. Upstream has `src/frontend/utils/variable-references`, which can
   help. A safe rename needs a parser, not a text search.
5. QElectroTech elements carry no PLC meaning. IOloom needs its own
   metadata on top of each element (for example "terminal 3 is a digital
   input channel").
6. Element license. If IOloom ships the element library, that is
   redistribution outside a diagram. You must give CC-BY 3.0 attribution. The
   machine learning clause is an extra limit that CC-BY 3.0 does not have. Its
   legal effect is not clear, and some Linux distributions may refuse it. Do
   not copy the elements into this repository. Load them from the submodule
   or download them at first start.
7. Full `.qet` project import is expensive. The format holds many features.
   Read `.elmt` files first. Add read-only `.qet` import late.
8. PLCopen XML export. The editor already generates an XML for `xml2st`.
   Machine Expert can import POUs from PLCopen XML, but not the hardware
   configuration. Expect some changes for each target tool.
9. Course fit. Class work in SoMachine or Machine Expert does not open in
   IOloom. IOloom is a second tool for practice, not a replacement.

## 3. Architecture

### 3.1 Principle

The fork stays close to upstream. All new code is in new folders. Upstream
files change only at a small number of "seams".

    src/ioloom/
      model/        signal list, schematic model, schemas (no React, no Electron)
      qet/          .elmt reader, later .qet reader
      schematic/    schematic editor (React, @xyflow/react or SVG)
      sim-bridge/   link from the simulation I/O image to the schematic and plant
      plant/        tank and conveyor models
      export/       PDF, DXF, reports, PLCopen
      seams/        the only code that imports upstream modules

Seams (upstream files that change):

1. Navigation: add a "Schematic" tab and a "Signals" table.
2. Address registry: IOloom registers a PLC module as a consumer with its
   channels.
3. Variables: create and rename global variables from signals.
4. Simulation: read and write the I/O image of the running program.
5. Project files: add `ioloom/` to the list of project folders.

The `model/` folder has no dependency on upstream. Tests for it run with no
Electron.

### 3.2 Simulation

Target design: STruC++ output compiled to WebAssembly, run in a worker. One
scan cycle is: copy inputs into the I/O image, run the program, copy the
outputs. The plant model steps in the same loop with the same time step. The
schematic shows the outputs (lamps, coils) and lets you click inputs (push
buttons, limit switches).

Fallback: keep the Arduino Mega emulator and map signals to emulated pins.

The milestone M0 decides between the two.

## 4. Data model

### 4.1 Files

IOloom adds one folder to the OpenPLC project folder. The upstream files do
not change format.

    project.json, devices/, pous/, datatypes/     upstream, unchanged
    ioloom/
      ioloom.json        format version, settings
      signals.json         the shared signal list
      devices.json         schematic devices (designations, properties)
      sheets/<id>.json     one file for each sheet: symbol placements, wires
      symbols/<id>.json    project copy of each symbol that the project uses
      plant/<id>.json      plant models and their links to signals

JSON with one file for each sheet gives small git diffs. Each file has a
`formatVersion`. Each entity has a UUID.

### 4.2 Entities

    Symbol        a drawing and its terminals. Comes from a .elmt file.
                  Fields: id, source (path and UUID of the .elmt), graphics,
                  terminals[{id, name, position, orientation}], ioRole?

    Device        one real item, for example -S1 (push button) or -K1 (relay).
                  Fields: id, designation, description, properties.
                  A device can have many symbols on many sheets (a coil and its
                  contacts).

    Placement     one symbol of one device on one sheet.
                  Fields: id, deviceId, symbolId, sheetId, position, rotation.

    Wire          a connection between two terminals.
                  Fields: id, from{placementId, terminalId}, to{...},
                  wireNumber, points[].

    PlcModule     a device that is a PLC I/O card. It is a consumer in the
                  address registry.
                  Fields: deviceId, channels[{channelId, terminalId,
                  class: DI|DO|AI|AO}].

    Signal        the shared tag. This is the link.
                  Fields: id (UUID, never changes), name (IEC identifier),
                  dataType (BOOL, INT, REAL), direction (I, Q), comment,
                  channel {deviceId, channelId}?, fieldDevice {deviceId}?,
                  variableRef (the global variable in the program).

### 4.3 Rules

- The link key is the signal UUID. It is never the name.
- The name of the signal and the name of the program variable are the same.
  A rename changes both in one operation, with undo.
- The IEC address (`%IX0.0`) comes from the address registry. IOloom does
  not store it as the source of truth.
- The first release links a signal to a channel by hand (in the signal
  table). A later check compares the hand links with the wires and reports
  differences.

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
