import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import LineupEditor from './lineup-editor'

export default async function LineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'coach'].includes(profile.role)) {
    redirect('/schedule')
  }

  // Get event with team info
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, title, type, team_id, opponent_team_id, is_home_game,
      team:teams!events_team_id_fkey(id, name),
      opponent:opponent_teams(id, name)
    `)
    .eq('id', id)
    .eq('type', 'game')
    .single()

  if (!event) notFound()

  // Get the user's team memberships to verify they belong to this event's team
  const { data: userTeamMembership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('profile_id', user.id)
    .eq('team_id', event.team_id)
    .single()

  // User must be a member of the event's team (or be a global admin)
  const isGlobalAdmin = profile.role === 'admin'
  const isTeamMember = !!userTeamMembership

  if (!isGlobalAdmin && !isTeamMember) {
    // User is a coach but not on this team - they can view but not edit
    redirect(`/schedule/${id}`)
  }

  // Determine which team is home and which is away based on is_home_game
  // is_home_game means OUR team (event.team) is the home team
  const isHomeGame = event.is_home_game ?? true
  
  // Our team is always event.team (from the teams table)
  // Opponent is always event.opponent (from opponent_teams table)
  const ourTeamName = (event.team as any)?.name || 'Our Team'
  const opponentTeamName = (event.opponent as any)?.name || 'Opponent'
  
  // But home/away labels depend on is_home_game
  const homeTeamName = isHomeGame ? ourTeamName : opponentTeamName
  const awayTeamName = isHomeGame ? opponentTeamName : ourTeamName

  // Get our team's players (from team_members)
  const { data: teamPlayers } = await supabase
    .from('team_members')
    .select(`
      id,
      jersey_number,
      profile:profiles(id, full_name)
    `)
    .eq('team_id', event.team_id)
    .order('jersey_number')

  // Get current lineup for our team (game_lineups)
  const { data: ourLineup } = await supabase
    .from('game_lineups')
    .select('id, batting_order, fielding_position, profile_id')
    .eq('event_id', id)
    .order('batting_order')

  // Get opponent players
  const { data: opponentPlayers } = await supabase
    .from('opponent_players')
    .select('id, name, jersey_number')
    .eq('opponent_team_id', event.opponent_team_id)
    .order('jersey_number')

  // Get current opponent lineup (opponent_lineups)
  const { data: opponentLineup } = await supabase
    .from('opponent_lineups')
    .select('id, batting_order, fielding_position, opponent_player_id')
    .eq('event_id', id)
    .order('batting_order')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/schedule/${id}`} className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900 font-display">Set Lineup</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-700">
          {event.title}
        </div>

        <LineupEditor
          eventId={id}
          ourTeamName={ourTeamName}
          opponentTeamName={opponentTeamName}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          isHomeGame={isHomeGame}
          teamPlayers={teamPlayers?.map(p => ({
            id: (p.profile as any)?.id || '',
            name: (p.profile as any)?.full_name || 'Unknown',
            jerseyNumber: p.jersey_number
          })) || []}
          opponentPlayers={opponentPlayers?.map(p => ({
            id: p.id,
            name: p.name,
            jerseyNumber: p.jersey_number
          })) || []}
          initialOurLineup={ourLineup || []}
          initialOpponentLineup={opponentLineup || []}
          opponentTeamId={event.opponent_team_id || ''}
        />
      </main>
    </div>
  )
}