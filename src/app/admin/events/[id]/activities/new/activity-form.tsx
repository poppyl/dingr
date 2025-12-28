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
  eventStartTime?: string
  eventEndTime?: string
}

export default function ActivityForm({ eventId, leaders, eventStartTime, eventEndTime }: ActivityFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxSignups, setMaxSignups] = useState<number | ''>('')
  const [ledBy, setLedBy] = useState('')
  const [startTime, setStartTime] = useState(() => {
    if (eventStartTime) {
      const date = new Date(eventStartTime)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }
    return ''
  })
  const [endTime, setEndTime] = useState(() => {
    if (eventEndTime) {
      const date = new Date(eventEndTime)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }
    return ''
  })
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number | ''>(20)
  const [requestDeadline, setRequestDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Convert times to ISO strings if provided
    let startTimeISO = null
    let endTimeISO = null
    if (eventStartTime && startTime) {
      const eventDate = new Date(eventStartTime)
      const [hours, minutes] = startTime.split(':')
      eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      startTimeISO = eventDate.toISOString()
    }
    if (eventEndTime && endTime) {
      const eventDate = new Date(eventEndTime)
      const [hours, minutes] = endTime.split(':')
      eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      endTimeISO = eventDate.toISOString()
    }

    const { error } = await supabase
      .from('event_activities')
      .insert({
        event_id: eventId,
        name,
        description: description || null,
        max_signups: maxSignups || null,
        led_by: ledBy || null,
        start_time: startTimeISO,
        end_time: endTimeISO,
        slot_duration_minutes: slotDurationMinutes || null,
        request_deadline: requestDeadline || null,
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

      {/* Schedule Settings */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Schedule Settings</h3>
        
        {/* Start and End Time */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
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

        {/* Slot Duration */}
        <div className="mb-4">
          <label htmlFor="slotDuration" className="block text-sm font-medium text-gray-700 mb-1">
            Slot Duration (minutes)
          </label>
          <input
            id="slotDuration"
            type="number"
            min="5"
            step="5"
            value={slotDurationMinutes}
            onChange={(e) => setSlotDurationMinutes(e.target.value ? parseInt(e.target.value) : '')}
            placeholder="20"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Duration of each time slot for this activity.
          </p>
        </div>

        {/* Request Deadline */}
        <div>
          <label htmlFor="requestDeadline" className="block text-sm font-medium text-gray-700 mb-1">
            Request Deadline (optional)
          </label>
          <input
            id="requestDeadline"
            type="datetime-local"
            value={requestDeadline}
            onChange={(e) => setRequestDeadline(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Deadline for players to submit requests (optional).
          </p>
        </div>
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
