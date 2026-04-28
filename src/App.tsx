import { useEffect, useState } from 'react'
import { BattleScreen } from './components/BattleScreen'
import { StartScreen } from './components/StartScreen'

const PLAYER_NAME_KEY = 'kotoba-quest-player-name'

function App() {
  const [playerName, setPlayerName] = useState('')

  useEffect(() => {
    const savedName = localStorage.getItem(PLAYER_NAME_KEY)
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const handleStart = (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    localStorage.setItem(PLAYER_NAME_KEY, trimmedName)
    setPlayerName(trimmedName)
  }

  const handleBackToStart = () => {
    setPlayerName('')
  }

  if (!playerName) {
    return <StartScreen onStart={handleStart} />
  }

  return <BattleScreen playerName={playerName} onBackToStart={handleBackToStart} />
}

export default App
