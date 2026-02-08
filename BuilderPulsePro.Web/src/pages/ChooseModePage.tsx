import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'

const storageKey = 'bpp.userMode'

type UserMode = 'client' | 'contractor'

function ChooseModePage() {
  const navigate = useNavigate()
  const [selectedMode, setSelectedMode] = useState<UserMode | null>(null)

  const chooseMode = (mode: UserMode) => {
    localStorage.setItem(storageKey, mode)
    setSelectedMode(mode)
    navigate('/')
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <p className="page-kicker">Choose a mode</p>
        <h1 className="page-title">How will you use BuilderPulse Pro?</h1>
        <p className="page-body">
          Select a role to tailor your experience. You can change this later.
        </p>
        <div className="mode-grid">
          <button className="button primary" type="button" onClick={() => chooseMode('client')}>
            Client
          </button>
          <button className="button secondary" type="button" onClick={() => chooseMode('contractor')}>
            Contractor
          </button>
        </div>
        {selectedMode && (
          <p className="success">Saved: {selectedMode === 'client' ? 'Client' : 'Contractor'}.</p>
        )}
      </div>
    </div>
  )
}

export default ChooseModePage
