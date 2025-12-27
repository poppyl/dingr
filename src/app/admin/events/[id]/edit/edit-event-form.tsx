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

interface Event {
  id: string
  type: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  status: string
  is_home_game: boolean | null
  visibility: string
  team_id: string
  opponent_team_id: string | null
  umpire_1_id: string | null
  umpire_2_id: string | null
}

interface EditEventFormProps {
  event: Event
  teams: Team[]
  opponents: Opponent[]
  umpires: Umpire[]
}

export default function EditEventForm({ event, teams, opponents, umpires }: EditEventFormProps) {
  const startDateTime = new Date(event.start_time)
  
  const [description, setDescription] = useState(event.description || '')
  const [date, setDate] = useState(startDateTime.toISOString().split('T')[0])
  const [startTime, setStartTime] = useState(
    startDateTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
  const [teamId, setTeamId] = useState(event.team_id)
  const [opponentId, setOpponentId] = useState(event.opponent_team_id || '')
  const [isHomeGame, setIsHomeGame] = useState(event.is_home_game ?? true)
  const [umpire1Id, setUmpire1Id] = useState(event.umpire_1_id || '')
  const [umpire2Id, setUmpire2Id] = useState(event.umpire_2_id || '')
  const [status, setStatus] = useState(event.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const selectedTeam = teams.find(t => t.id === teamId)
  const selectedOpponent = opponents.find(o => o.id === opponentId)
  const awayLocation = selectedOpponent?.location || 'TBD'

  // Generate title based on home/away
  const generateTitle = () => {
    if (event.type !== 'game') return event.title
    
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

    const eventData: any = {
      description: description || null,
      start_time: startDateTime,
      status,
    }

    if (event.type === 'game') {
      eventData.title = generateTitle()
      eventData.location = isHomeGame ? BOBBY_THOMPSON_FIELD : awayLocation
      eventData.team_id = teamId
      eventData.opponent_team_id = opponentId || null
      eventData.is_home_game = isHomeGame
      eventData.umpire_1_id = umpire1Id || null
      eventData.umpire_2_id = umpire2Id || null
    }

    const { error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', event.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/schedule/${event.id}`)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) {
      return
    }

    setLoading(true)

    // Delete signups first
    await supabase
      .from('event_signups')
      .delete()
      .eq('event_id', event.id)

    // Delete activities
    await supabase
      .from('event_activities')
      .delete()
      .eq('event_id', event.id)

    // Delete event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id)

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

      {/* Event type indicator */}
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
          event.type === 'game' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          {event.type === 'game' ? 'Game' : 'Training'}
        </span>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Game-specific fields */}
      {event.type === 'game' && (
        <>
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
        </>
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

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-3 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </form>
  )
}
