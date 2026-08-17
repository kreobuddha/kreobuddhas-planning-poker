# Changelog

Notable changes to Planning Poker. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — read for an
application rather than a library: the major number moves when the way people use the app changes,
not when an API does, because there is no public API here.

## [Unreleased]

## [0.1.0] — 2026-08-17

The first tagged version. Everything below already worked; what is new is that there is now a
version number to point at, and a deployed site to point people at.

### Added

- **A public demo**, deployed to Firebase Hosting from `master` by `.github/workflows/deploy.yml`.
  It runs against its own Firebase project, so demo traffic never lands in the database used for
  development.
- **Tagged releases.** `.github/workflows/release.yml` is started by hand with the version it is
  cutting, checks that `package.json` agrees, reads the notes out of this file, then tags the
  commit and publishes the GitHub release. Nothing is sent to a registry: this app is not a
  package.
- `format:check`, the read-only half of `format`. The repository was reformatted once so that it
  passes, and both workflows now run it, so formatting cannot drift again.

### The app as it stands at `0.1.0`

- create a session, share the code or the room link, and estimate together in person-days;
- three card decks, chosen by the admin and changeable between rounds;
- votes stay hidden until the admin reveals them, then everyone sees the cards and the average;
- picking the card you already hold clears your vote;
- realtime through Firestore listeners, with anonymous authentication;
- Firestore security rules, with their own test suite against the emulator;
- the interface built on [`@kreobuddha/ui`](https://github.com/kreobuddha/kreobuddha-ui).
