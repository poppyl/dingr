'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Team {
  id: string
  name: string
}

interface InviteFormProps {
  teams: Team[]
  isAdmin: boolean
  userId: string
}

export default function InviteForm({ teams, isAdmin, userId }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [teamId, setTeamId] = useState(teams[0]?.id || '')
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Create the invite
    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        email,
        team_id: teamId,
        role: isAdmin && role ? role : null,
        invited_by: userId,
      })
      .select('token')
      .single()

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
      return
    }

    // Generate invite link
    const inviteLink = `${window.location.origin}/invite/${invite.token}`

    // For now, we'll just show the link (in production, you'd send an email)
    setMessage({ 
      type: 'success', 
      text: `Invite created! Share this link: ${inviteLink}` 
    })
    
    // Reset form
    setEmail('')
    setRole('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <div className="space-y-2">
              <p>Invite created successfully!</p>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={message.text.replace('Invite created! Share this link: ', '')}
                  className="flex-1 p-2 bg-white border rounded text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(message.text.replace('Invite created! Share this link: ', ''))
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
            </div>
          ) : message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="player@example.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
            Team
          </label>
          <select
            id="team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role (optional)
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Default (Player)</option>
              <option value="player">Player</option>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !email || !teamId}
        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Invite'}
      </button>
    </form>
  )
}
