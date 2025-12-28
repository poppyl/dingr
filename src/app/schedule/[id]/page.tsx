import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import GameSignupButtons from './game-signup-buttons'
import ActivitySignup from './activity-signup'

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  // Get event details
  const { data: event, error } = await supabase
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
      umpire1:umpires!events_umpire_1_id_fkey(name),
      umpire2:umpires!events_umpire_2_id_fkey(name),
      signups:event_signups(
        id,
        status,
        created_at,
        activity_id,
        requested_duration,
        working_on,
        assigned_time,
        profile:profiles(id, full_name)
      ),
      activities:event_activities(
        id,
        name,
        description,
        max_signups,
        led_by,
        start_time,
        end_time,
        slot_duration_minutes,
        schedule_published,
        leader:profiles!event_activities_led_by_fkey(full_name),
        signups:event_signups(
          id,
          status,
          created_at,
          requested_duration,
          working_on,
          assigned_time,
          profile:profiles(id, full_name)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !event) {
    notFound()
  }

  const startDate = new Date(event.start_time)
  const eventDateStr = startDate.toISOString().split('T')[0]

  // Get user's signup status for this event (event-level signup, not activity)
  const userSignup = event.signups?.find((s: any) => s.profile?.id === user.id && !s.activity_id)
  
  // Check if user has a blackout date for this event
  const { data: blackoutDate } = await supabase
    .from('blackout_dates')
    .select('id')
    .eq('profile_id', user.id)
    .eq('date', eventDateStr)
    .single()

  // Separate signups by status (only event-level signups, not activity signups)
  const eventLevelSignups = event.signups?.filter((s: any) => !s.activity_id) || []
  const confirmedSignups = eventLevelSignups.filter((s: any) => s.status === 'confirmed')
  const maybeSignups = eventLevelSignups.filter((s: any) => s.status === 'interested')
  const declinedSignups = eventLevelSignups.filter((s: any) => s.status === 'declined')

  const isAdmin = profile?.role === 'admin'
  const isCoach = profile?.role === 'coach'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/schedule" className="text-gray-500 hover:text-gray-700">
              ← Back
            </Link>
          </div>
          {isAdmin && (
            <Link
              href={`/admin/events/${id}/edit`}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
            >
              Edit Event
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Event header */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                Open to all teams
              </span>
            )}
            {event.status === 'cancelled' && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                Cancelled
              </span>
            )}
            {event.visibility === 'team' && (
              <span className="text-sm text-gray-500">{(event.team as any)?.name}</span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {event.title}
          </h2>

          <div className="mt-4 space-y-2 text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {startDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.location}</span>
              </div>
            )}
            {event.type === 'game' && ((event as any).umpire1 || (event as any).umpire2) && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>
                  Umpires: {[(event as any).umpire1?.name, (event as any).umpire2?.name].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-4 text-gray-600">{event.description}</p>
          )}

          {/* Signup buttons for games */}
          {event.type === 'game' && event.status !== 'cancelled' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <GameSignupButtons 
                eventId={event.id}
                eventDate={eventDateStr}
                currentStatus={userSignup?.status || null}
                signupId={userSignup?.id || null}
                hasBlackoutDate={!!blackoutDate}
                blackoutDateId={blackoutDate?.id || null}
              />
            </div>
          )}

          {/* Score Game button - only for games */}
          {event.type === 'game' && event.status !== 'cancelled' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                href={`/score/${event.id}`}
                className="block w-full py-3 bg-green-600 text-white text-center font-medium rounded-lg hover:bg-green-700"
              >
                ⚾ Score This Game
              </Link>
            </div>
          )}
        </div>

        {/* Training activities */}
        {event.type === 'training' && event.status !== 'cancelled' && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activities</h3>
            
            {event.activities && event.activities.length > 0 ? (
              <div className="space-y-4">
                {event.activities.map((activity: any) => {
                  const activitySignups = activity.signups || []
                  const userActivitySignup = activitySignups.find((s: any) => s.profile?.id === user.id)
                  const requestCount = activitySignups.filter((s: any) => 
                    ['requested', 'assigned'].includes(s.status)
                  ).length

                  return (
                    <div key={activity.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{activity.name}</h4>
                          {activity.leader && (
                            <p className="text-sm text-gray-500">Led by {activity.leader.full_name}</p>
                          )}
                          {activity.description && (
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          )}
                          <div className="text-sm text-gray-500 mt-2">
                            {requestCount} requests · ~{activity.max_signups || '?'} slots
                            {activity.schedule_published && ' · Schedule finalized'}
                          </div>
                        </div>
                        <ActivitySignup
                          activityId={activity.id}
                          eventId={event.id}
                          currentStatus={userActivitySignup?.status || null}
                          signupId={userActivitySignup?.id || null}
                          isFull={false}
                          requestedDuration={userActivitySignup?.requested_duration}
                          workingOn={userActivitySignup?.working_on}
                          assignedTime={userActivitySignup?.assigned_time}
                          schedulePublished={activity.schedule_published}
                          requestCount={requestCount}
                          maxSignups={activity.max_signups}
                        />
                      </div>

                      {/* Coach/Admin: Manage Schedule link */}
                      {(isAdmin || isCoach) && (
                        <Link 
                          href={`/admin/events/${event.id}/activities/${activity.id}/schedule`}
                          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                        >
                          Manage Schedule →
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500">No activities set up yet.</p>
            )}
          </div>
        )}

        {/* Add activity button for coaches/admins */}
        {event.type === 'training' && event.status !== 'cancelled' && (isAdmin || isCoach) && (
          <Link
            href={`/admin/events/${id}/activities/new`}
            className="block text-center py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
          >
            + Add Activity
          </Link>
        )}

        {/* Attendance for games */}
        {event.type === 'game' && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance</h3>
            
            <div className="space-y-6">
              {/* I'm in */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  I&apos;m in ({confirmedSignups.length})
                </h4>
                {confirmedSignups.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {confirmedSignups.map((signup: any) => (
                      <span key={signup.id} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                        {signup.profile?.full_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No one confirmed yet</p>
                )}
              </div>

              {/* Maybe */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Maybe ({maybeSignups.length})
                </h4>
                {maybeSignups.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {maybeSignups.map((signup: any) => (
                      <span key={signup.id} className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm rounded-full">
                        {signup.profile?.full_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No one marked as maybe</p>
                )}
              </div>

              {/* Declined */}
              {declinedSignups.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Out ({declinedSignups.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {declinedSignups.map((signup: any) => (
                      <span key={signup.id} className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full">
                        {signup.profile?.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
