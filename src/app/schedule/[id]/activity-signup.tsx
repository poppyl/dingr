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
}

export default function ActivitySignup({ 
  activityId, 
  eventId, 
  currentStatus, 
  signupId,
  isFull 
}: ActivitySignupProps) {
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Determine status based on capacity
    const status = isFull ? 'waitlisted' : 'confirmed'

    if (signupId) {
      // Already signed up - this shouldn't happen, but handle it
      await supabase
        .from('event_signups')
        .update({ status })
        .eq('id', signupId)
    } else {
      await supabase
        .from('event_signups')
        .insert({
          event_id: eventId,
          activity_id: activityId,
          profile_id: user.id,
          status
        })
    }

    router.refresh()
    setLoading(false)
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

  if (currentStatus) {
    return (
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
          currentStatus === 'confirmed' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {currentStatus === 'confirmed' ? 'Signed up' : 'Waitlisted'}
        </span>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
        >
          {loading ? '...' : 'Cancel'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleSignup}
      disabled={loading}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
        isFull
          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
      }`}
    >
      {loading ? '...' : isFull ? 'Join waitlist' : 'Sign up'}
    </button>
  )
}
