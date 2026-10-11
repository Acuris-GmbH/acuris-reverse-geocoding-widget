# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-10-11

### Changed

- Attribution link text is now "Powered by Acuris Geo" (links to https://www.acuris-geo.com/). `attribution: false` still removes it.

## [0.1.0] - 2026-10-11

### Added

- `AcurisReverseGeocoding.mount()` with latitude/longitude/radius inputs and an optional country selector.
- Nearest addresses with distance, precision label and coordinates; flat and list answer shapes.
- "Use my location" on user click, 501 `reverse_not_available` message, events and proxy support.
