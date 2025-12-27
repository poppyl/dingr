'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface BlackoutDate {
  id: string
  date: string
  reason: string | null
}

interface BlackoutDatesProps {
  initialDates: BlackoutDate[]
  userId: string
}

export default function BlackoutDates({ initialDates, userId }: BlackoutDatesProps) {
  const [dates, setDates] = useState<BlackoutDate[]>(initialDates)
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDate) return

    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('blackout_dates')
      .insert({
        profile_id: userId,
        date: newDate,
        reason: newReason || null,
      })
      .select('id, date, reason')
      .single()

    if (error) {
      if (error.code === '23505') {
        setError('You already have this date marked as unavailable.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    setDates([...dates, data].sort((a, b) => a.date.localeCompare(b.date)))
    setNewDate('')
    setNewReason('')
    setLoading(false)
  }

  const handleRemove = async (id: string) => {
    const { error } = await supabase
      .from('blackout_dates')
      .delete()
      .eq('id', id)

    if (!error) {
      setDates(dates.filter(d => d.id !== id))
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Add new date */}
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <input
              id="reason"
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g., Holiday, Work commitment"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !newDate}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Unavailable Date'}
        </button>
      </form>

      {/* List of blackout dates */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Your unavailable dates
        </h3>
        {dates.length === 0 ? (
          <p className="text-gray-500 text-sm">No dates marked as unavailable.</p>
        ) : (
          <div className="space-y-2">
            {dates.map((date) => (
              <div 
                key={date.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {formatDate(date.date)}
                  </div>
                  {date.reason && (
                    <div className="text-sm text-gray-500">{date.reason}</div>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(date.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
