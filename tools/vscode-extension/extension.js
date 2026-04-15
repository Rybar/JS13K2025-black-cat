const path = require('path');
const vscode = require('vscode');

const SPRITE_FILE_GLOB = '**/*.rbsprite.json';
const DEFAULT_SPRITE_SIZE = 8;

function activate(context) {
  const assetTree = new RetroBufferAssetProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('retrobufferAssets', assetTree)
  );

  const watcher = vscode.workspace.createFileSystemWatcher(SPRITE_FILE_GLOB);
  watcher.onDidCreate(() => assetTree.refresh());
  watcher.onDidDelete(() => assetTree.refresh());
  watcher.onDidChange(() => assetTree.refresh());
  context.subscriptions.push(watcher);

  context.subscriptions.push(
    vscode.commands.registerCommand('retrobufferTools.refreshAssets', () => {
      assetTree.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('retrobufferTools.openSpriteAsset', async (item) => {
      if (!item || !item.resourceUri) {
        return;
      }

      await vscode.commands.executeCommand(
        'vscode.openWith',
        item.resourceUri,
        SpriteEditorProvider.viewType
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('retrobufferTools.createSpriteAsset', async (resource) => {
      const targetFolder = await resolveTargetFolder(resource);
      if (!targetFolder) {
        vscode.window.showWarningMessage('RetroBuffer: no workspace folder available for sprite asset creation.');
        return;
      }

      const defaultUri = vscode.Uri.joinPath(targetFolder, 'untitled-sprite.rbsprite.json');
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: {
          'RetroBuffer Sprite Asset': ['json']
        },
        saveLabel: 'Create Sprite Asset'
      });

      if (!saveUri) {
        return;
      }

      const spriteName = path.basename(saveUri.fsPath, '.rbsprite.json');
      const sprite = createDefaultSprite(spriteName);
      const encoder = new TextEncoder();

      await vscode.workspace.fs.writeFile(
        saveUri,
        encoder.encode(serializeSprite(sprite))
      );

      assetTree.refresh();

      await vscode.commands.executeCommand(
        'vscode.openWith',
        saveUri,
        SpriteEditorProvider.viewType
      );
    })
  );

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      SpriteEditorProvider.viewType,
      new SpriteEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );
}

async function resolveTargetFolder(resource) {
  if (resource instanceof vscode.Uri) {
    const stat = await vscode.workspace.fs.stat(resource).catch(() => null);
    if (stat && stat.type === vscode.FileType.Directory) {
      return resource;
    }

    if (stat && stat.type === vscode.FileType.File) {
      return vscode.Uri.file(path.dirname(resource.fsPath));
    }
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  return workspaceFolder?.uri;
}

class RetroBufferAssetProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element) {
    if (element) {
      return [];
    }

    const files = await vscode.workspace.findFiles(SPRITE_FILE_GLOB);
    return files
      .sort((left, right) => left.fsPath.localeCompare(right.fsPath))
      .map((uri) => new SpriteAssetItem(uri));
  }

  getTreeItem(element) {
    return element;
  }
}

class SpriteAssetItem extends vscode.TreeItem {
  constructor(resourceUri) {
    const label = path.basename(resourceUri.fsPath, '.rbsprite.json');
    super(label, vscode.TreeItemCollapsibleState.None);

    this.resourceUri = resourceUri;
    this.description = vscode.workspace.asRelativePath(resourceUri, false);
    this.contextValue = 'retrobufferSpriteAsset';
    this.command = {
      command: 'vscode.openWith',
      title: 'Open Sprite Asset',
      arguments: [resourceUri, SpriteEditorProvider.viewType]
    };
  }
}

class SpriteEditorProvider {
  static viewType = 'retrobufferTools.spriteEditor';

  constructor(context) {
    this.context = context;
  }

  resolveCustomTextEditor(document, webviewPanel) {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media')
      ]
    };

    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

    const updateWebview = () => {
      const sprite = parseSpriteDocument(document.getText(), document.uri);
      webviewPanel.webview.postMessage({
        type: 'document',
        sprite,
        path: vscode.workspace.asRelativePath(document.uri, false)
      });
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (!message || typeof message !== 'object') {
        return;
      }

      if (message.type === 'updateSprite') {
        const normalized = normalizeSprite(message.sprite, document.uri);
        await replaceDocument(document, serializeSprite(normalized));
        return;
      }

      if (message.type === 'alert' && typeof message.text === 'string') {
        vscode.window.showInformationMessage(message.text);
      }
    });

    updateWebview();
  }

  getHtml(webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'spriteEditor.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'spriteEditor.css')
    );
    const nonce = createNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>RetroBuffer Sprite Editor</title>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <p class="eyebrow">RetroBuffer Sprite</p>
      <h1 id="sprite-title">Loading...</h1>
      <p id="sprite-path" class="path"></p>

      <label class="field">
        <span>Name</span>
        <input id="sprite-name" type="text" />
      </label>

      <div class="field-grid">
        <label class="field">
          <span>Width</span>
          <input id="sprite-width" type="number" min="1" max="64" />
        </label>
        <label class="field">
          <span>Height</span>
          <input id="sprite-height" type="number" min="1" max="64" />
        </label>
      </div>

      <div class="palette-section">
        <div class="section-title-row">
          <h2>Palette</h2>
          <span id="selected-color-label">Color 1</span>
        </div>
        <div id="palette" class="palette"></div>
      </div>

      <div class="actions">
        <button id="fill-button" type="button">Fill Frame</button>
        <button id="clear-button" type="button">Clear Frame</button>
      </div>
    </aside>

    <main class="editor-panel">
      <div class="canvas-wrap">
        <canvas id="sprite-canvas" width="256" height="256"></canvas>
      </div>
      <p class="hint">Click the canvas to paint pixels. This is the first custom-editor stub for `.rbsprite.json` assets.</p>
    </main>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function createDefaultSprite(name) {
  return normalizeSprite(
    {
      formatVersion: 1,
      type: 'retrobuffer-sprite',
      name,
      width: DEFAULT_SPRITE_SIZE,
      height: DEFAULT_SPRITE_SIZE,
      paletteSize: 16,
      frames: [
        {
          name: 'frame-0',
          pixels: createPixelRows(DEFAULT_SPRITE_SIZE, DEFAULT_SPRITE_SIZE, 0)
        }
      ]
    }
  );
}

function createPixelRows(width, height, fill) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => fill)
  );
}

function normalizeSprite(sprite, uri) {
  const source = sprite && typeof sprite === 'object' ? sprite : {};
  const width = clampInt(source.width, 1, 64, DEFAULT_SPRITE_SIZE);
  const height = clampInt(source.height, 1, 64, DEFAULT_SPRITE_SIZE);
  const paletteSize = clampInt(source.paletteSize, 2, 32, 16);
  const frames = Array.isArray(source.frames) && source.frames.length > 0
    ? source.frames
    : [{ name: 'frame-0', pixels: [] }];

  return {
    formatVersion: 1,
    type: 'retrobuffer-sprite',
    name: typeof source.name === 'string' && source.name.trim().length > 0
      ? source.name.trim()
      : inferNameFromUri(uri),
    width,
    height,
    paletteSize,
    frames: frames.map((frame, index) => ({
      name: typeof frame?.name === 'string' && frame.name.trim().length > 0
        ? frame.name.trim()
        : `frame-${index}`,
      pixels: normalizePixelRows(frame?.pixels, width, height, paletteSize)
    }))
  };
}

function normalizePixelRows(rows, width, height, paletteSize) {
  const normalized = createPixelRows(width, height, 0);

  if (!Array.isArray(rows)) {
    return normalized;
  }

  for (let y = 0; y < height; y += 1) {
    const sourceRow = Array.isArray(rows[y]) ? rows[y] : [];
    for (let x = 0; x < width; x += 1) {
      normalized[y][x] = clampInt(sourceRow[x], 0, paletteSize - 1, 0);
    }
  }

  return normalized;
}

function parseSpriteDocument(text, uri) {
  try {
    const parsed = JSON.parse(text);
    return normalizeSprite(parsed, uri);
  } catch {
    return createDefaultSprite(inferNameFromUri(uri));
  }
}

function serializeSprite(sprite) {
  return `${JSON.stringify(sprite, null, 2)}\n`;
}

function inferNameFromUri(uri) {
  if (!uri) {
    return 'untitled-sprite';
  }

  return path.basename(uri.fsPath, '.rbsprite.json') || 'untitled-sprite';
}

function clampInt(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

async function replaceDocument(document, text) {
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
  );

  edit.replace(document.uri, fullRange, text);
  await vscode.workspace.applyEdit(edit);
}

function createNonce() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';

  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return nonce;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};