/** Hidden: press Q eight times quickly to toggle BGM → Miguel Nagila */
(function () {
  const TRACKS = [
    {
      name: 'Arcade Blood Rush',
      match: 'arcade-blood-rush',
      src: './assets/arcade-blood-rush.mp3',
    },
    {
      name: 'Miguel Nagila',
      match: 'miguel-nagila',
      src: './assets/miguel-nagila.mp3',
    },
  ]

  let trackIndex = 0
  let bgm = null
  let qStreak = 0
  let qAt = 0
  const Q_NEEDED = 8
  const Q_WINDOW_MS = 2500

  function resolve(rel) {
    return new URL(rel, globalThis.location.href).href
  }

  function isBgmSrc(src) {
    const s = String(src || '')
    return s.includes('arcade-blood-rush') || s.includes('miguel-nagila')
  }

  function capture(a, srcHint) {
    if (!a) return
    if (isBgmSrc(srcHint) || isBgmSrc(a.src) || isBgmSrc(a.currentSrc)) bgm = a
  }

  const NativeAudio = globalThis.Audio
  function PatchedAudio(...args) {
    const a = Reflect.construct(NativeAudio, args, NativeAudio)
    capture(a, args[0])
    a.addEventListener(
      'loadedmetadata',
      () => {
        capture(a)
      },
      { once: true },
    )
    return a
  }
  PatchedAudio.prototype = NativeAudio.prototype
  Object.defineProperty(PatchedAudio, 'name', { value: 'Audio' })
  try {
    Object.setPrototypeOf(PatchedAudio, NativeAudio)
  } catch {
    /* ignore */
  }
  globalThis.Audio = PatchedAudio

  // Also capture when the game starts playback (new Audio() is not in the DOM)
  const nativePlay = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (...args) {
    capture(this)
    return nativePlay.apply(this, args)
  }

  function findBgm() {
    if (bgm && (isBgmSrc(bgm.src) || isBgmSrc(bgm.currentSrc))) return bgm
    for (const a of document.querySelectorAll('audio')) {
      if (isBgmSrc(a.src) || isBgmSrc(a.currentSrc)) {
        bgm = a
        return bgm
      }
    }
    return bgm
  }

  function toast(name) {
    let el = document.getElementById('music-toast')
    if (!el) {
      el = document.createElement('div')
      el.id = 'music-toast'
      el.setAttribute('aria-live', 'polite')
      el.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:18%',
        'transform:translateX(-50%)',
        'z-index:4000',
        'padding:10px 18px',
        'background:#0d1420ee',
        'border:1px solid #ffcc00',
        'color:#ffcc00',
        'font:700 14px/1 Arial,sans-serif',
        'letter-spacing:.04em',
        'pointer-events:none',
        'opacity:0',
        'transition:opacity .2s ease',
      ].join(';')
      document.body.appendChild(el)
    }
    el.textContent = '♪ ' + name
    el.style.opacity = '1'
    clearTimeout(el._hide)
    el._hide = setTimeout(() => {
      el.style.opacity = '0'
    }, 1600)
  }

  function toggleTrack() {
    const audio = findBgm()
    if (!audio) {
      toast('Enable music first (♪)')
      return
    }
    bgm = audio
    trackIndex = (trackIndex + 1) % TRACKS.length
    const track = TRACKS[trackIndex]
    const wasPlaying = !bgm.paused
    const vol = bgm.volume
    bgm.pause()
    bgm.src = resolve(track.src)
    bgm.loop = true
    bgm.volume = vol
    bgm.load()
    if (wasPlaying) {
      void bgm.play().catch(() => {})
    }
    toast(track.name)
  }

  function isQKey(e) {
    if (e.repeat) return false
    if (e.code === 'KeyQ') return true
    const k = e.key
    return k === 'q' || k === 'Q'
  }

  function isTypingTarget(el) {
    if (!el || el === document.body || el === document.documentElement) return false
    if (el.isContentEditable) return true
    const tag = el.tagName
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (tag !== 'INPUT') return false
    // Character radios/checkboxes are fine; only block real text entry
    const type = (el.type || 'text').toLowerCase()
    return !['radio', 'checkbox', 'button', 'submit', 'reset', 'range', 'file', 'color', 'hidden'].includes(type)
  }

  window.addEventListener(
    'keydown',
    (e) => {
      if (!isQKey(e)) return
      if (isTypingTarget(e.target)) {
        qStreak = 0
        return
      }
      const now = performance.now()
      if (now - qAt > Q_WINDOW_MS) qStreak = 0
      qAt = now
      qStreak += 1
      if (qStreak < Q_NEEDED) return
      qStreak = 0
      toggleTrack()
    },
    true,
  )
})()
