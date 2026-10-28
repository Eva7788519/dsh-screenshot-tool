/**
 * Screenshot bundle.
 *
 * Host half: one `screenshot` tool for the model and an exact `/screenshot`
 * HTTP route that captures the Windows desktop on demand and returns PNG bytes.
 * Client half: a camera control in the composer tool row that calls that route.
 */
import { execFile } from 'node:child_process'
import { mkdir, readFile, stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const runFile = promisify(execFile)

export const inject = ['tools']

const CAPTURE_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bitmap.Size)
$bitmap.Save($env:DSH_SHOT_PATH, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Output ("{0}x{1}" -f $bounds.Width, $bounds.Height)
`.trim()

/** Candidates in preference order; `pwsh` (Core) before the Windows PowerShell fallback. */
const SHELL_CANDIDATES = [
  process.env.DSH_PWSH_PATH,
  'pwsh',
  'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
  'powershell.exe',
].filter((value) => typeof value === 'string' && value.length > 0)

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function messageOf(error) {
  if (error && typeof error === 'object' && typeof error.message === 'string') return error.message
  return String(error)
}

async function captureDesktop(file, signal) {
  let lastMissing = null
  for (const shell of SHELL_CANDIDATES) {
    try {
      const { stdout } = await runFile(
        shell,
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', CAPTURE_SCRIPT],
        {
          env: { ...process.env, DSH_SHOT_PATH: file },
          windowsHide: true,
          timeout: 30_000,
          maxBuffer: 1024 * 1024,
          signal,
        },
      )
      return String(stdout).trim()
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        lastMissing = shell
        continue
      }
      throw error
    }
  }
  throw new Error(
    `No PowerShell executable found (tried: ${SHELL_CANDIDATES.join(', ')}; last missing: ${lastMissing}).`,
  )
}

/** Capture to a temp file, stream the bytes back, and always drop the temp file. */
async function handleHttpCapture(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET, POST' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const file = path.join(
    tmpdir(),
    `dsh-shot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
  )

  try {
    await captureDesktop(file)
    const data = await readFile(file)
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': String(data.byteLength),
      'Cache-Control': 'no-store',
    })
    res.end(data)
  } catch (error) {
    res.writeHead(500, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    res.end(JSON.stringify({ error: messageOf(error) }))
  } finally {
    unlink(file).catch(() => {})
  }
}

export function apply(ctx) {
  ctx.effect(() =>
    ctx.tools.register({
      name: 'screenshot',
      description:
        'Capture the current Windows desktop (all monitors) to a PNG file. Returns the absolute path, pixel size and byte size. Follow up with read_image on the returned path when you need to look at the pixels.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Optional output PNG path. Relative paths resolve against the session working directory. Defaults to screenshots/shot-<timestamp>.png there.',
          },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
            bytes: { type: 'number' },
          },
          required: ['path', 'width', 'height', 'bytes'],
          additionalProperties: false,
        },
        render(_args, value) {
          const shot = value && typeof value === 'object' ? value : {}
          const text =
            `Screenshot saved to ${shot.path} (${shot.width}x${shot.height}, ${shot.bytes} bytes). ` +
            'Use read_image with this path to inspect it.'
          return [{ type: 'text', text }]
        },
      },
      async execute(args, exec) {
        const input = args && typeof args === 'object' ? args : {}
        const requested = typeof input.path === 'string' ? input.path.trim() : ''

        let base = process.cwd()
        const workingDirectory = ctx.get('workingDirectory')
        if (workingDirectory && exec.agent) {
          try {
            base = await workingDirectory.ensure(exec.agent)
          } catch {
            base = process.cwd()
          }
        }

        const target = requested
          ? path.isAbsolute(requested)
            ? requested
            : path.join(base, requested)
          : path.join(base, 'screenshots', `shot-${timestamp()}.png`)

        await mkdir(path.dirname(target), { recursive: true })

        const dimensions = await captureDesktop(target, exec.signal)
        const match = /^(\d+)x(\d+)$/.exec(dimensions)
        const info = await stat(target)

        return {
          path: target,
          width: match ? Number(match[1]) : 0,
          height: match ? Number(match[2]) : 0,
          bytes: info.size,
        }
      },
    }),
  )

  const webServer = ctx.get('webServer')
  if (webServer) {
    ctx.effect(() =>
      webServer.register({ kind: 'exact', path: '/screenshot', handler: handleHttpCapture }),
    )
  }
}
