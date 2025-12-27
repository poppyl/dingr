'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const BOBBY_THOMPSON_FIELD = 'Bobby Thompson Field, 17 Warriston Cres, Edinburgh EH3 5LB'

interface Team {
  id: string
  name: string
}

interface Opponent {
  id: string
  name: string
  location: string | null
}

interface Umpire {
  id: string
  name: string
}

interface GameFormProps {
  teams: Team[]
  opponents: Opponent[]
  umpires: Umpire[]
  userId: string
}

export default function GameForm({ teams, opponents, umpires, userId }: GameFormProps) {
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [teamId, setTeamId] = useState(teams[0]?.id || '')
  const [opponentId, setOpponentId] = useState('')
  const [isHomeGame, setIsHomeGame] = useState(true)
  const [umpire1Id, setUmpire1Id] = useState('')
  const [umpire2Id, setUmpire2Id] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const selectedTeam = teams.find(t => t.id === teamId)
  const selectedOpponent = opponents.find(o => o.id === opponentId)
  const awayLocation = selectedOpponent?.location || 'TBD'

  // Generate title based on home/away
  const generateTitle = () => {
    const homeTeam = isHomeGame ? selectedTeam?.name : selectedOpponent?.name
    const awayTeam = isHomeGame ? selectedOpponent?.name : selectedTeam?.name
    
    if (homeTeam && awayTeam) {
      return `${homeTeam} vs ${awayTeam}`
    }
    return 'Game'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const startDateTime = `${date}T${startTime}:00`

    const eventData = {
      type: 'game',
      title: generateTitle(),
      description: description || null,
      location: isHomeGame ? BOBBY_THOMPSON_FIELD : awayLocation,
      start_time: startDateTime,
      end_time: null,
      team_id: teamId,
      opponent_team_id: opponentId || null,
      is_home_game: isHomeGame,
      visibility: 'team',
      umpire_1_id: umpire1Id || null,
      umpire_2_id: umpire2Id || null,
      created_by: userId,
    }

    const { error } = await supabase
      .from('events')
      .insert(eventData)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/schedule')
    router.refresh()
  }

  // Filter out selected umpire from other dropdown
  const availableUmpires1 = umpires.filter(u => u.id !== umpire2Id)
  const availableUmpires2 = umpires.filter(u => u.id !== umpire1Id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Team */}
      <div>
        <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
          Team
        </label>
        <select
          id="team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Opponent */}
      <div>
        <label htmlFor="opponent" className="block text-sm font-medium text-gray-700 mb-1">
          Opponent
        </label>
        <select
          id="opponent"
          value={opponentId}
          onChange={(e) => setOpponentId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">Select opponent...</option>
          {opponents.map((opponent) => (
            <option key={opponent.id} value={opponent.id}>
              {opponent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Home/Away */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Home or Away</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="homeAway"
              checked={isHomeGame}
              onChange={() => setIsHomeGame(true)}
              className="text-blue-600"
            />
            <span>Home</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="homeAway"
              checked={!isHomeGame}
              onChange={() => setIsHomeGame(false)}
              className="text-blue-600"
            />
            <span>Away</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {isHomeGame ? 'Bobby Thompson Field' : awayLocation}
        </p>
      </div>

      {/* Preview title */}
      {selectedTeam && selectedOpponent && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-500">Game title:</p>
          <p className="font-medium text-gray-900">{generateTitle()}</p>
        </div>
      )}

      {/* Date and time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Umpires */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Umpires <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <select
              value={umpire1Id}
              onChange={(e) => setUmpire1Id(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Umpire 1...</option>
              {availableUmpires1.map((umpire) => (
                <option key={umpire.id} value={umpire.id}>
                  {umpire.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={umpire2Id}
              onChange={(e) => setUmpire2Id(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Umpire 2...</option>
              {availableUmpires2.map((umpire) => (
                <option key={umpire.id} value={umpire.id}>
                  {umpire.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Any additional details..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !date || !startTime || !teamId || !opponentId}
        className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Game'}
      </button>
    </form>
  )
}
