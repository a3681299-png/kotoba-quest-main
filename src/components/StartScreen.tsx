import { useEffect, useState } from 'react'
import '../styles/start.css'

interface StartScreenProps {
  onStart: (name: string) => void
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    const input = document.getElementById('player-name-input') as HTMLInputElement | null
    input?.focus()
  }, [])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onStart(name)
  }

  return (
    <main className="start-screen">
      <section className="start-card">
        <p className="start-kicker">Kotoba Quest</p>
        <h1>じぶんの名前で、冒険をはじめよう</h1>
        <p className="start-description">
          パスワードやメールは不要です。ニックネームだけで始められます。
        </p>

        <form className="start-form" onSubmit={handleSubmit}>
          <label className="start-label" htmlFor="player-name-input">
            ニックネーム
          </label>
          <input
            id="player-name-input"
            className="start-input"
            type="text"
            maxLength={16}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="たとえば たろう"
            autoComplete="nickname"
          />
          <button className="start-button" type="submit" disabled={!name.trim()}>
            はじめる
          </button>
        </form>

        <p className="start-note">入力した名前はこの端末に保存されます。</p>
      </section>
    </main>
  )
}