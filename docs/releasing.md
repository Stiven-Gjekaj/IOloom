<div align="center">
  <a href="../README.md"><b>IOloom</b></a>
</div>

# Releases

A release is a decision that a person makes. The workflow does the rest, and
it does nothing until a tag tells it to.

## The version

The version is semantic: `MAJOR.MINOR.PATCH`.

- **PATCH** is a fix. A patch release can come at any time, as often as a
  fault needs it. It adds no feature, and it does not change the project
  format.
- **MINOR** is a phase of [the roadmap](roadmap.md), or the merge of a new
  upstream release. A minor release can add to the project format, and it
  still opens each older project.
- **MAJOR** changes the project format so that an older IOloom cannot open the
  new files, or removes a feature. 1.0.0 is the first stable release.
- Before 1.0.0, a minor release can still change the project format. Its
  release note says so, and IOloom converts the older files when it opens
  them.
- The tag is `v` and the version, such as `v0.3.2`.
- A release candidate has the suffix `-rc.N`, such as `v1.0.0-rc.1`. Each
  major release has at least one.

Why not a date version: the project format matters more than the date. A
reader must see from the version if a file opens in an older IOloom. Semantic
versions also give an unlimited count of patches to each minor release.

## The codename

Each minor release takes the next codename of the list. A patch release keeps
the codename of its minor release. The theme is the parts of a control
cabinet.

Ampere, Busbar, Contactor, Diode, Encoder, Fuse, Galvanometer, Hysteresis,
Interlock, Jumper, Kelvin, Latch, Megger, Neutral, Ohm, Potentiometer,
Quadrature, Relay, Solenoid, Terminal, Uptime, Varistor, Watt, Xenon, Yoke,
Zener.

The release title is the version and the codename, such as
`0.3.0 "Contactor"`.

## Hotfixes

A hotfix is a patch release. Hotfixes are frequent, so the steps are short.

1. Fix the fault on `main`, with a test, in one commit.
2. If `main` holds no unreleased feature, release a patch from `main`.
3. If `main` holds an unreleased feature, make the branch `release/X.Y` from
   the last tag of that minor release, if it does not exist. Cherry-pick the
   fix onto it, and tag the patch on that branch.
4. Keep each `release/X.Y` branch until the next minor release. Then delete
   it. Only the latest minor release gets fixes.

## Each release note

Each release note has these parts:

- One line that says what IOloom is.
- **What changed**: New, Fixed, and Removed.
- **Upstream**: the OpenPLC Editor tag that the release holds.
- **Install**: the files for each operating system, and how to check them.
- **What was tested**: the hosts and the exit test of the phase.
- **Known limits**.

## Cut a release

1. Set the version in `package.json` and `release/app/package.json`. Commit
   that change alone: `chore: set the version of the next release`.
2. Move the "Unreleased" part of `CHANGELOG.md` under the new version, with
   the date and the codename. Commit it.
3. Push, and wait for CI to pass on that commit.
4. Tag the commit and push the tag:

       git tag v0.1.0
       git push origin v0.1.0

5. The release workflow builds the files for the six targets, writes
   `SHA256SUMS`, makes an attestation of build provenance for each file, and
   opens a **draft** release. It stops if the tag does not match the version
   in `package.json`.
6. Read the draft and the list of files. Publish it.

A run of the release workflow by hand builds and hashes everything, and
publishes nothing. Use it to test the workflow.

## Check a download

Each release has `SHA256SUMS`:

    shasum -a 256 -c SHA256SUMS --ignore-missing

Check the build provenance of a file:

    gh attestation verify <file> --repo Stiven-Gjekaj/IOloom

## Pass the warnings of an unsigned build

The builds carry no code signing certificate.

- macOS: open the app one time with a right-click and **Open**, or run
  `xattr -dr com.apple.quarantine /Applications/IOloom.app`.
- Windows: on the SmartScreen window, click **More info**, then **Run
  anyway**.
