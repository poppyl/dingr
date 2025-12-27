import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EditEventForm from './edit-event-form'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Only admins can edit events
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/schedule')
  }

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
      status,
      is_home_game,
      visibility,
      team_id,
      opponent_team_id,
      umpire_1_id,
      umpire_2_id
    `)
    .eq('id', id)
    .single()

  if (error || !event) {
    notFound()
  }

  // Get teams, opponents, and umpires
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .order('name')

  const { data: opponents } = await supabase
    .from('opponent_teams')
    .select('id, name, location')
    .order('name')

  const { data: umpires } = await supabase
    .from('umpires')
    .select('id, name')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/schedule/${id}`} className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Edit Event</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <EditEventForm 
            event={event}
            teams={teams || []}
            opponents={opponents || []}
            umpires={umpires || []}
          />
        </div>
      </main>
    </div>
  )
}
