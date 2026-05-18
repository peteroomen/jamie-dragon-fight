import { useState, useEffect, useRef, useCallback } from 'react'

const MAX_HP = 100
const POWER_COOLDOWN_S = 5
const LIGHTNING_COOLDOWN_S = 6

function enemyMaxHp(wave: number)  { return 60 + wave * 20 }
function goldForWave(wave: number) { return 30 + wave * 15 }
function dmgScale(wave: number)    { return 1 + (wave - 1) * 0.15 }

const PLAYER_ATTACKS = [
  { name: 'Sword Slash',    damage: [12, 22] as [number, number], emoji: '⚔️',  key: 'R', cooldownKey: null },
  { name: 'Shield Bash',    damage: [8,  18] as [number, number], emoji: '🛡️',  key: 'S', cooldownKey: null },
  { name: 'POWER STRIKE',   damage: [25, 40] as [number, number], emoji: '💥',  key: 'D', cooldownKey: 'power' },
  { name: 'Fire Arrow',     damage: [18, 30] as [number, number], emoji: '🏹🔥', key: 'F', cooldownKey: null },
  { name: 'Magic Blast',    damage: [1,  50] as [number, number], emoji: '✨',  key: 'G', cooldownKey: null },
  { name: 'LIGHTNING BOLT', damage: [30, 50] as [number, number], emoji: '⚡',  key: 'J', cooldownKey: 'lightning' },
]

const COMPUTER_ATTACKS = [
  { name: 'Ice Shard',   damage: [14, 24] as [number, number], emoji: '🧊' },
  { name: 'Tail Whip',   damage: [10, 20] as [number, number], emoji: '💨' },
  { name: 'Freeze Roar', damage: [22, 35] as [number, number], emoji: '🌬️' },
]

const SHOP_ITEMS = [
  { id: 'potion',  name: 'Health Potion',  emoji: '🧪',   desc: 'Heal 30 HP   (press H in battle)', cost: 20 },
  { id: 'bomb',    name: 'Dragon Bomb',    emoji: '💣',   desc: '50–70 dmg    (press B in battle)', cost: 60 },
  { id: 'sword',   name: 'Enchanted Blade',emoji: '✨⚔️', desc: '+10 dmg to ALL attacks forever',   cost: 60 },
  { id: 'shield',  name: 'Iron Shield',    emoji: '🛡️🔥', desc: 'Take 8 less dmg per hit forever',  cost: 50 },
]

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

type GameState = 'playing' | 'won' | 'lost'

export default function DragonFight() {
  const [wave, setWave]             = useState(1)
  const [playerHp, setPlayerHp]     = useState(MAX_HP)
  const [computerHp, setComputerHp] = useState(enemyMaxHp(1))
  const [gameState, setGameState]   = useState<GameState>('playing')
  const [messages, setMessages]     = useState<string[]>(['⚔️ The brave knight faces the ice dragon! Press A–J to attack!'])
  const [powerCooldown, setPowerCooldown]         = useState(0)
  const [lightningCooldown, setLightningCooldown] = useState(0)
  const [isEnemyTurn, setIsEnemyTurn] = useState(false)
  const [playerShake, setPlayerShake] = useState(false)
  const [enemyShake, setEnemyShake]   = useState(false)
  const [showWin, setShowWin]         = useState(false)

  const [gold, setGold]             = useState(0)
  const [shopOpen, setShopOpen]     = useState(false)
  const [potions, setPotions]       = useState(0)
  const [bombs, setBombs]           = useState(0)
  const [swordOwned, setSwordOwned]   = useState(false)
  const [shieldOwned, setShieldOwned] = useState(false)

  const waveRef           = useRef(1)
  const playerHpRef       = useRef(MAX_HP)
  const computerHpRef     = useRef(enemyMaxHp(1))
  const gameStateRef      = useRef<GameState>('playing')
  const isEnemyTurnRef    = useRef(false)
  const powerReadyRef     = useRef(true)
  const lightningReadyRef = useRef(true)
  const potionsRef        = useRef(0)
  const bombsRef          = useRef(0)
  const swordRef          = useRef(false)
  const shieldRef         = useRef(false)

  const addMsg = useCallback((msg: string) => {
    setMessages(prev => [msg, ...prev].slice(0, 6))
  }, [])

  const startCooldown = useCallback((
    secs: number,
    setFn: (n: number) => void,
    readyRef: React.MutableRefObject<boolean>
  ) => {
    readyRef.current = false
    setFn(secs)
    let remaining = secs
    const iv = setInterval(() => {
      remaining -= 1
      setFn(remaining)
      if (remaining <= 0) { clearInterval(iv); readyRef.current = true }
    }, 1000)
  }, [])

  const doEnemyAttack = useCallback(() => {
    const atk = COMPUTER_ATTACKS[rand(0, COMPUTER_ATTACKS.length - 1)]
    const scaled = Math.round(rand(atk.damage[0], atk.damage[1]) * dmgScale(waveRef.current))
    const dmg = Math.max(1, scaled - (shieldRef.current ? 8 : 0))
    const newHp = Math.max(0, playerHpRef.current - dmg)
    playerHpRef.current = newHp
    setPlayerHp(newHp)
    setPlayerShake(true)
    setTimeout(() => setPlayerShake(false), 400)
    const shieldNote = shieldRef.current ? ` (shield blocked 8!)` : ''
    addMsg(`👾 Enemy uses ${atk.emoji} ${atk.name} — you take ${dmg} damage!${shieldNote}`)
    if (newHp <= 0) { gameStateRef.current = 'lost'; setGameState('lost') }
    isEnemyTurnRef.current = false
    setIsEnemyTurn(false)
  }, [addMsg])

  const doPlayerAttack = useCallback((idx: number) => {
    if (gameStateRef.current !== 'playing') return
    if (isEnemyTurnRef.current) return
    const atk = PLAYER_ATTACKS[idx]
    if (atk.cooldownKey === 'power'     && !powerReadyRef.current)     return
    if (atk.cooldownKey === 'lightning' && !lightningReadyRef.current) return

    const boost = swordRef.current ? 10 : 0
    const dmg = rand(atk.damage[0], atk.damage[1]) + boost
    const newHp = Math.max(0, computerHpRef.current - dmg)
    computerHpRef.current = newHp
    setComputerHp(newHp)
    setEnemyShake(true)
    setTimeout(() => setEnemyShake(false), 400)
    const boostNote = boost > 0 ? ` (+${boost} enchanted!)` : ''
    addMsg(`🧑‍⚔️ Knight uses ${atk.emoji} ${atk.name} — ${dmg} damage!${boostNote}`)

    if (atk.cooldownKey === 'power')     startCooldown(POWER_COOLDOWN_S,     setPowerCooldown,     powerReadyRef)
    if (atk.cooldownKey === 'lightning') startCooldown(LIGHTNING_COOLDOWN_S, setLightningCooldown, lightningReadyRef)

    if (newHp <= 0) {
      gameStateRef.current = 'won'
      setGameState('won')
      const earned = goldForWave(waveRef.current)
      setGold(prev => prev + earned)
      waveRef.current += 1
      setWave(waveRef.current)
      setTimeout(() => setShowWin(true), 400)
      return
    }
    isEnemyTurnRef.current = true
    setIsEnemyTurn(true)
    setTimeout(doEnemyAttack, rand(1200, 2200))
  }, [doEnemyAttack, startCooldown, addMsg])

  const usePotion = useCallback(() => {
    if (potionsRef.current <= 0) return
    if (gameStateRef.current !== 'playing') return
    potionsRef.current -= 1
    setPotions(prev => prev - 1)
    const healed = Math.min(30, MAX_HP - playerHpRef.current)
    playerHpRef.current = Math.min(MAX_HP, playerHpRef.current + 30)
    setPlayerHp(playerHpRef.current)
    addMsg(`🧪 Knight drinks a potion and heals ${healed} HP!`)
  }, [addMsg])

  const useBomb = useCallback(() => {
    if (bombsRef.current <= 0) return
    if (gameStateRef.current !== 'playing') return
    if (isEnemyTurnRef.current) return
    bombsRef.current -= 1
    setBombs(prev => prev - 1)
    const dmg = rand(50, 70)
    const newHp = Math.max(0, computerHpRef.current - dmg)
    computerHpRef.current = newHp
    setComputerHp(newHp)
    setEnemyShake(true)
    setTimeout(() => setEnemyShake(false), 400)
    addMsg(`💣 BOOM! Dragon bomb explodes for ${dmg} damage!`)
    if (newHp <= 0) {
      gameStateRef.current = 'won'
      setGameState('won')
      const earned = goldForWave(waveRef.current)
      setGold(prev => prev + earned)
      waveRef.current += 1
      setWave(waveRef.current)
      setTimeout(() => setShowWin(true), 400)
      return
    }
    isEnemyTurnRef.current = true
    setIsEnemyTurn(true)
    setTimeout(doEnemyAttack, rand(1200, 2200))
  }, [doEnemyAttack, addMsg])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return
      const key = e.key.toUpperCase()
      if (key === 'H') { usePotion(); return }
      if (key === 'B') { useBomb(); return }
      const idx = PLAYER_ATTACKS.findIndex(a => a.key === key)
      if (idx !== -1) doPlayerAttack(idx)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doPlayerAttack, usePotion, useBomb])

  const buyItem = (id: string) => {
    const item = SHOP_ITEMS.find(i => i.id === id)!
    if (gold < item.cost) return
    if (id === 'sword'  && swordOwned)  return
    if (id === 'shield' && shieldOwned) return
    setGold(prev => prev - item.cost)
    if (id === 'potion')  { setPotions(p => p + 1); potionsRef.current += 1 }
    if (id === 'bomb')    { setBombs(b => b + 1);   bombsRef.current   += 1 }
    if (id === 'sword')   { setSwordOwned(true);  swordRef.current  = true }
    if (id === 'shield')  { setShieldOwned(true); shieldRef.current = true }
  }

  const resetGame = (fullRestart = false, lostEverything = false) => {
    const nextWave = fullRestart ? 1 : waveRef.current
    if (fullRestart) { waveRef.current = 1; setWave(1) }
    if (lostEverything) {
      setGold(0)
      setPotions(0); potionsRef.current = 0
      setBombs(0);   bombsRef.current   = 0
      setSwordOwned(false);  swordRef.current  = false
      setShieldOwned(false); shieldRef.current = false
    }
    const newEnemyHp = enemyMaxHp(nextWave)
    playerHpRef.current   = MAX_HP
    computerHpRef.current = newEnemyHp
    gameStateRef.current  = 'playing'
    isEnemyTurnRef.current    = false
    powerReadyRef.current     = true
    lightningReadyRef.current = true
    setPlayerHp(MAX_HP)
    setComputerHp(newEnemyHp)
    setGameState('playing')
    setMessages([`⚔️ Dragon ${nextWave} appears! It has ${newEnemyHp} HP!`])
    setPowerCooldown(0)
    setLightningCooldown(0)
    setIsEnemyTurn(false)
    setShowWin(false)
    setShopOpen(false)
  }

  const playerPct = (playerHp / MAX_HP) * 100
  const enemyPct  = (computerHp / enemyMaxHp(wave)) * 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950 flex flex-col items-center justify-center p-4 select-none">

      {showWin && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75">
          <div className="flex gap-3 mb-2">
            {['💥','💥','💥','💥','💥'].map((e, i) => (
              <span key={i} className="text-4xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>{e}</span>
            ))}
          </div>
          <div className="text-8xl mb-1">🏆</div>
          <div className="text-6xl font-black text-yellow-300 text-center animate-pulse"
            style={{ textShadow: '0 0 40px gold, 0 0 80px orange' }}>
            I WIN!!!
          </div>
          <div className="text-3xl mt-3 text-yellow-400 font-black animate-bounce">
            +{goldForWave(wave - 1)} 💰 gold!
          </div>
          <div className="text-blue-300 text-lg mt-1">
            Next: Dragon {wave} — {enemyMaxHp(wave)} HP 😤
          </div>
          <div className="flex gap-4 mt-6">
            <button onClick={() => { setShowWin(false); setShopOpen(true) }}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black text-xl font-black rounded-full hover:scale-105 transition-transform shadow-xl">
              🛒 Shop
            </button>
            <button onClick={() => resetGame(false)}
              className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xl font-black rounded-full hover:scale-105 transition-transform shadow-xl">
              ⚔️ Next Dragon!
            </button>
          </div>
        </div>
      )}

      {gameState === 'lost' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75">
          <div className="text-8xl mb-4">🥶</div>
          <div className="text-5xl font-black text-blue-300 text-center">You got frozen...</div>
          <div className="text-gray-400 mt-2">You made it to Dragon {wave - 1 > 0 ? wave - 1 : 1}!</div>
          <div className="flex gap-3 mt-6 flex-wrap justify-center">
            <button onClick={() => resetGame(false, true)}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-lg font-black rounded-full hover:scale-105 transition-transform">
              Retry Dragon {wave} 💪
            </button>
            <button onClick={() => resetGame(true, true)}
              className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-black rounded-full hover:scale-105 transition-transform">
              Start Over 🔄
            </button>
          </div>
        </div>
      )}

      {shopOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-yellow-300">🛒 Dragon Shop</h2>
              <span className="text-xl font-black text-yellow-400">💰 {gold} gold</span>
            </div>
            <div className="flex flex-col gap-3">
              {SHOP_ITEMS.map(item => {
                const owned = (item.id === 'sword' && swordOwned) || (item.id === 'shield' && shieldOwned)
                const cantAfford = gold < item.cost
                const count = item.id === 'potion' ? potions : item.id === 'bomb' ? bombs : null
                return (
                  <div key={item.id} className="flex items-center gap-3 bg-slate-800 rounded-2xl p-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">
                        {item.name}
                        {count !== null && count > 0 && <span className="ml-2 text-yellow-400">×{count}</span>}
                        {owned && <span className="ml-2 text-green-400"> owned</span>}
                      </div>
                      <div className="text-gray-400 text-xs">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => buyItem(item.id)}
                      disabled={cantAfford || owned}
                      className={`px-3 py-1 rounded-xl text-sm font-black transition-all ${
                        owned        ? 'bg-green-800 text-green-400 cursor-default' :
                        cantAfford   ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                                       'bg-yellow-500 hover:bg-yellow-400 text-black active:scale-95'
                      }`}>
                      {owned ? '✓' : `${item.cost}💰`}
                    </button>
                  </div>
                )
              })}
            </div>
            <button onClick={() => { setShopOpen(false); if (gameState === 'won') resetGame() }}
              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl transition-all">
              {gameState === 'won' ? '⚔️ Start Next Battle!' : '❌ Close Shop'}
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-xl flex justify-between items-center mb-2 px-1">
        <h1 className="text-2xl font-black text-white">⚔️ Knight vs Dragon <span className="text-blue-400 text-lg">#{wave}</span></h1>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-black text-lg">💰 {gold}</span>
          <button onClick={() => setShopOpen(true)}
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl text-sm transition-all active:scale-95">
            🛒 Shop
          </button>
        </div>
      </div>

      {(potions > 0 || bombs > 0 || swordOwned || shieldOwned) && (
        <div className="w-full max-w-xl flex gap-2 mb-2 flex-wrap">
          {potions > 0 && <span className="bg-blue-900/60 border border-blue-600 rounded-xl px-3 py-1 text-sm text-white">🧪 ×{potions} <span className="text-gray-400">(H)</span></span>}
          {bombs > 0   && <span className="bg-red-900/60 border border-red-600 rounded-xl px-3 py-1 text-sm text-white">💣 ×{bombs} <span className="text-gray-400">(B)</span></span>}
          {swordOwned  && <span className="bg-yellow-900/60 border border-yellow-600 rounded-xl px-3 py-1 text-sm text-white">✨⚔️ +10 dmg</span>}
          {shieldOwned && <span className="bg-green-900/60 border border-green-600 rounded-xl px-3 py-1 text-sm text-white">🛡️🔥 -8 dmg</span>}
        </div>
      )}

      <div className="w-full max-w-xl bg-blue-950/60 rounded-3xl p-5 border border-blue-500/30 shadow-2xl mb-3">
        <div className="flex items-end justify-between mb-5">
          <div className="flex flex-col items-center">
            <div className={`text-8xl transition-transform duration-100 ${playerShake ? 'translate-x-3' : ''}`}>
              {playerHp < 30 ? '😰' : '🧑‍⚔️'}
            </div>
            <div className="text-white font-bold text-lg mt-1">YOU</div>
            <div className="w-36 bg-gray-800 rounded-full h-5 mt-2 overflow-hidden">
              <div className="h-5 rounded-full transition-all duration-300"
                style={{ width: `${playerPct}%`, background: playerPct > 50 ? '#4ade80' : playerPct > 25 ? '#facc15' : '#f87171' }} />
            </div>
            <div className="text-gray-300 text-sm mt-1">{playerHp} / {MAX_HP} HP</div>
          </div>

          <div className="text-3xl text-blue-300 font-black pb-6">VS</div>

          <div className="flex flex-col items-center">
            <div className={`text-8xl transition-transform duration-100 ${enemyShake ? '-translate-x-3' : ''}`}>
              {gameState === 'won' ? '💥' : computerHp < 30 ? '😰' : '🐲'}
            </div>
            <div className="text-white font-bold text-lg mt-1">ENEMY</div>
            <div className="w-36 bg-gray-800 rounded-full h-5 mt-2 overflow-hidden">
              <div className="h-5 rounded-full transition-all duration-300"
                style={{ width: `${enemyPct}%`, background: '#f87171' }} />
            </div>
            <div className="text-gray-300 text-sm mt-1">{computerHp} / {enemyMaxHp(wave)} HP</div>
          </div>
        </div>

        {isEnemyTurn && (
          <p className="text-center text-blue-300 text-sm mb-3 animate-pulse">🌨️ Enemy is planning their attack...</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {PLAYER_ATTACKS.map((atk, i) => {
            const cd = atk.cooldownKey === 'power' ? powerCooldown : atk.cooldownKey === 'lightning' ? lightningCooldown : 0
            const onCooldown = cd > 0
            const disabled = isEnemyTurn || gameState !== 'playing' || onCooldown
            return (
              <button key={atk.key} onClick={() => doPlayerAttack(i)} disabled={disabled}
                className={`flex flex-col items-center p-2 rounded-2xl border-2 font-bold transition-all duration-150 ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed border-gray-700 bg-gray-900/50'
                    : 'border-blue-400 bg-blue-800/50 hover:bg-blue-600/60 active:scale-95 cursor-pointer hover:border-blue-300'
                }`}>
                <span className="text-2xl">{atk.emoji}</span>
                <span className="text-white text-xs font-bold mt-1 text-center leading-tight">{atk.name}</span>
                <span className="text-blue-300 text-xs mt-1 font-mono">
                  {onCooldown ? `⏳ ${cd}s` : `Press ${atk.key}`}
                </span>
                <span className="text-gray-400 text-xs">
                  {atk.damage[0] === 1 ? '?–? dmg' : `${atk.damage[0]}–${atk.damage[1]} dmg`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="w-full max-w-xl bg-black/40 rounded-2xl p-4 border border-blue-900/50 min-h-[6rem]">
        <p className="text-xs text-blue-500 font-bold mb-1 uppercase tracking-wider">Battle Log</p>
        {messages.map((m, i) => (
          <p key={i} className={`text-sm mb-1 ${i === 0 ? 'text-white' : 'text-gray-500'}`}>{m}</p>
        ))}
      </div>
      <p className="text-blue-600 text-xs mt-2">R S D F G J = attack • H = potion • B = bomb</p>
    </div>
  )
}
