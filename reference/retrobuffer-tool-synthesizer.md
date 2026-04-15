# RetroBuffer Tool Plan: Synthesizer

## Role In The Framework

The synthesizer defines RetroBuffer's instrument model. It should be compact, game-oriented, and tightly coupled to tracker needs rather than aspiring to be a broad modular audio environment.

## Product Goal

Provide a small patch-design surface that supports expressive game audio while staying simple enough to serialize, preview, and reuse reliably.

## Recommended Patch Model

Start with:
- Oscillator basics.
- Noise source.
- ADSR envelope.
- Simple filter.
- A small set of modulation or shaping options only if they are clearly valuable.

Patch structure should prioritize deterministic playback, simple serialization, and clear mapping into tracker instruments.

## MVP

- Patch save/load.
- Live preview.
- Basic oscillator and noise settings.
- ADSR editing.
- Simple filter controls.
- Tracker instrument binding.

## v1

- More waveform choices.
- Limited useful modulation.
- Better visualization of envelope and filter state.
- A small effect chain only if it does not destabilize playback or serialization.

## Later

- Macro controls.
- Richer modulation routing.
- More sophisticated effect processing.

## Recommended Host Surface

- Implement as a VS Code webview-backed asset editor, either as a custom editor or as a dedicated tool view if patch workflows demand a narrower surface.
- Keep file I/O, commands, and workspace integration in the extension host.
- Keep live audition, parameter editing, and waveform or envelope visualization inside the webview using Web Audio.

## Integration Requirements

- Patch files are versioned assets in the shared project model.
- Tracker instruments reference synth patches explicitly.
- Tool preview audio and runtime playback use the same voice model wherever practical.
- At least one smoke-test game or dedicated audio scene exercises authored patches.

## UI Requirements

- Fast audition workflow.
- Clear envelope editing.
- Immediate parameter feedback.
- Patch browser or list integration with the shared asset system.

## Risks

- Letting the synth outgrow the tracker's real needs.
- Adding modulation complexity before patch serialization is stable.
- Treating preview audio as separate from runtime audio behavior.

## Recommended Smoke Tests

- Save a patch, reload it, and verify consistent preview playback.
- Use the patch in a tracker-authored song and verify runtime parity.
- Validate patch migration behavior once format versions change.
