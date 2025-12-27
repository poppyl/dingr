'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Invite {
  id: string
  email: string
  role: string | null
  status: string
  team: {
    name: string
  }
  inviter: {
    full_name: string
  } | null
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [invite, setInvite] = useState<Invite | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchInvite() {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          id,
          email,
          role,
          status,
          team:teams(name),
          inviter:profiles!invited_by(full_name)
        `)
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('This invite link is invalid or has expired.')
      } else if (data.status === 'accepted') {
        setError('This invite has already been used.')
      } else if (data.status === 'expired') {
        setError('This invite has expired. Please request a new one.')
      } else {
        setInvite(data as unknown as Invite)
      }
      setLoading(false)
    }

    fetchInvite()
  }, [token, supabase])

  const handleGoogleSignup = async () => {
    setAccepting(true)
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/invite/${token}/complete`,
      },
    })
    
    if (error) {
      setError(error.message)
      setAccepting(false)
    }
  }

  const handleEmailSignup = async () => {
    if (!invite) return
    setAccepting(true)
    
    const { error } = await supabase.auth.signInWithOtp({
      email: invite.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/invite/${token}/complete`,
      },
    })
    
    if (error) {
      setError(error.message)
      setAccepting(false)
    } else {
      setError(null)
      alert(`Check your email (${invite.email}) for a login link!`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading invite...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-red-600 font-medium">{error}</div>
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:underline"
          >
            Go to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">You&apos;re Invited!</h1>
          <p className="mt-2 text-gray-600">
            {invite?.inviter?.full_name || 'Someone'} has invited you to join
          </p>
          <p className="text-xl font-semibold text-blue-600 mt-1">
            {invite?.team?.name}
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div className="text-center text-gray-600">
            <p>Create your account to join the team</p>
            {invite?.role && (
              <p className="text-sm mt-1">
                You&apos;ll be added as: <span className="font-medium capitalize">{invite.role}</span>
              </p>
            )}
          </div>

          {/* Google Signup */}
          <button
            onClick={handleGoogleSignup}
            disabled={accepting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700 font-medium">Continue with Google</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Email signup */}
          <button
            onClick={handleEmailSignup}
            disabled={accepting}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Sending...' : `Send login link to ${invite?.email}`}
          </button>
        </div>
      </div>
    </div>
  )
}
