<div align="center">
  <a href="../README.md"><b>IOloom</b></a>
</div>

# Architecture and data model

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
not change format. IOloom also adds `pous/interfaces/`: one `.st` file for each
INTERFACE POU (upstream issue 1266). The upstream editor does not read that
folder.

    project.json, devices/, pous/, datatypes/     upstream, unchanged
    pous/interfaces/                              INTERFACE POUs, IOloom only
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

