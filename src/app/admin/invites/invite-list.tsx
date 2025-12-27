'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Invite {
  id: string
  email: string
  role: string | null
  status: string
  token: string
  created_at: string
  team: {
    name: string
  }
}

interface InviteListProps {
  isAdmin: boolean
  userId: string
}

export default function InviteList({ isAdmin, userId }: InviteListProps) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function fetchInvites() {
      let query = supabase
        .from('invites')
        .select(`
          id,
          email,
          role,
          status,
          token,
          created_at,
          team:teams(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      // Coaches only see their own invites
      if (!isAdmin) {
        query = query.eq('invited_by', userId)
      }

      const { data, error } = await query

      if (!error && data) {
        setInvites(data as unknown as Invite[])
      }
      setLoading(false)
    }

    fetchInvites()
  }, [isAdmin, userId, supabase])

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
  }

  const cancelInvite = async (id: string) => {
    const { error } = await supabase
      .from('invites')
      .update({ status: 'expired' })
      .eq('id', id)

    if (!error) {
      setInvites(invites.filter((i) => i.id !== id))
    }
  }

  if (loading) {
    return <p className="text-gray-500">Loading invites...</p>
  }

  if (invites.length === 0) {
    return <p className="text-gray-500">No pending invites.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b">
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Team</th>
            <th className="pb-2 font-medium">Role</th>
            <th className="pb-2 font-medium">Created</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {invites.map((invite) => (
            <tr key={invite.id} className="border-b last:border-0">
              <td className="py-3">{invite.email}</td>
              <td className="py-3">{invite.team?.name}</td>
              <td className="py-3 capitalize">{invite.role || 'Player'}</td>
              <td className="py-3 text-gray-500">
                {new Date(invite.created_at).toLocaleDateString()}
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(invite.token)}
                    className="text-blue-600 hover:underline"
                  >
                    Copy link
                  </button>
                  <button
                    onClick={() => cancelInvite(invite.id)}
                    className="text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
