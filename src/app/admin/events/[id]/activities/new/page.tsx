import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ActivityForm from './activity-form'

export default async function NewActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Only admins and coaches can add activities
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'coach')) {
    redirect('/schedule')
  }

  // Get event to verify it exists and is a training
  const { data: event, error } = await supabase
    .from('events')
    .select('id, title, type')
    .eq('id', id)
    .single()

  if (error || !event || event.type !== 'training') {
    notFound()
  }

  // Get team members who could lead activities
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['admin', 'coach'])
    .order('full_name')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/schedule/${id}`} className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Add Activity</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-gray-600 mb-6">
            Add an activity to <strong>{event.title}</strong>
          </p>
          <ActivityForm 
            eventId={id} 
            leaders={teamMembers || []}
          />
        </div>
      </main>
    </div>
  )
}
