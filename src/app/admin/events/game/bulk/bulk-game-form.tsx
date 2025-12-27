'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const BOBBY_THOMPSON_FIELD = 'Bobby Thompson Field, 17 Warriston Cres, Edinburgh EH3 5LB'

interface Team {
  id: string
  name: string
}

interface BulkGameFormProps {
  teams: Team[]
  userId: string
}

interface GeneratedEvent {
  title: string
  date: string
  startTime: string
  dayOfWeek: string
  is_home_game: boolean
}

export default function BulkGameForm({ teams, userId }: BulkGameFormProps) {
  const [teamId, setTeamId] = useState(teams[0]?.id || '')
  const [year, setYear] = useState(2026)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<GeneratedEvent[]>([])
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const selectedTeam = teams.find(t => t.id === teamId)

  const generateEvents = (): GeneratedEvent[] => {
    const events: GeneratedEvent[] = []
    
    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date)
      result.setDate(result.getDate() + days)
      return result
    }

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]
    }

    const getDayName = (date: Date): string => {
      return date.toLocaleDateString('en-GB', { weekday: 'long' })
    }

    // Find last Sunday of March
    const lastSundayMarch = new Date(year, 2, 31)
    while (lastSundayMarch.getDay() !== 0) {
      lastSundayMarch.setDate(lastSundayMarch.getDate() - 1)
    }
    
    const endDate = new Date(year, 8, 30) // End of September
    
    let current = lastSundayMarch
    let weekNum = 1
    while (current <= endDate) {
      const isHome = weekNum % 2 === 1
      events.push({
        title: `Game Week ${weekNum}`, // Placeholder - will be updated when opponent is set
        date: formatDate(current),
        startTime: '12:00',
        dayOfWeek: getDayName(current),
        is_home_game: isHome,
      })
      current = addDays(current, 7)
      weekNum++
    }

    return events
  }

  const handlePreview = () => {
    setPreview(generateEvents())
    setError(null)
    setSuccess(false)
  }

  const handleCreate = async () => {
    setLoading(true)
    setError(null)

    const events = generateEvents()
    
    const eventData = events.map(event => ({
      type: 'game',
      title: event.title,
      start_time: `${event.date}T${event.startTime}:00`,
      end_time: null,
      location: event.is_home_game ? BOBBY_THOMPSON_FIELD : 'TBD',
      team_id: teamId,
      is_home_game: event.is_home_game,
      visibility: 'team',
      created_by: userId,
    }))

    const { error } = await supabase
      .from('events')
      .insert(eventData)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setPreview([])
    setLoading(false)
  }

  // Generate year options from 2026 onwards (next 5 years)
  const currentYear = new Date().getFullYear()
  const startYear = Math.max(2026, currentYear)
  const yearOptions = Array.from({ length: 5 }, (_, i) => startYear + i)

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
          Games created successfully!{' '}
          <button onClick={() => router.push('/schedule')} className="underline">
            View schedule
          </button>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Year */}
      <div>
        <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
          Year
        </label>
        <select
          id="year"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Info box */}
      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        <strong>Schedule:</strong> Sundays from the last weekend of March through September. 
        Games alternate home and away. You can set opponents and umpires later by editing each game.
      </div>

      {/* Preview button */}
      <button
        onClick={handlePreview}
        disabled={!teamId}
        className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Preview Games
      </button>

      {/* Preview list */}
      {preview.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <span className="font-medium">{preview.length} games</span> for {selectedTeam?.name}
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Day</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Home/Away</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((event, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{event.date}</td>
                    <td className="px-4 py-2">{event.dayOfWeek}</td>
                    <td className="px-4 py-2">{event.startTime}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        event.is_home_game 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {event.is_home_game ? 'Home' : 'Away'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-gray-50">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : `Create ${preview.length} Games`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
