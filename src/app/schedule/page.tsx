import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function SchedulePage() {
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

  // Get user's teams
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('profile_id', user.id)

  const teamIds = memberships?.map(m => m.team_id) || []

  // Get upcoming events
  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      type,
      title,
      description,
      location,
      start_time,
      end_time,
      status,
      is_home_game,
      visibility,
      team:teams(id, name),
      opponent:opponent_teams(name),
      signups:event_signups(
        id,
        status,
        profile_id
      )
    `)
    .or(`visibility.eq.all,and(visibility.eq.team,team_id.in.(${teamIds.join(',')}))`)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  // Get user's signups for these events
  const userSignups = new Map()
  events?.forEach(event => {
    const signup = event.signups?.find((s: any) => s.profile_id === user.id)
    if (signup) {
      userSignups.set(event.id, signup.status)
    }
  })

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-semibold text-gray-900">Schedule</h1>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Link
                href="/admin/events/new"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Add Event
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/schedule/availability"
            className="text-blue-600 hover:underline text-sm"
          >
            Manage my availability →
          </Link>
        </div>

        {!events || events.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-200 text-center text-gray-500">
            No upcoming events scheduled.
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event: any) => {
              const startDate = new Date(event.start_time)
              const endDate = event.end_time ? new Date(event.end_time) : null
              const userStatus = userSignups.get(event.id)
              const confirmedCount = event.signups?.filter((s: any) => s.status === 'confirmed').length || 0
              const maybeCount = event.signups?.filter((s: any) => s.status === 'interested').length || 0
              const declinedCount = event.signups?.filter((s: any) => s.status === 'declined').length || 0

              return (
                <Link
                  key={event.id}
                  href={`/schedule/${event.id}`}
                  className="block bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      {/* Date box */}
                      <div className="flex-shrink-0 w-16 text-center">
                        <div className="text-sm font-medium text-gray-500 uppercase">
                          {startDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {startDate.getDate()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {startDate.toLocaleDateString('en-GB', { month: 'short' })}
                        </div>
                      </div>

                      {/* Event details */}
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            event.type === 'game' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {event.type === 'game' ? 'Game' : 'Training'}
                          </span>
                          {event.type === 'game' && event.is_home_game !== null && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              event.is_home_game 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {event.is_home_game ? 'Home' : 'Away'}
                            </span>
                          )}
                          {event.visibility === 'all' && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-700">
                              All teams
                            </span>
                          )}
                          {event.status === 'cancelled' && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              Cancelled
                            </span>
                          )}
                          {event.visibility === 'team' && (
                            <span className="text-sm text-gray-500">
                              {(event.team as any)?.name}
                            </span>
                          )}
                        </div>
                        
                        {/* Title only - no duplicate opponent */}
                        <h2 className="text-lg font-semibold text-gray-900">
                          {event.title}
                        </h2>
                        
                        <div className="text-sm text-gray-500 mt-1">
                          {startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          {endDate && ` - ${endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                          {event.location && ` · ${event.location}`}
                        </div>

                        <div className="text-sm text-gray-500 mt-2">
                          {confirmedCount} in · {maybeCount} maybe
                          {declinedCount > 0 && ` · ${declinedCount} out`}
                        </div>
                      </div>
                    </div>

                    {/* User's status */}
                    {userStatus && (
                      <div className={`px-3 py-1 text-sm font-medium rounded-full ${
                        userStatus === 'confirmed' 
                          ? 'bg-green-100 text-green-700' 
                          : userStatus === 'interested'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {userStatus === 'confirmed' ? "I'm in" : userStatus === 'interested' ? 'Maybe' : 'Out'}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
