'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CompleteInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    async function completeInvite() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to accept this invite.')
        setStatus('error')
        return
      }

      // Get the invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('id, email, team_id, role, status')
        .eq('token', token)
        .single()

      if (inviteError || !invite) {
        setError('This invite link is invalid or has expired.')
        setStatus('error')
        return
      }

      if (invite.status !== 'pending') {
        setError('This invite has already been used.')
        setStatus('error')
        return
      }

      // Update user's role if specified in invite
      if (invite.role) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: invite.role })
          .eq('id', user.id)

        if (profileError) {
          console.error('Error updating profile role:', profileError)
        }
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invite.team_id,
          profile_id: user.id,
        })

      if (memberError && memberError.code !== '23505') { // Ignore duplicate key error
        setError('Failed to add you to the team. Please contact an admin.')
        setStatus('error')
        return
      }

      // Mark invite as accepted
      await supabase
        .from('invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id)

      setStatus('success')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }

    completeInvite()
  }, [token, supabase, router])

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-red-600 font-medium">{error}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:underline"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-green-600 text-5xl">✓</div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome to the team!</h1>
        <p className="text-gray-600">Redirecting you to the dashboard...</p>
      </div>
    </div>
  )
}
