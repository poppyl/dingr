'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ActivitySignupProps {
  activityId: string
  eventId: string
  currentStatus: string | null
  signupId: string | null
  isFull: boolean
  requestedDuration?: string | null
  workingOn?: string | null
  assignedTime?: string | null
  schedulePublished?: boolean
  requestCount?: number
  maxSignups?: number | null
}

export default function ActivitySignup({ 
  activityId, 
  eventId, 
  currentStatus, 
  signupId,
  isFull,
  requestedDuration,
  workingOn,
  assignedTime,
  schedulePublished = false,
  requestCount = 0,
  maxSignups
}: ActivitySignupProps) {
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [duration, setDuration] = useState(requestedDuration || '')
  const [workingOnText, setWorkingOnText] = useState(workingOn || '')
  const [isEditing, setIsEditing] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSubmitRequest = async () => {
    if (!duration.trim()) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    if (signupId && isEditing) {
      // Update existing request
      await supabase
        .from('event_signups')
        .update({
          requested_duration: duration.trim(),
          working_on: workingOnText.trim() || null
        })
        .eq('id', signupId)
    } else {
      // Create new request
      await supabase
        .from('event_signups')
        .insert({
          event_id: eventId,
          activity_id: activityId,
          profile_id: user.id,
          status: 'requested',
          requested_duration: duration.trim(),
          working_on: workingOnText.trim() || null
        })
    }

    router.refresh()
    setLoading(false)
    setShowForm(false)
    setIsEditing(false)
  }

  const handleCancel = async () => {
    if (!signupId) return
    
    setLoading(true)
    await supabase
      .from('event_signups')
      .delete()
      .eq('id', signupId)
    router.refresh()
    setLoading(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setShowForm(true)
  }

  // Show assigned status
  if (currentStatus === 'assigned' && assignedTime) {
    const assignedDate = new Date(assignedTime)
    return (
      <div className="flex flex-col items-end gap-2">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
          Assigned: {assignedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="text-xs text-gray-500 text-right">
          {requestCount} requests · ~{maxSignups || '?'} slots
        </div>
      </div>
    )
  }

  // Show not assigned status
  if (currentStatus === 'not_assigned') {
    return (
      <div className="flex flex-col items-end gap-2">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
          Not scheduled this time
        </span>
        <div className="text-xs text-gray-500 text-right">
          {requestCount} requests · ~{maxSignups || '?'} slots
        </div>
      </div>
    )
  }

  // Show requested status
  if (currentStatus === 'requested') {
    return (
      <div className="flex flex-col items-end gap-2">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-700">
          Requested
        </span>
        <div className="text-xs text-gray-600 text-right max-w-[200px]">
          {requestedDuration && <div>Duration: {requestedDuration}</div>}
          {workingOn && <div className="mt-1">{workingOn}</div>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {showForm && (
          <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg w-[400px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How long are you requesting?
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 20 pitches, 15 mins"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-3"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Focus area (optional)
            </label>
            <textarea
              value={workingOnText}
              onChange={(e) => setWorkingOnText(e.target.value)}
              placeholder="What do you want to focus on?"
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmitRequest}
                disabled={loading || !duration.trim()}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setIsEditing(false)
                  setDuration(requestedDuration || '')
                  setWorkingOnText(workingOn || '')
                }}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="text-xs text-gray-500 text-right">
          {requestCount} requests · ~{maxSignups || '?'} slots
        </div>
      </div>
    )
  }

  // Show request form or button
  if (showForm) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="p-3 bg-white border border-gray-200 rounded-lg w-[400px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How long are you requesting?
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 20 pitches, 15 mins"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-3"
          />
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Focus area (optional)
          </label>
          <textarea
            value={workingOnText}
            onChange={(e) => setWorkingOnText(e.target.value)}
            placeholder="What do you want to focus on?"
            rows={2}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmitRequest}
              disabled={loading || !duration.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Submit Request'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setDuration('')
                setWorkingOnText('')
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 text-right">
          {requestCount} requests · ~{maxSignups || '?'} slots
        </div>
      </div>
    )
  }

  // Show request button (only if schedule not published)
  if (!schedulePublished) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={() => setShowForm(true)}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-50"
        >
          Request a Slot
        </button>
        <div className="text-xs text-gray-500 text-right">
          {requestCount} requests · ~{maxSignups || '?'} slots
        </div>
      </div>
    )
  }

  // Schedule published but no signup
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-xs text-gray-500 text-right">
        {requestCount} requests · ~{maxSignups || '?'} slots
      </div>
    </div>
  )
}
