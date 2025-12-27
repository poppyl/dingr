'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const BOBBY_THOMPSON_FIELD = 'Bobby Thompson Field, 17 Warriston Cres, Edinburgh EH3 5LB'

interface Team {
  id: string
  name: string
}

interface TrainingFormProps {
  teams: Team[]
  userId: string
}

export default function TrainingForm({ teams, userId }: TrainingFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isClosedPractice, setIsClosedPractice] = useState(false)
  const [teamId, setTeamId] = useState(teams[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const startDateTime = `${date}T${startTime}:00`
    const endDateTime = endTime ? `${date}T${endTime}:00` : null

    const eventData = {
      type: 'training',
      title: title || 'Training',
      description: description || null,
      location: BOBBY_THOMPSON_FIELD,
      start_time: startDateTime,
      end_time: endDateTime,
      team_id: isClosedPractice ? teamId : teams[0]?.id,
      visibility: isClosedPractice ? 'team' : 'all',
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        Training sessions are at Bobby Thompson Field and open to all Edinburgh teams by default.
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Winter Training, Spring Training"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Date and time */}
      <div className="grid grid-cols-3 gap-4">
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
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
            End Time
          </label>
          <input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Closed practice toggle */}
      <div>
        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={isClosedPractice}
            onChange={(e) => setIsClosedPractice(e.target.checked)}
            className="text-blue-600 rounded"
          />
          <div>
            <div className="font-medium text-gray-900">Closed practice</div>
            <div className="text-sm text-gray-500">Only visible to a specific team</div>
          </div>
        </label>
      </div>

      {/* Team selector (only for closed practices) */}
      {isClosedPractice && (
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
      )}

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Any additional details..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !date || !startTime}
        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Training Session'}
      </button>
    </form>
  )
}
