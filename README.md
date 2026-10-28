# dsh-screenshot-tool

Screenshot capture for DeepSeek Harness on Windows. Two entry points share one capture path:

- **`screenshot` tool** — the model calls it, gets the absolute PNG path plus pixel and byte size, and reads the image back with `read_image`.
- **Camera button** — a control in the composer tool row (next to the attach button). It captures the desktop, shows a preview panel, and offers download, copy-to-clipboard, and close.

Both go through a `GET /screenshot` route on the Harness web server that streams PNG bytes; the tool additionally writes a file into the session working directory.

## Requirements

- Windows (uses `System.Windows.Forms` + `System.Drawing` through PowerShell).
- PowerShell: `pwsh` 7 is preferred, `powershell.exe` is the fallback. It looks for `pwsh` on `PATH`, then `C:\Program Files\PowerShell\7\pwsh.exe`, then Windows PowerShell.

## Install

From the plugin market, or:

```sh
dsh plugin --profile <profile> add dsh-screenshot-tool
```

Restart the Harness once after installing, so the client module table is scanned again; the camera button appears on the next start.

## Usage

Ask the model to take a screenshot, or call the tool directly:

```json
{ "path": "evidence/login-page.png" }
```

`path` is optional. Relative paths resolve against the session working directory; the default is `screenshots/shot-<timestamp>.png` there.

The camera button captures straight away and never writes to disk unless you press **Download**.

## What it touches

- Captures the whole virtual desktop (all monitors) via GDI.
- Spawns one PowerShell process per capture; the script is passed inline, and the output path through the `DSH_SHOT_PATH` environment variable.
- The tool writes the PNG to the path you choose; the button keeps the image in memory until download.

## Limitations

- Windows only.
- Captures what is on screen, so occluded windows are not visible.
- Large screenshots are downscaled by `read_image`, which can make small text hard to read.
