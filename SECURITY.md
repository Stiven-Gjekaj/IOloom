<div align="center">
  <a href="README.md"><b>IOloom</b></a>
</div>

# Security Policy

## Supported versions

Fixes go to the latest minor release, as a patch release.
Older minor releases are not maintained.
[docs/releasing.md](docs/releasing.md) gives the rules.

## Reporting a vulnerability

Report security problems privately, and not through a public issue.

- Preferred: open a private security advisory with the "Report a vulnerability"
  button on the Security tab of this repository.
- Alternative: email the maintainer at stivenagostingjekaj@gmail.com.

Include the steps to reproduce, the affected version, and the impact as you
understand it.
You can expect a first answer within a few days.

## The threat model

IOloom opens files that other people make: projects, symbols, and imported
files such as PLCopen XML, `.qet`, and DXF.

- A file that makes IOloom run code, read a file outside the project, or
  write a file outside the project is a vulnerability.
- A file that makes IOloom stop or hang is a bug. Report it as a normal issue.
- IOloom does not connect to a real PLC. A report about a PLC protocol is out
  of scope.

A fault that comes from OpenPLC Editor also goes to upstream. Say if you
reported it there.
