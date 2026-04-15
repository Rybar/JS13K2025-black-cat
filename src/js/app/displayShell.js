export function createDisplayShell() {
  const root = document.getElementById('display-shell');
  const stage = document.getElementById('display-stage');
  const fullscreenToggle = document.getElementById('fullscreen-toggle');

  if (!root || !stage || !fullscreenToggle) {
    throw new Error('Display shell markup is missing required elements.');
  }

  let handleFullscreenChange = () => {};

  function isFullscreen() {
    return document.fullscreenElement === root;
  }

  function syncFullscreenState() {
    const fullscreen = isFullscreen();
    document.body.classList.toggle('fullscreen-active', fullscreen);
    root.classList.toggle('is-fullscreen', fullscreen);
    fullscreenToggle.textContent = fullscreen ? 'Exit Full Screen' : 'Full Screen';
    fullscreenToggle.setAttribute('aria-pressed', fullscreen ? 'true' : 'false');
    handleFullscreenChange(fullscreen);
  }

  async function toggleFullscreen() {
    if (isFullscreen()) {
      await document.exitFullscreen();
      return;
    }

    await root.requestFullscreen();
  }

  function handleEscape(event) {
    if (event.key !== 'Escape' || !isFullscreen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void document.exitFullscreen();
  }

  fullscreenToggle.addEventListener('click', () => {
    void toggleFullscreen().catch((error) => {
      console.error(error);
    });
  });
  document.addEventListener('fullscreenchange', syncFullscreenState);
  globalThis.addEventListener('keydown', handleEscape, true);
  syncFullscreenState();

  return {
    root,
    stage,
    fullscreenToggle,
    isFullscreen,
    mount(node) {
      stage.replaceChildren(node);
    },
    clear() {
      stage.replaceChildren();
    },
    setFullscreenChangeHandler(handler) {
      handleFullscreenChange = handler ?? (() => {});
      syncFullscreenState();
    },
  };
}