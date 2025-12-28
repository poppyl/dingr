import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ScheduleBuilder from './schedule-builder'

export default async function ActivitySchedulePage({ 
  params 
}: { 
  params: Promise<{ id: string; activityId: string }> 
}) {
  const { id: eventId, activityId } = await params
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role check - must be admin or coach
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'coach'].includes(profile?.role || '')) {
    redirect('/schedule')
  }

  // Fetch activity details
  const { data: activity } = await supabase
    .from('event_activities')
    .select(`
      id, name, description, max_signups,
      slot_duration_minutes, start_time, end_time, schedule_published,
      event:events(id, title, start_time)
    `)
    .eq('id', activityId)
    .single()

  if (!activity) notFound()

  // Fetch all requests for this activity
  // Try requested_at first, fallback to created_at if the view uses that
  const { data: requests } = await supabase
    .from('activity_requests_view')
    .select('*')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href={`/schedule/${eventId}`} className="text-gray-500 hover:text-gray-700">
            ← Back to event
          </Link>
          <h1 className="text-xl font-bold mt-2">{activity.name} Schedule</h1>
          <p className="text-gray-600">{activity.event?.title}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <ScheduleBuilder
          activity={activity}
          requests={requests || []}
          eventId={eventId}
        />
      </main>
    </div>
  )
}

