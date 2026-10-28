window.__ModuleLoader__.load({
  id: 'dsh-screenshot-tool',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dsh-screenshot-tool'

    const EN = {
      button: 'Screenshot',
      busy: 'Capturing…',
      download: 'Download',
      copy: 'Copy',
      close: 'Close',
      copied: 'Copied',
      failed: 'Screenshot failed',
      preview: 'Screenshot preview',
      retry: 'Retry',
    }
    const ZH = {
      button: '截图',
      busy: '截图中…',
      download: '下载',
      copy: '复制',
      close: '关闭',
      copied: '已复制',
      failed: '截图失败',
      preview: '截图预览',
      retry: '重试',
    }

    let translate = (key) => EN[key] ?? key
    let subscribeLocale = () => () => {}
    let readLocale = () => undefined

    function text(key) {
      try {
        const value = translate(key)
        if (typeof value === 'string' && value.length > 0 && value !== key) return value
      } catch {
        /* fall through to the built-in copy */
      }
      return EN[key] ?? key
    }

    function CameraIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: 18,
          height: 18,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          focusable: false,
        },
        h('path', {
          d: 'M3.5 8.6h2.9l1.4-2.3h8.4l1.4 2.3h2.9a1 1 0 0 1 1 1v8.3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V9.6a1 1 0 0 1 1-1z',
        }),
        h('circle', { cx: 12, cy: 13.4, r: 3.6 }),
      )
    }

    const triggerBase = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 30,
      padding: 0,
      border: '1px solid transparent',
      borderRadius: 9,
      background: 'transparent',
      color: 'var(--dsw-alias-label-secondary)',
      cursor: 'pointer',
      transition: 'background 120ms ease, color 120ms ease',
      flex: '0 0 auto',
      lineHeight: 0,
    }

    const panelStyle = {
      position: 'fixed',
      left: '50%',
      bottom: 132,
      transform: 'translateX(-50%)',
      width: 'min(620px, calc(100vw - 40px))',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 12,
      borderRadius: 16,
      border: '1px solid var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-overlay)',
      boxShadow: '0 20px 56px rgba(0, 0, 0, 0.32)',
      zIndex: 70,
    }

    const imageStyle = {
      display: 'block',
      width: '100%',
      maxHeight: '52vh',
      objectFit: 'contain',
      borderRadius: 10,
      background: 'var(--dsw-alias-bg-layer-1)',
    }

    const rowStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'flex-end',
    }

    const actionStyle = {
      border: '1px solid var(--dsw-alias-border-l1)',
      background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)',
      borderRadius: 8,
      padding: '5px 12px',
      fontSize: 12,
      cursor: 'pointer',
      fontFamily: 'inherit',
    }

    const noticeStyle = {
      marginRight: 'auto',
      fontSize: 12,
      color: 'var(--dsw-alias-label-secondary)',
    }

    function Screenshot() {
      React.useSyncExternalStore(subscribeLocale, readLocale, readLocale)
      const [hover, setHover] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [shot, setShot] = React.useState(null)
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')

      React.useEffect(() => {
        if (!shot) return undefined
        return () => URL.revokeObjectURL(shot.url)
      }, [shot])

      const capture = React.useCallback(async () => {
        if (busy) return
        setBusy(true)
        setError('')
        setNotice('')
        try {
          const response = await fetch('/screenshot', { method: 'GET', cache: 'no-store' })
          if (!response.ok) {
            let detail = ''
            try {
              detail = (await response.text()).slice(0, 300)
            } catch {
              detail = ''
            }
            throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
          }
          const blob = await response.blob()
          setShot({ url: URL.createObjectURL(blob), blob })
        } catch (cause) {
          setError(cause && cause.message ? cause.message : String(cause))
        } finally {
          setBusy(false)
        }
      }, [busy])

      const close = React.useCallback(() => {
        setShot(null)
        setError('')
        setNotice('')
      }, [])

      const download = React.useCallback(() => {
        if (!shot) return
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        const link = document.createElement('a')
        link.href = shot.url
        link.download = `dsh-screenshot-${stamp}.png`
        link.click()
      }, [shot])

      const copy = React.useCallback(async () => {
        if (!shot) return
        try {
          await navigator.clipboard.write([new globalThis.ClipboardItem({ 'image/png': shot.blob })])
          setNotice(text('copied'))
        } catch (cause) {
          setError(cause && cause.message ? cause.message : String(cause))
        }
      }, [shot])

      const triggerStyle = {
        ...triggerBase,
        background: hover ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
        color: hover || busy ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
        opacity: busy ? 0.6 : 1,
      }

      const open = Boolean(shot) || Boolean(error)

      return h(
        React.Fragment,
        null,
        h(
          'button',
          {
            type: 'button',
            style: triggerStyle,
            title: text(busy ? 'busy' : 'button'),
            'aria-label': text(busy ? 'busy' : 'button'),
            'aria-busy': busy ? 'true' : 'false',
            disabled: busy,
            onMouseEnter: () => setHover(true),
            onMouseLeave: () => setHover(false),
            onClick: capture,
          },
          h(CameraIcon, null),
        ),
        open
          ? h(
              'div',
              { style: panelStyle, role: 'dialog', 'aria-label': text('preview') },
              error
                ? h(
                    'div',
                    {
                      style: {
                        fontSize: 13,
                        color: 'var(--dsw-alias-state-error-primary)',
                        wordBreak: 'break-word',
                        padding: '4px 2px',
                      },
                    },
                    `${text('failed')}: ${error}`,
                  )
                : h('img', { src: shot.url, alt: text('preview'), style: imageStyle }),
              h(
                'div',
                { style: rowStyle },
                notice ? h('span', { style: noticeStyle }, notice) : null,
                error
                  ? h('button', { type: 'button', style: actionStyle, onClick: capture }, text('retry'))
                  : null,
                shot
                  ? h('button', { type: 'button', style: actionStyle, onClick: download }, text('download'))
                  : null,
                shot
                  ? h('button', { type: 'button', style: actionStyle, onClick: copy }, text('copy'))
                  : null,
                h('button', { type: 'button', style: actionStyle, onClick: close }, text('close')),
              ),
            )
          : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        let locale
        try {
          locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined
        } catch {
          locale = undefined
        }
        if (locale) {
          ctx.effect(() => {
            const disposers = []
            const register = (tag, dict) => {
              try {
                disposers.push(locale.register(NS, tag, dict))
              } catch {
                /* an unavailable tag only costs the fallback copy */
              }
            }
            register('en', EN)
            register('zh', ZH)
            register('zh-CN', ZH)
            return () => {
              for (const dispose of disposers) dispose()
            }
          })
          try {
            translate = locale.bind(NS)
            subscribeLocale = locale.subscribe.bind(locale)
            readLocale = locale.getLocale.bind(locale)
          } catch {
            /* keep the built-in English copy */
          }
        }

        ctx.slots.inject('conversation.input.left', () =>
          ctx.slots.register(
            { name: 'conversation.input.left', id: 'screenshot', order: 0 },
            Screenshot,
          ),
        )
      },
    }
  },
})
