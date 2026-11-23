<div align="center">
  <a href="../README.md"><b>IOloom</b></a>
</div>

# Research

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
    pous/interfaces/              interfaces (IOloom only, not upstream)
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

