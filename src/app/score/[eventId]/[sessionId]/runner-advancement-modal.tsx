'use client'

import { useState, useEffect } from 'react'

interface Runner {
  id: string
  name: string
  fromBase: 'first' | 'second' | 'third'
  isOpponent: boolean
}

interface RunnerAdvancementModalProps {
  isOpen: boolean
  runners: Runner[]
  batterName: string
  outcome: string
  onComplete: (movements: { runnerId: string, toBase: string }[], runsScored: number) => void
  onClose: () => void
}

const baseOrder = ['first', 'second', 'third', 'home']

export default function RunnerAdvancementModal({
  isOpen,
  runners,
  batterName,
  outcome,
  onComplete,
  onClose
}: RunnerAdvancementModalProps) {
  const [movements, setMovements] = useState<Record<string, string>>({})

  // Pre-fill logical defaults based on outcome
  useEffect(() => {
    if (!isOpen) return
    
    const defaults: Record<string, string> = {}
    
    // Batter placement based on outcome
    switch (outcome) {
      case 'single':
        defaults['batter'] = 'first'
        break
      case 'double':
        defaults['batter'] = 'second'
        break
      case 'triple':
        defaults['batter'] = 'third'
        break
      case 'home_run':
        defaults['batter'] = 'home'
        // All runners score on HR
        runners.forEach(r => {
          defaults[r.id] = 'home'
        })
        break
      case 'walk':
      case 'hit_by_pitch':
        defaults['batter'] = 'first'
        // Force runners to advance
        if (runners.some(r => r.fromBase === 'first')) {
          const firstRunner = runners.find(r => r.fromBase === 'first')
          if (firstRunner) defaults[firstRunner.id] = 'second'
        }
        break
      case 'out':
        defaults['batter'] = 'out'
        break
    }
    
    setMovements(defaults)
  }, [isOpen, outcome, runners])

  if (!isOpen) return null

  const handleMovement = (id: string, toBase: string) => {
    setMovements(prev => ({ ...prev, [id]: toBase }))
  }

  const handleConfirm = () => {
    const movementList = Object.entries(movements)
      .filter(([_, toBase]) => toBase) // Only include set movements
      .map(([runnerId, toBase]) => ({ runnerId, toBase }))
    
    // Count runs scored (movements to home, excluding outs)
    const runsScored = Object.values(movements).filter(base => base === 'home').length
    
    onComplete(movementList, runsScored)
    setMovements({})
  }

  const getBaseOptions = (fromBase: string | null) => {
    if (fromBase === null) {
      // Batter
      return ['first', 'second', 'third', 'home', 'out']
    }
    
    const fromIndex = baseOrder.indexOf(fromBase)
    // Can advance to any base ahead, or be out
    return [...baseOrder.slice(fromIndex + 1), 'out']
  }

  const getBaseLabel = (base: string) => {
    switch (base) {
      case 'first': return '1st'
      case 'second': return '2nd'
      case 'third': return '3rd'
      case 'home': return '🏠'
      case 'out': return 'OUT'
      default: return base
    }
  }

  const getButtonStyle = (base: string, selected: boolean) => {
    if (!selected) return 'bg-gray-100 text-gray-700'
    if (base === 'out') return 'bg-red-500 text-white'
    if (base === 'home') return 'bg-green-500 text-white'
    return 'bg-blue-500 text-white'
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Runner Advancement</h2>
          <p className="text-sm text-gray-500">{batterName} — {outcome}</p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-auto max-h-[50vh]">
          {/* Batter */}
          <div className="p-3 bg-blue-50 rounded-xl">
            <div className="text-sm text-gray-500 mb-2">Batter</div>
            <div className="flex items-center justify-between">
              <span className="font-medium">{batterName}</span>
              <div className="flex gap-1">
                {getBaseOptions(null).map(base => (
                  <button
                    key={base}
                    onClick={() => handleMovement('batter', base)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${getButtonStyle(base, movements['batter'] === base)}`}
                  >
                    {getBaseLabel(base)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Runners */}
          {runners.map(runner => (
            <div key={runner.id} className="p-3 bg-gray-50 rounded-xl">
              <div className="text-sm text-gray-500 mb-2">
                On {runner.fromBase}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{runner.name}</span>
                <div className="flex gap-1">
                  {getBaseOptions(runner.fromBase).map(base => (
                    <button
                      key={base}
                      onClick={() => handleMovement(runner.id, base)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                        ${getButtonStyle(base, movements[runner.id] === base)}`}
                    >
                      {getBaseLabel(base)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {runners.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No runners on base
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 space-y-2">
          {/* Runs summary */}
          {Object.values(movements).filter(b => b === 'home').length > 0 && (
            <p className="text-center text-green-600 font-medium">
              {Object.values(movements).filter(b => b === 'home').length} run(s) scored!
            </p>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!movements['batter']}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl 
                hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
