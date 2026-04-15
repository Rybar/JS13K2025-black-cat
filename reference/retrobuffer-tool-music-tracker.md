# RetroBuffer Tool Plan: Music Tracker

## Role In The Framework

The music tracker is the sequencing surface for RetroBuffer audio. Its job is to turn synth patches and note data into authored songs that preview reliably in the tool and play reliably in runtime.

## Product Goal

Deliver a compact, readable tracker that is strong enough for real game music without expanding into a full DAW workflow.

## Core Model

The tracker should center on:
- Patterns.
- Song order.
- Small fixed channel count.
- Note data.
- Instrument assignment.
- Volume.
- Minimal effect commands at first.

Tracker data should compile into a runtime playback structure rather than being interpreted directly from raw editor state during game execution.

## MVP

- Pattern editor grid.
- Song order editor.
- Transport controls.
- Looping.
- Channel mute/solo if cheap.
- Instrument assignment from synth patches.
- Save/load through the project model.

## v1

- Better edit ergonomics.
- More effect commands.
- Clearer navigation and selection behaviors.
- Better row, pattern, and song-level editing tools.
- Improved transport and preview polish.

## Later

- Richer automation.
- Cross-song pattern management.
- Broader effect vocabulary.
- More advanced editing assists.

## Recommended Host Surface

- Implement as a VS Code custom editor or dedicated webview-backed document surface, depending on how song files are modeled.
- Keep file I/O, commands, and workspace integration in the extension host.
- Keep transport, sequencing UI, and audio preview inside the webview using Web Audio.

## Integration Requirements

- Uses the shared synth patch model as the instrument source.
- Saves through the shared project model.
- Previews through the same playback path or a near-identical one used by runtime.
- Feeds at least one smoke-test game or audio validation scene.

## UI Requirements

- Dense but legible tracker grid.
- Transport and tempo controls.
- Pattern list and song order area.
- Instrument selection.
- Keyboard-heavy editing flow.

## Risks

- Turning the tracker into a feature sink before the playback model is stable.
- Letting preview playback drift away from runtime playback.
- Building too much audio UI before patch and song formats are versioned.

## Recommended Smoke Tests

- Author a short song and play it in runtime.
- Compare tool preview timing and in-game timing.
- Validate instrument assignment and patch lookup after save/reload.
