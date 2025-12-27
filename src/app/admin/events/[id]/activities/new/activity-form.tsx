'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Leader {
  id: string
  full_name: string
  role: string
}

interface ActivityFormProps {
  eventId: string
  leaders: Leader[]
}

export default function ActivityForm({ eventId, leaders }: ActivityFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxSignups, setMaxSignups] = useState<number | ''>('')
  const [ledBy, setLedBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('event_activities')
      .insert({
        event_id: eventId,
        name,
        description: description || null,
        max_signups: maxSignups || null,
        led_by: ledBy || null,
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/schedule/${eventId}`)
    router.refresh()
  }

  const commonActivities = [
    'Batting Practice',
    'Fielding Drills',
    'Pitching Practice',
    'Base Running',
    'Catching Practice',
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Quick select common activities */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-2">
          {commonActivities.map((activity) => (
            <button
              key={activity}
              type="button"
              onClick={() => setName(activity)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                name === activity
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {activity}
            </button>
          ))}
        </div>
      </div>

      {/* Activity name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Activity Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Batting Practice"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Brief description of the activity..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
      </div>

      {/* Led by */}
      <div>
        <label htmlFor="ledBy" className="block text-sm font-medium text-gray-700 mb-1">
          Led By (optional)
        </label>
        <select
          id="ledBy"
          value={ledBy}
          onChange={(e) => setLedBy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">Select a leader...</option>
          {leaders.map((leader) => (
            <option key={leader.id} value={leader.id}>
              {leader.full_name} ({leader.role})
            </option>
          ))}
        </select>
      </div>

      {/* Max signups */}
      <div>
        <label htmlFor="maxSignups" className="block text-sm font-medium text-gray-700 mb-1">
          Maximum Signups (optional)
        </label>
        <input
          id="maxSignups"
          type="number"
          min="1"
          value={maxSignups}
          onChange={(e) => setMaxSignups(e.target.value ? parseInt(e.target.value) : '')}
          placeholder="Leave blank for unlimited"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          If set, players over this limit will be added to a waitlist.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !name}
        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Activity'}
      </button>
    </form>
  )
}
