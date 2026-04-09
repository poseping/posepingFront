import { useState } from 'react'
import WebcamStream from './components/Webcam/WebcamStream'
import './App.css'

function App() {
  const [isActive, setIsActive] = useState(false)

  return (
    <div className="app">
      <header>
        <h1>바른자세 감시 시스템</h1>
      </header>
      <main>
        <WebcamStream isActive={isActive} onToggle={() => setIsActive(!isActive)} />
      </main>
    </div>
  )
}

export default App
