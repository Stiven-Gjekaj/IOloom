<div align="center">
  <a href="README.md"><b>IOloom</b></a>
</div>

# Contributing to IOloom

Thanks for your interest in IOloom, a tool for electrical schematics and PLC
programs in one project.
Contributions of all kinds are welcome: bug reports, documentation fixes,
symbols, example projects, and arguments against a decision that is already
made.

The toolchain is Node.js 22 and npm.

    npm ci --ignore-scripts && npm run setup:strucpp
    npx tsc --noEmit
    npx prettier --check "./src/**/*.{ts,tsx}"
    npx eslint "./src/**/*.{ts,tsx}"
    npx jest --config jest.config.json --ci

Those commands are the gate, and they run on Windows, on macOS, and on Linux.

## Ways to contribute

- Report a schematic, a program, or a file that IOloom handles badly.
- Add an import or an export for a format in [the roadmap](docs/roadmap.md).
- Add a plant model or an example exercise.
- Improve the documentation.
- Take on a phase from [docs/roadmap.md](docs/roadmap.md), or argue that the
  order is wrong, with the reason.

Before you start significant work, open an issue to agree on the approach.
This costs you one message and can save you a rewritten pull request.

## Where new code goes

IOloom is a fork of OpenPLC Editor. New code goes under `src/ioloom/`.
A change to an upstream file goes through one of the seams that
[docs/architecture.md](docs/architecture.md) lists. Each extra change to an
upstream file makes the next merge of upstream harder.

A fix to an upstream fault is one commit with its test, so that it can go to
upstream as a pull request.

## The rules of the commits

[AGENTS.md](AGENTS.md) holds the rules. In short:

- Each commit does one thing. The code and its tests go in the same commit.
- The documentation goes in a separate commit.
- The subject is in the present tense, and it holds no version number.
- All text uses ASD-STE100 Simplified Technical English, with no em-dash and
  no emoji.

## The licence

IOloom is GPL-3.0. A contribution is under the same licence.
