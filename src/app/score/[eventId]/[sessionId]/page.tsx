import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ScoringInterface from './scoring-interface'

export default async function ScoringSessionPage({ 
  params 
}: { 
  params: Promise<{ eventId: string; sessionId: string }> 
}) {
  const { eventId, sessionId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch session with game details
  const { data: session } = await supabase
    .from('scoring_sessions')
    .select(`
      id, status, event_id,
      event:events(
        id, title, team_id, opponent_team_id, is_home_game,
        home_team:teams!events_team_id_fkey(id, name),
        away_team:opponent_teams(id, name)
      )
    `)
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  // Fetch current base state (most recent)
  const { data: currentState } = await supabase
    .from('base_states')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch home team lineup
  const { data: homeLineup } = await supabase
    .from('game_lineups')
    .select(`
      id, batting_order, fielding_position,
      player:profiles(id, full_name)
    `)
    .eq('event_id', eventId)
    .order('batting_order')

  // Fetch opponent players
  const { data: awayPlayers } = await supabase
    .from('opponent_players')
    .select('id, name, jersey_number')
    .eq('opponent_team_id', session.event?.opponent_team_id)
    .order('jersey_number')

  // Fetch current at-bat if one is in progress
  const { data: currentAtBat } = await supabase
    .from('at_bats')
    .select(`
      *,
      pitches(*)
    `)
    .eq('session_id', sessionId)
    .eq('result', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch recent plays for the log
  const { data: recentPlays } = await supabase
    .from('at_bats')
    .select(`
      id, inning, is_home_team, result, rbi,
      batter:profiles!at_bats_batter_profile_id_fkey(full_name),
      opponent_batter:opponent_players!at_bats_batter_opponent_id_fkey(name)
    `)
    .eq('session_id', sessionId)
    .neq('result', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <ScoringInterface
      session={session}
      currentState={currentState}
      homeLineup={homeLineup || []}
      awayPlayers={awayPlayers || []}
      currentAtBat={currentAtBat}
      recentPlays={recentPlays || []}
      userId={user.id}
    />
  )
}

