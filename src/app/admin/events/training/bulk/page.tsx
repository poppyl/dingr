import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BulkTrainingForm from './bulk-training-form'

export default async function BulkTrainingPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/schedule')
  }

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/events/new" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Bulk Create Training Sessions</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-gray-600 mb-6">
            Create a full season of training sessions. All sessions are at Bobby Thompson Field and open to all teams.
          </p>
          <BulkTrainingForm teams={teams || []} userId={user.id} />
        </div>
      </main>
    </div>
  )
}
