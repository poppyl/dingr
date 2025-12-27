import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  // Get user's team memberships
  const { data: memberships } = await supabase
    .from('team_members')
    .select(`
      jersey_number,
      team:teams(name)
    `)
    .eq('profile_id', user.id)

  const isAdmin = profile?.role === 'admin'
  const isCoach = profile?.role === 'coach'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Dingr"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="text-lg font-semibold font-display">Dingr</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {profile?.full_name || 'Player'}
          </h1>
          <p className="text-gray-500 mt-1">
            {profile?.role && (
              <span className="capitalize">{profile.role}</span>
            )}
            {memberships && memberships.length > 0 && (
              <span> · {memberships.map((m: any) => m.team?.name).join(', ')}</span>
            )}
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link
            href="/schedule"
            className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="text-2xl mb-2">📅</div>
            <h2 className="font-semibold text-gray-900">Schedule</h2>
            <p className="text-sm text-gray-500 mt-1">View upcoming games and training</p>
          </Link>

          <Link
            href="/schedule/availability"
            className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="text-2xl mb-2">🗓️</div>
            <h2 className="font-semibold text-gray-900">My Availability</h2>
            <p className="text-sm text-gray-500 mt-1">Set your blackout dates</p>
          </Link>

          {(isAdmin || isCoach) && (
            <Link
              href="/admin/invites"
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="text-2xl mb-2">✉️</div>
              <h2 className="font-semibold text-gray-900">Invitations</h2>
              <p className="text-sm text-gray-500 mt-1">Invite new members</p>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin/events/new"
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="text-2xl mb-2">➕</div>
              <h2 className="font-semibold text-gray-900">Create Event</h2>
              <p className="text-sm text-gray-500 mt-1">Add games or training sessions</p>
            </Link>
          )}
        </div>

        {/* Team memberships */}
        {memberships && memberships.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-4">My Teams</h2>
            <div className="space-y-3">
              {memberships.map((membership: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="font-medium text-gray-900">{membership.team?.name}</span>
                  {membership.jersey_number && (
                    <span className="text-sm text-gray-500">#{membership.jersey_number}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
