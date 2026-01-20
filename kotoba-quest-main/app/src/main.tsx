import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 注意: Pixi.jsとの互換性のためStrictModeを無効化
// StrictModeはuseEffectを2回呼び出すため、Pixi.jsの初期化/破棄でエラーが発生する
createRoot(document.getElementById('root')!).render(<App />)
