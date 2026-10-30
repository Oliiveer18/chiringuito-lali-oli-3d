Original prompt: Sí, empieza las correcciones en una rama nueva de mi copia 3D.

# Service integrity work

- Branch: fix/3d-service-integrity, based on e011f02.
- Preserve main and experiment/vfx-clientes-3d; no production deployment.
- First package: canonical prepared units, one stock debit, delivery without legacy re-preparation,
  payment-time quality tips, simulation-time stations, cancellation and day reset.
- Include regression coverage and browser QA. Full co-op movement and product-selection redesign
  remain outside this package.

## Implemented

- Added pure serializable service-3d-model.mjs and authoritative command adapter.
- Replaced visual tray state as source of truth; removed preparation-time money and slot acceleration.
- Integrated stock-backed prepared delivery, deferred quality tips and idempotent payment.
- Moved station time into simulation; froze movement and cleaning mutation while paused.
- Fixed contextual identity, coordinates, pointer cancellation, repeated cleaning and selective washing.
- Snapshots include station/tray ownership and deduplicate guest command sequences per service.
- Added 19 pure regression tests and a real-input browser regression runner.
- Added an optional in-memory preview build for Computer. Production saves remain unchanged.

## Validation notes

- npm test passed, including the 19 new model tests.
- Additional management, market, service-v24, tab-persist and v25 suites passed.
- Final browser run passed all 10 integration flows with zero page errors: actual preparation,
  mixed delivery/payment, pause, cancellation, opposite movement, speed changes, target changes,
  washing, host/snapshot checks, day reset, responsive resize and report.
- Inspected desktop 1280×720, portrait 390×844, landscape 844×390 and report screenshots.
- Required reference Playwright game client completed; screenshot and text-state capture inspected.
- Hosted preview boot, new game, planning, service and pause verified in a fresh cloud browser.
- DPR 2 overlay diagnostic observed a 2× transform for a CSS-coordinate fixture on a 780px canvas
  displayed at 390px, matching the required scaling.
- Existing camera-beta.test.mjs failure belongs to the baseline and remains documented.

## Cooperative 3D extension, v28.16.4

- Reproduced the public room-code mismatch: PeerJS received its id as an ignored option.
- Corrected the constructor and joined an actual WebRTC channel from an isolated guest profile.
- Added shared player identities, authoritative movement validation, interpolation and proximity checks.
- Transmit customer arrival direction and flush guest movement before station/delivery actions.
- Pause on disconnect, keep one handler binding per recovery Link and restore outgoing connection on reopen.
- Added seven pure movement tests; all 26 service/movement cases pass through npm test.
- Added an internet-dependent two-profile online browser suite with real channel interruption.
- Source main-flow browser suite: all ten checks green, no page errors.
- Local and hosted online suites: all nine flows green, no page errors, including post-recovery guest commands.
- Hosted check also confirms the guest's day/money HUD is populated.
- Additional sandbox-host to independent cloud-browser guest test could not establish the channel.
- Relay-only diagnostic produced no relay candidates; TURN lookup/connect/allocation errors observed.
- Do not mark cross-network online as complete: configure a working TURN relay and repeat that test.
- Corrected the socket-error fallback which previously retried the same cloud index.

## No-account encrypted web transport, v28.17.0

- User declined Cloudflare and requested no further accounts, keys or questions.
- Tested the documented public EMQX WSS endpoint from both sandbox and cloud.
- Replaced direct RTC with a minimal MQTT-over-WSS Peer-compatible transport.
- Added 130-bit random room secrets, AES-GCM, domain-separated topic hashes,
  destination authentication, bounded queues, compression negotiation and replay rejection.
- Added encrypted MQTT last wills, heartbeat recovery and 45-second resynchronization.
- Public broker is explicitly development/testing, not production SLA; disclose this in UI/docs.
- Local two-profile suite passed all nine flows including actual socket interruption.
- Solo browser suite: ten flows passed; corrected its URL normalizer to avoid
  a double slash when TEST_URL ends with a slash.
- Published source commit fc2abe3 preserves concurrent visual commits through 1570158.
- Actual hosted cross-network play passed: sandbox host/cloud guest, two shared
  preparations, movement, guest pause/host resume, real socket interruption,
  same floor id, retained trays/money and zero recorded page errors.
- Six relay regression groups pass, including retained/replay/tamper rejection.
