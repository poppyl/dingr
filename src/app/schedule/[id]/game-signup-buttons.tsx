'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface GameSignupButtonsProps {
  eventId: string
  eventDate: string
  currentStatus: string | null
  signupId: string | null
  hasBlackoutDate: boolean
  blackoutDateId: string | null
}

export default function GameSignupButtons({ 
  eventId, 
  eventDate,
  currentStatus, 
  signupId,
  hasBlackoutDate,
  blackoutDateId
}: GameSignupButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingAction, setPendingAction] = useState<'confirmed' | 'interested' | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (status: 'confirmed' | 'interested' | 'declined') => {
    // If trying to sign up (not decline) and there's a blackout date, show confirmation
    if ((status === 'confirmed' || status === 'interested') && hasBlackoutDate && !showConfirmation) {
      setPendingAction(status)
      setShowConfirmation(true)
      return
    }

    setLoading(true)
    setShowConfirmation(false)
    setPendingAction(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (status === 'declined') {
      // If declining, add to blackout dates (if not already there)
      if (!hasBlackoutDate) {
        await supabase
          .from('blackout_dates')
          .insert({
            profile_id: user.id,
            date: eventDate,
            reason: 'Declined game'
          })
      }

      // Update or create signup with declined status
      if (signupId) {
        await supabase
          .from('event_signups')
          .update({ status: 'declined' })
          .eq('id', signupId)
      } else {
        await supabase
          .from('event_signups')
          .insert({
            event_id: eventId,
            profile_id: user.id,
            status: 'declined'
          })
      }
    } else {
      // If changing from declined to something else, remove blackout date
      if (currentStatus === 'declined' && blackoutDateId) {
        await supabase
          .from('blackout_dates')
          .delete()
          .eq('id', blackoutDateId)
      }

      // Also remove blackout date if confirming after seeing the warning
      if (hasBlackoutDate && blackoutDateId) {
        await supabase
          .from('blackout_dates')
          .delete()
          .eq('id', blackoutDateId)
      }

      // Update or create signup
      if (signupId) {
        await supabase
          .from('event_signups')
          .update({ status })
          .eq('id', signupId)
      } else {
        await supabase
          .from('event_signups')
          .insert({
            event_id: eventId,
            profile_id: user.id,
            status
          })
      }
    }

    router.refresh()
    setLoading(false)
  }

  const handleCancel = async () => {
    if (!signupId) return
    
    setLoading(true)

    // If was declined, also remove the blackout date
    if (currentStatus === 'declined' && blackoutDateId) {
      await supabase
        .from('blackout_dates')
        .delete()
        .eq('id', blackoutDateId)
    }

    await supabase
      .from('event_signups')
      .delete()
      .eq('id', signupId)

    router.refresh()
    setLoading(false)
  }

  // Confirmation dialog
  if (showConfirmation) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Heads up!</strong> You previously marked this date as unavailable. 
            Are you sure you want to change your availability?
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => pendingAction && handleSignup(pendingAction)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : `Yes, ${pendingAction === 'confirmed' ? "I'm in" : "mark as maybe"}`}
          </button>
          <button
            onClick={() => {
              setShowConfirmation(false)
              setPendingAction(null)
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Are you available for this game?</p>
      
      <div className="flex gap-2">
        <button
          onClick={() => handleSignup('confirmed')}
          disabled={loading}
          className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
            currentStatus === 'confirmed'
              ? 'bg-green-600 text-white'
              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
          }`}
        >
          {currentStatus === 'confirmed' ? "✓ I'm in" : "I'm in"}
        </button>
        
        <button
          onClick={() => handleSignup('interested')}
          disabled={loading}
          className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
            currentStatus === 'interested'
              ? 'bg-yellow-500 text-white'
              : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
          }`}
        >
          {currentStatus === 'interested' ? '✓ Maybe' : 'Maybe'}
        </button>
        
        <button
          onClick={() => handleSignup('declined')}
          disabled={loading}
          className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
            currentStatus === 'declined'
              ? 'bg-red-600 text-white'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }`}
        >
          {currentStatus === 'declined' ? '✓ Out' : 'Decline'}
        </button>
      </div>

      {currentStatus && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Clear my response
        </button>
      )}
    </div>
  )
}
