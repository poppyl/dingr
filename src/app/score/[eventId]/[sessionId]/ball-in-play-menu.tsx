'use client'

import { useState } from 'react'

interface BallInPlayMenuProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (hitType: string, outcome: string) => void
}

const hitTypes = [
  { id: 'ground_ball', label: 'Ground Ball', icon: '⚾↘️' },
  { id: 'hard_ground_ball', label: 'Hard Grounder', icon: '⚾💨' },
  { id: 'line_drive', label: 'Line Drive', icon: '⚾➡️' },
  { id: 'fly_ball', label: 'Fly Ball', icon: '⚾↗️' },
  { id: 'pop_fly', label: 'Pop Up', icon: '⚾⬆️' },
  { id: 'bunt', label: 'Bunt', icon: '⚾·' },
]

const outcomes = [
  { id: 'out', label: 'Out', color: 'red', description: 'Batter is out' },
  { id: 'single', label: 'Single', color: 'green', description: 'Runner reaches 1st' },
  { id: 'double', label: 'Double', color: 'green', description: 'Runner reaches 2nd' },
  { id: 'triple', label: 'Triple', color: 'green', description: 'Runner reaches 3rd' },
  { id: 'home_run', label: 'Home Run', color: 'gold', description: 'Runner scores' },
  { id: 'error', label: 'Error', color: 'yellow', description: 'Fielder error' },
  { id: 'fielders_choice', label: "Fielder's Choice", color: 'gray', description: 'Runner out elsewhere' },
]

export default function BallInPlayMenu({ isOpen, onClose, onComplete }: BallInPlayMenuProps) {
  const [step, setStep] = useState<'type' | 'outcome'>('type')
  const [selectedType, setSelectedType] = useState<string | null>(null)

  if (!isOpen) return null

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    setStep('outcome')
  }

  const handleOutcomeSelect = (outcome: string) => {
    if (selectedType) {
      onComplete(selectedType, outcome)
      // Reset for next use
      setStep('type')
      setSelectedType(null)
    }
  }

  const handleBack = () => {
    setStep('type')
    setSelectedType(null)
  }

  const handleClose = () => {
    setStep('type')
    setSelectedType(null)
    onClose()
  }

  const getOutcomeStyle = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
      case 'green': return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
      case 'gold': return 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
      case 'yellow': return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
      default: return 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div 
        className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          {step === 'outcome' ? (
            <button 
              onClick={handleBack}
              className="text-blue-600 font-medium"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          <h2 className="font-semibold text-lg">
            {step === 'type' ? 'Ball In Play' : hitTypes.find(t => t.id === selectedType)?.label}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto">
          {step === 'type' ? (
            <div className="grid grid-cols-2 gap-3">
              {hitTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200 
                    hover:bg-gray-100 hover:border-gray-300
                    flex flex-col items-center gap-2 transition-colors"
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium text-gray-900">{type.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {outcomes.map(outcome => (
                <button
                  key={outcome.id}
                  onClick={() => handleOutcomeSelect(outcome.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-colors
                    ${getOutcomeStyle(outcome.color)}`}
                >
                  <div className="font-semibold">{outcome.label}</div>
                  <div className="text-sm opacity-75">{outcome.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
