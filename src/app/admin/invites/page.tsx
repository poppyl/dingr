import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteForm from './invite-form'
import InviteList from './invite-list'

export default async function InvitesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only admins and coaches can access this page
  if (!profile || (profile.role !== 'admin' && profile.role !== 'coach')) {
    redirect('/dashboard')
  }

  // Get all teams (for admins) or user's teams (for coaches)
  let teams
  if (profile.role === 'admin') {
    const { data } = await supabase.from('teams').select('id, name').order('name')
    teams = data
  } else {
    const { data } = await supabase
      .from('team_members')
      .select('team:teams(id, name)')
      .eq('profile_id', user.id)
    teams = data?.map((m: any) => m.team)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-gray-500 hover:text-gray-700">
              ← Back
            </a>
            <h1 className="text-xl font-bold text-gray-900">Manage Invites</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Invite form */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Send New Invite</h2>
          <InviteForm 
            teams={teams || []} 
            isAdmin={profile.role === 'admin'} 
            userId={user.id}
          />
        </div>

        {/* Pending invites */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invites</h2>
          <InviteList isAdmin={profile.role === 'admin'} userId={user.id} />
        </div>
      </main>
    </div>
  )
}
