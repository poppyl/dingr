import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function NewEventPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Only admins can create events
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/schedule')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/schedule" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Create Event</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Training option */}
          <Link
            href="/admin/events/training/new"
            className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="text-3xl mb-3">🏋️</div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
              Training Session
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Open to all teams by default. Add activities like batting practice, fielding drills, etc.
            </p>
          </Link>

          {/* Game option */}
          <Link
            href="/admin/events/game/new"
            className="bg-white rounded-xl p-6 border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors group"
          >
            <div className="text-3xl mb-3">⚾</div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-green-700">
              Game
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Team-specific. Set home/away, opponent, and track attendance.
            </p>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Bulk Create</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/events/training/bulk"
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <h4 className="font-medium text-gray-900">Bulk Training Sessions</h4>
              <p className="text-sm text-gray-500">Create a full season of training</p>
            </Link>
            <Link
              href="/admin/events/game/bulk"
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <h4 className="font-medium text-gray-900">Bulk Games</h4>
              <p className="text-sm text-gray-500">Create a full season of games</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
