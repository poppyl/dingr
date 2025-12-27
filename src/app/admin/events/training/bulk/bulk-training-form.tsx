'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const BOBBY_THOMPSON_FIELD = 'Bobby Thompson Field, 17 Warriston Cres, Edinburgh EH3 5LB'

interface Team {
  id: string
  name: string
}

interface BulkTrainingFormProps {
  teams: Team[]
  userId: string
}

type TrainingPattern = 
  | 'winter-training'
  | 'spring-training'
  | 'season-training'

interface GeneratedEvent {
  title: string
  date: string
  startTime: string
  endTime: string
  dayOfWeek: string
}

export default function BulkTrainingForm({ teams, userId }: BulkTrainingFormProps) {
  const [pattern, setPattern] = useState<TrainingPattern | ''>('')
  const [year, setYear] = useState(2026)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<GeneratedEvent[]>([])
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const generateEvents = (): GeneratedEvent[] => {
    const events: GeneratedEvent[] = []
    
    const getNextDayOfWeek = (date: Date, dayOfWeek: number): Date => {
      const result = new Date(date)
      result.setDate(result.getDate() + (dayOfWeek - result.getDay() + 7) % 7)
      return result
    }

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

    if (pattern === 'winter-training') {
      const startDate = getNextDayOfWeek(new Date(year, 0, 1), 0)
      const endDate = new Date(year, 1, 28)
      
      let current = startDate
      while (current <= endDate) {
        events.push({
          title: 'Winter Training',
          date: formatDate(current),
          startTime: '12:00',
          endTime: '15:00',
          dayOfWeek: getDayName(current),
        })
        current = addDays(current, 7)
      }
    }

    if (pattern === 'spring-training') {
      const startDate = new Date(year, 2, 1)
      const endDate = new Date(year, 2, 31)
      
      let current = startDate
      while (current <= endDate) {
        if (current.getDay() === 0) {
          events.push({
            title: 'Spring Training',
            date: formatDate(current),
            startTime: '12:00',
            endTime: '15:00',
            dayOfWeek: getDayName(current),
          })
        } else if (current.getDay() === 3) {
          events.push({
            title: 'Spring Training',
            date: formatDate(current),
            startTime: '17:00',
            endTime: '20:00',
            dayOfWeek: getDayName(current),
          })
        }
        current = addDays(current, 1)
      }
    }

    if (pattern === 'season-training') {
      const startDate = new Date(year, 3, 1)
      const endDate = new Date(year, 8, 30)
      
      let current = startDate
      while (current <= endDate) {
        if (current.getDay() === 3) {
          events.push({
            title: 'Training',
            date: formatDate(current),
            startTime: '17:00',
            endTime: '20:00',
            dayOfWeek: getDayName(current),
          })
        } else if (current.getDay() === 5) {
          events.push({
            title: 'Training',
            date: formatDate(current),
            startTime: '17:00',
            endTime: '20:00',
            dayOfWeek: getDayName(current),
          })
        }
        current = addDays(current, 1)
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date))
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
      type: 'training',
      title: event.title,
      start_time: `${event.date}T${event.startTime}:00`,
      end_time: `${event.date}T${event.endTime}:00`,
      location: BOBBY_THOMPSON_FIELD,
      team_id: teams[0]?.id,
      visibility: 'all',
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

  const patternDescriptions: Record<TrainingPattern, string> = {
    'winter-training': 'Sundays 12pm-3pm, January through February',
    'spring-training': 'Wednesdays 5pm-8pm + Sundays 12pm-3pm, March',
    'season-training': 'Wednesdays 5pm-8pm + Fridays 5pm-8pm, April through September',
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
          Training sessions created successfully!{' '}
          <button onClick={() => router.push('/schedule')} className="underline">
            View schedule
          </button>
        </div>
      )}

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

      {/* Schedule pattern */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Training Schedule
        </label>
        <div className="space-y-2">
          {(['winter-training', 'spring-training', 'season-training'] as TrainingPattern[]).map((p) => (
            <label key={p} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="pattern"
                value={p}
                checked={pattern === p}
                onChange={(e) => setPattern(e.target.value as TrainingPattern)}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900 capitalize">
                  {p.replace('-', ' ')}
                </div>
                <div className="text-sm text-gray-500">
                  {patternDescriptions[p]}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Preview button */}
      <button
        onClick={handlePreview}
        disabled={!pattern}
        className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Preview Sessions
      </button>

      {/* Preview list */}
      {preview.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <span className="font-medium">{preview.length} training sessions</span> will be created
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Day</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Title</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((event, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{event.date}</td>
                    <td className="px-4 py-2">{event.dayOfWeek}</td>
                    <td className="px-4 py-2">{event.startTime} - {event.endTime}</td>
                    <td className="px-4 py-2">{event.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-gray-50">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : `Create ${preview.length} Training Sessions`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
