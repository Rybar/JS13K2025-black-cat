# RetroBuffer Milestone 05: Audio Toolchain

## Purpose

Milestone 05 adds a usable music workflow to RetroBuffer. The goal is a compact tracker-plus-synth loop that serves game development directly instead of drifting into DAW ambitions.

## Goals

- Refresh the audio runtime around stable playback primitives.
- Deliver a synth MVP suitable for game instruments and sound design.
- Deliver a tracker MVP suitable for song authoring.
- Bind tracker data, synth patches, and runtime playback into one coherent model.

## Deliverables

- Audio runtime API cleanup where needed.
- Versioned synth patch format.
- Versioned tracker/song format.
- Synth editor MVP.
- Music tracker MVP.
- Runtime playback path for authored songs and patches.
- At least one audio-focused smoke-test scene or game.

## Recommended Scope

### Synth First, But Only Slightly

The synth and tracker should be planned together, but implementation can begin by locking the smallest useful patch model so tracker instruments have a stable target.

### Tracker Model

Start with:
- Small fixed channel count.
- Pattern grid.
- Song order.
- Basic note, instrument, and volume data.
- Minimal effect command vocabulary.

### Runtime Integration

- Do not interpret raw editor state every frame.
- Compile tracker data into a runtime playback structure.
- Keep preview playback and in-game playback as close to identical as possible.

## Smoke-Test Expectations

- A short authored song plays in the runtime.
- Instrument previews inside the tool sound materially the same as in-game playback.
- At least one game or dedicated audio smoke-test screen validates playback timing and asset loading.

## Exit Criteria

- Audio assets are part of the project model.
- Tracker and synth data formats are stable enough to iterate on without immediate rewrites.
- Runtime playback is good enough for games, not only for the editor.

## Risks

- Turning the tracker into a feature sink too early.
- Letting the synth UI outgrow the actual patch model.
- Failing to align tool preview playback with runtime playback.

## Out Of Scope

- DAW-style recording workflows.
- Advanced modulation matrices.
- Large effect-command vocabularies.
- Audio plugin architectures.
