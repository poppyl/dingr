import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BlackoutDates from './blackout-dates'

export default async function AvailabilityPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's blackout dates
  const { data: blackoutDates } = await supabase
    .from('blackout_dates')
    .select('id, date, reason')
    .eq('profile_id', user.id)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/schedule" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">My Availability</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-gray-600 mb-6">
            Mark dates when you won&apos;t be available for games or training. 
            This helps coaches plan team rosters in advance.
          </p>
          <BlackoutDates 
            initialDates={blackoutDates || []} 
            userId={user.id}
          />
        </div>
      </main>
    </div>
  )
}
