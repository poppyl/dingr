'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Request {
  signup_id: string
  player_name: string
  jersey_number: number | null
  requested_duration: string
  working_on: string
  status: string
  assigned_time: string | null
}

interface ScheduleBuilderProps {
  activity: {
    id: string
    name: string
    start_time: string
    end_time: string
    slot_duration_minutes: number
    schedule_published: boolean
  }
  requests: Request[]
  eventId: string
}

export default function ScheduleBuilder({ activity, requests, eventId }: ScheduleBuilderProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const pendingRequests = requests.filter(r => r.status === 'requested')
  const assignedRequests = requests.filter(r => r.status === 'assigned')
    .sort((a, b) => {
      if (!a.assigned_time || !b.assigned_time) return 0
      return new Date(a.assigned_time).getTime() - new Date(b.assigned_time).getTime()
    })

  const handleAssign = async (signupId: string, time: Date) => {
    setLoading(true)
    await supabase
      .from('event_signups')
      .update({ 
        status: 'assigned', 
        assigned_time: time.toISOString() 
      })
      .eq('id', signupId)
    router.refresh()
    setLoading(false)
  }

  const handleUnassign = async (signupId: string) => {
    setLoading(true)
    await supabase
      .from('event_signups')
      .update({ 
        status: 'requested', 
        assigned_time: null 
      })
      .eq('id', signupId)
    router.refresh()
    setLoading(false)
  }

  const handleDecline = async (signupId: string, notes: string) => {
    setLoading(true)
    await supabase
      .from('event_signups')
      .update({ 
        status: 'not_assigned', 
        coach_notes: notes 
      })
      .eq('id', signupId)
    router.refresh()
    setLoading(false)
  }

  const handlePublish = async () => {
    setLoading(true)
    await supabase
      .from('event_activities')
      .update({ schedule_published: true })
      .eq('id', activity.id)
    router.refresh()
    setLoading(false)
  }

  // Generate time slots based on activity start/end and slot duration
  const generateSlots = () => {
    if (!activity.start_time || !activity.end_time || !activity.slot_duration_minutes) {
      return []
    }
    const slots = []
    const start = new Date(activity.start_time)
    const end = new Date(activity.end_time)
    let current = new Date(start)
    
    while (current < end) {
      slots.push(new Date(current))
      current = new Date(current.getTime() + activity.slot_duration_minutes * 60000)
    }
    return slots
  }

  const slots = generateSlots()

  if (!activity.start_time || !activity.end_time || !activity.slot_duration_minutes) {
    return (
      <div className="bg-white rounded-xl border p-4">
        <p className="text-gray-600">
          This activity needs schedule settings configured (start time, end time, and slot duration).
          Please edit the activity to add these settings.
        </p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left: Schedule Timeline */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-semibold mb-4">Schedule</h2>
        <div className="space-y-2">
          {slots.map((slot) => {
            const assigned = assignedRequests.find(r => 
              r.assigned_time && new Date(r.assigned_time).getTime() === slot.getTime()
            )
            return (
              <div 
                key={slot.toISOString()} 
                className={`p-3 rounded-lg border ${assigned ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
              >
                <div className="text-sm font-medium">
                  {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {assigned ? (
                  <div className="mt-1">
                    <span className="font-medium">{assigned.player_name}</span>
                    {assigned.jersey_number && <span className="text-gray-500"> #{assigned.jersey_number}</span>}
                    <p className="text-sm text-gray-600">{assigned.working_on}</p>
                    <button 
                      onClick={() => handleUnassign(assigned.signup_id)}
                      disabled={loading}
                      className="text-xs text-red-600 hover:underline mt-1 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">Empty slot</div>
                )}
              </div>
            )
          })}
        </div>
        
        {!activity.schedule_published && (
          <button
            onClick={handlePublish}
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Publish Schedule
          </button>
        )}
        {activity.schedule_published && (
          <div className="mt-4 text-center text-green-600 font-medium">
            ✓ Schedule Published
          </div>
        )}
      </div>

      {/* Right: Request Queue */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-semibold mb-4">Requests ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending requests</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.signup_id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="font-medium">
                  {request.player_name}
                  {request.jersey_number && <span className="text-gray-500"> #{request.jersey_number}</span>}
                </div>
                <p className="text-sm text-gray-600">Duration: {request.requested_duration}</p>
                <p className="text-sm text-gray-600">{request.working_on}</p>
                <div className="flex gap-2 mt-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssign(request.signup_id, new Date(e.target.value))
                      }
                    }}
                    disabled={loading}
                    className="text-sm border rounded px-2 py-1 disabled:opacity-50"
                    defaultValue=""
                  >
                    <option value="">Assign to slot...</option>
                    {slots
                      .filter(s => !assignedRequests.some(r => 
                        r.assigned_time && new Date(r.assigned_time).getTime() === s.getTime()
                      ))
                      .map(slot => (
                        <option key={slot.toISOString()} value={slot.toISOString()}>
                          {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </option>
                      ))
                    }
                  </select>
                  <button
                    onClick={() => handleDecline(request.signup_id, '')}
                    disabled={loading}
                    className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Can&apos;t accommodate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

