import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

export default async function ScoreGamePage({ 
  params 
}: { 
  params: Promise<{ eventId: string }> 
}) {
  const { eventId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if game exists and is a game type
  const { data: event } = await supabase
    .from('events')
    .select('id, type, title, team_id, opponent_team_id')
    .eq('id', eventId)
    .eq('type', 'game')
    .single()

  if (!event) notFound()

  // Check for existing session
  const { data: existingSession } = await supabase
    .from('scoring_sessions')
    .select('id')
    .eq('event_id', eventId)
    .eq('scorer_profile_id', user.id)
    .in('status', ['in_progress', 'paused'])
    .single()

  if (existingSession) {
    redirect(`/score/${eventId}/${existingSession.id}`)
  }

  // Create new session
  const { data: newSession, error } = await supabase
    .from('scoring_sessions')
    .insert({
      event_id: eventId,
      scorer_profile_id: user.id,
      status: 'in_progress'
    })
    .select('id')
    .single()

  if (error || !newSession) {
    throw new Error('Failed to create scoring session')
  }

  // Create initial base state (top of 1st, no runners, no score)
  await supabase
    .from('base_states')
    .insert({
      session_id: newSession.id,
      inning: 1,
      is_top_inning: true,
      outs: 0,
      home_score: 0,
      away_score: 0
    })

  redirect(`/score/${eventId}/${newSession.id}`)
}

