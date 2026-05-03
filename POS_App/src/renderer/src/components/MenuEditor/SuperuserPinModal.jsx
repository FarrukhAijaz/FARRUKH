import { useState } from 'react'
import { Lock, X } from 'lucide-react'

function SuperuserPinModal({ onSuccess, onCancel }) {
  const [step, setStep] = useState('detect') // 'detect' | 'verify' | 'setup'
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDetectPinStatus = async () => {
    setLoading(true)
    try {
      const result = await window.api.settings.verifySuperuserPin('')
      // If we get "No superuser PIN set", then we need to setup
      if (result.message === 'No superuser PIN set') {
        setStep('setup')
      } else {
        setStep('verify')
      }
    } catch (err) {
      setError('Error checking PIN status')
    }
    setLoading(false)
  }

  const handleSetupPin = async () => {
    setError('')
    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 characters')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setLoading(true)
    try {
      await window.api.settings.setSuperuserPin(pin)
      setError('')
      onSuccess()
    } catch (err) {
      setError('Failed to set PIN')
    }
    setLoading(false)
  }

  const handleVerifyPin = async () => {
    setError('')
    if (!pin) {
      setError('Please enter PIN')
      return
    }

    setLoading(true)
    try {
      const result = await window.api.settings.verifySuperuserPin(pin)
      if (result.valid) {
        setError('')
        onSuccess()
      } else {
        setError('Invalid PIN')
      }
    } catch (err) {
      setError('Verification error')
    }
    setLoading(false)
  }

  const handleInitialize = () => {
    setPin('')
    setConfirmPin('')
    setError('')
    handleDetectPinStatus()
  }

  if (step === 'detect') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
          <h2 className="text-xl font-bold text-ink-300 mb-4">Menu Editor</h2>
          <button
            onClick={handleInitialize}
            disabled={loading}
            className="w-full bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-2 bg-cream-200 hover:bg-cream-300 text-ink-300 font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-ink-300 flex items-center gap-2">
            <Lock size={20} />
            {step === 'setup' ? 'Create Superuser PIN' : 'Enter Superuser PIN'}
          </h2>
          <button onClick={onCancel} className="text-cream-400 hover:text-ink-200">
            <X size={20} />
          </button>
        </div>

        {step === 'setup' && (
          <div className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength="8"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN (4-8 digits)"
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength="8"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Confirm PIN"
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={handleSetupPin}
              disabled={loading}
              className="w-full bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Setting...' : 'Set PIN'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength="8"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={handleVerifyPin}
              disabled={loading}
              className="w-full bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        )}

        <button
          onClick={onCancel}
          className="w-full mt-2 bg-cream-200 hover:bg-cream-300 text-ink-300 font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default SuperuserPinModal
