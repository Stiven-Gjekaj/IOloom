# Rungwire

Rungwire is an open-source tool for electrical schematics and PLC programs.
It puts the two in one project.

The project is in the planning stage.
It has no code yet.

## The problem

A control system has two parts.
The schematic shows the wires, the sensors, and the PLC inputs and outputs.
The PLC program reads the inputs and sets the outputs.

Most free tools do only one of these parts.
QElectroTech draws schematics.
OpenPLC Editor writes and simulates PLC programs.
No free tool links the two.

## The idea

Rungwire keeps one shared list of signals.
A signal is one PLC input or output, for example a sensor or a lamp.

- A sensor that you wire to a PLC input in the schematic becomes a variable
  in the PLC program.
- When you rename a signal in one place, the name changes in the other place.
- When the simulation runs, the schematic shows the state of each signal.

## Scope

Rungwire is for design and simulation on a laptop.
It does not connect to a real PLC.

In scope:

- Electrical schematics with the IEC symbol library of QElectroTech.
- PLC programs in the IEC 61131-3 languages: LD, FBD, ST, IL, and SFC.
- A shared signal list that links the schematic and the program.
- Simulation of the program, and later a simulated plant such as a tank or
  a conveyor.
- Later: PLCopen XML export, PDF and DXF export, terminal and wire reports.

Out of scope:

- Real PLC hardware and the download of programs to a device.
- Vendor protocols and the configuration of vendor modules.
- Drives and motion control.
- DWG files, manufacturer catalogs, and cabinet layout.

## Platform

The first target is macOS on Apple Silicon.
Windows and Linux follow.

## Foundation

Rungwire is a fork of
[OpenPLC Editor](https://github.com/Autonomy-Logic/openplc-editor)
version 4 (GPL-3.0).
It reads the element files of
[QElectroTech](https://qelectrotech.org) (element license: CC-BY 3.0).

## Documents

- [docs/proposal.md](docs/proposal.md): research, architecture, data model,
  and milestones.
- [AGENTS.md](AGENTS.md): rules for the work in this repository.

## License

GPL-3.0. See [LICENSE](LICENSE).
