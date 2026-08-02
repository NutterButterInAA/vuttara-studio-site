---
version: 0.0.1
publishedAt: 2026-08-01T19:30:00Z
summary: First public release of Vuttara Studio 0.0.1 for Windows x64.
installerFileName: Vuttara-Studio-0.0.1-Setup.exe
installerUrl: https://github.com/NutterButterInAA/vuttara-studio/releases/download/v0.0.1/Vuttara-Studio-0.0.1-Setup.exe
installerSize: 180611719
installerSha256: 3878231a11ad7ec1daeacb7f9e9b95234cedb0db6626ac63f327957d73e165d3
sourceFileName: Vuttara-Studio-0.0.1-Source.zip
sourceUrl: https://github.com/NutterButterInAA/vuttara-studio/releases/download/v0.0.1/Vuttara-Studio-0.0.1-Source.zip
sourceSha256: 22454e5e31fe21b3313873864919434e7c22fed2ffbeea0a3bb9648c360fd81c
---

# Vuttara Studio 0.0.1

Vuttara Studio 0.0.1 is the first public release of the new Windows x64 application architecture.

## Highlights

- Qt 6 Widgets interface over a dedicated Vuttara engine layer.
- libobs 32.2.1 capture, audio, recording, and streaming foundation.
- Scenes and source controls with ordering, visibility, locking, folders, and persistent project state.
- Display and window capture.
- Desktop Audio and Mic/Aux device selection, volume, mute, and IEC meters.
- MKV recording with output controls and diagnostics.
- Streaming presets for Twitch, YouTube, Kick, Facebook Live, Rumble, BEAM, and Custom RTMP/RTMPS.
- Stream keys and passwords protected locally with Windows DPAPI.
- Preview selection, Ctrl-selection, marquee selection, transforms, and source drag/drop organization.
- Preview editing remains available while recording or streaming.
- Stable automatic-update checks through a dedicated Vuttara Studio feed.
- Update downloads restricted to the official GitHub release path over HTTPS, with filename, size, and SHA-256 verification.
- Separate approval before update download and installation.
- Installation blocked while streaming or recording.
- Mandatory interactive Terms acceptance and Privacy Policy acknowledgement.

## Packaging and validation

- Windows x64 Inno Setup installer.
- Qt Network and Windows Schannel TLS backend included.
- Complete controlled libobs runtime and obs-ffmpeg-mux recording helper.
- Application, updater, and packaged libobs engine self-tests passed before installer creation.
- Automated silent validation is permitted only with the dedicated `/AUTOMATEDVALIDATION=1` release-testing flag. Normal users receive the interactive legal pages.

## Known considerations

- This is the initial 0.0.1 release. Preserve backups of important projects and recordings.
- Streaming-service behavior and requirements may change independently.
- The update feed becomes active only after the 0.0.1 GitHub release and website deployment are published.
- The installer may not be code-signed; Windows may display reputation or publisher warnings until signing and reputation are established.

