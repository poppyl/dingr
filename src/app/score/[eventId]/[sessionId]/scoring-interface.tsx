'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DiamondDisplay from './diamond-display'
import PitchButtons from './pitch-buttons'
import PlayByPlayLog from './play-by-play-log'
import BallInPlayMenu from './ball-in-play-menu'
import FieldLocationPicker from './field-location-picker'
import RunnerAdvancementModal from './runner-advancement-modal'
import type { BaseState, LineupPlayer, OpponentPlayer, AtBatResult, HitType } from '@/types/scoring'

interface ScoringInterfaceProps {
  session: any
  currentState: BaseState | null
  homeLineup: LineupPlayer[]
  awayPlayers: OpponentPlayer[]
  currentAtBat: any
  recentPlays: any[]
  userId: string
}

interface Runner {
  id: string
  name: string
  isOpponent: boolean
}

export default function ScoringInterface({
  session,
  currentState,
  homeLineup,
  awayPlayers,
  currentAtBat: initialAtBat,
  recentPlays: initialPlays,
  userId
}: ScoringInterfaceProps) {
  const router = useRouter()
  const supabase = createClient()

  // Game state
  const [gameState, setGameState] = useState({
    inning: currentState?.inning || 1,
    isTopInning: currentState?.is_top_inning ?? true,
    outs: currentState?.outs || 0,
    homeScore: currentState?.home_score || 0,
    awayScore: currentState?.away_score || 0,
    // Runners now store the actual runner info, not just IDs
    runnerFirst: null as Runner | null,
    runnerSecond: null as Runner | null,
    runnerThird: null as Runner | null,
  })

  // At-bat state
  const [currentAtBat, setCurrentAtBat] = useState(initialAtBat)
  const [balls, setBalls] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [pitchCount, setPitchCount] = useState<number>(initialAtBat?.pitches?.length || 0)
  // UI state
  const [showBallInPlay, setShowBallInPlay] = useState(false)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [showRunnerModal, setShowRunnerModal] = useState(false)
  const [pendingPlay, setPendingPlay] = useState<{hitType: string, outcome: string, gridX?: number, gridY?: number, fieldedBy?: string} | null>(null)
  const [recentPlays, setRecentPlays] = useState(initialPlays)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine current batter
  const isHomeBatting = !gameState.isTopInning
  const battingLineup = isHomeBatting ? homeLineup : awayPlayers
  
  // Calculate batter index based on completed at-bats for current team this game
  const completedAtBatsForTeam = recentPlays.filter(p => p.is_home_team === isHomeBatting).length
  const currentBatterIndex = completedAtBatsForTeam % Math.max(battingLineup.length, 1)

  const event = session.event
  const homeTeamName = event?.home_team?.name || 'Home'
  const awayTeamName = event?.away_team?.name || 'Away'

  // Debug logging
  useEffect(() => {
    console.log('Batting lineup:', battingLineup)
    console.log('Current batter index:', currentBatterIndex)
    console.log('Is home batting:', isHomeBatting)
    console.log('Current at-bat:', currentAtBat)
  }, [battingLineup, currentBatterIndex, isHomeBatting, currentAtBat])

  // Start new at-bat if needed
  useEffect(() => {
    if (!currentAtBat && battingLineup.length > 0 && !loading) {
      startNewAtBat()
    }
  }, [currentAtBat, battingLineup.length])

  const startNewAtBat = async () => {
    if (battingLineup.length === 0) {
      setError('No players in batting lineup')
      return
    }

    const batter = battingLineup[currentBatterIndex]
    if (!batter) {
      setError(`No batter at index ${currentBatterIndex}`)
      return
    }

    setLoading(true)
    setError(null)

    const atBatData: any = {
      session_id: session.id,
      event_id: session.event_id,
      inning: gameState.inning,
      is_home_team: isHomeBatting,
      result: 'in_progress',
      rbi: 0,
      batting_order_position: currentBatterIndex + 1,
      status: 'draft'
    }

    // Set batter ID based on home/away
    if (isHomeBatting) {
      atBatData.batter_profile_id = (batter as LineupPlayer).player?.id
    } else {
      atBatData.batter_opponent_id = (batter as OpponentPlayer).id
    }

    console.log('Creating at-bat:', atBatData)

    const { data, error } = await supabase
      .from('at_bats')
      .insert(atBatData)
      .select()
      .single()

    if (error) {
      console.error('Error creating at-bat:', error)
      setError(`Failed to create at-bat: ${error.message}`)
    } else if (data) {
      console.log('Created at-bat:', data)
      setCurrentAtBat(data)
      setBalls(0)
      setStrikes(0)
      setPitchCount(0)
    }

    setLoading(false)
  }

  const getCurrentBatter = (): Runner | null => {
    const batter = battingLineup[currentBatterIndex]
    if (!batter) return null
    
    if (isHomeBatting) {
      const lineup = batter as LineupPlayer
      return {
        id: lineup.player?.id || '',
        name: lineup.player?.full_name || 'Unknown',
        isOpponent: false
      }
    } else {
      const opponent = batter as OpponentPlayer
      return {
        id: opponent.id,
        name: opponent.name || 'Unknown',
        isOpponent: true
      }
    }
  }

  const getCurrentBatterName = () => {
    return getCurrentBatter()?.name || 'Unknown'
  }

  const recordPitch = async (result: string) => {
    if (!currentAtBat || loading) return
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('pitches')
      .insert({
        session_id: session.id,
        at_bat_id: currentAtBat.id,
        inning: gameState.inning,
        is_top_inning: gameState.isTopInning,
        balls,
        strikes,
        outs: gameState.outs,
        result,
        pitch_number: pitchCount + 1
      })

    if (error) {
      console.error('Error recording pitch:', error)
      setError(`Failed to record pitch: ${error.message}`)
      setLoading(false)
      return
    }

    setPitchCount(prev => prev + 1)
    
    // Update count based on result
    if (result === 'ball') {
      if (balls >= 3) {
        await completeAtBat('walk')
      } else {
        setBalls(prev => prev + 1)
        setLoading(false)
      }
    } else if (result === 'strike_called' || result === 'strike_swinging') {
      if (strikes >= 2) {
        await completeAtBat(result === 'strike_swinging' ? 'strikeout_swinging' : 'strikeout_looking')
      } else {
        setStrikes(prev => prev + 1)
        setLoading(false)
      }
    } else if (result === 'strike_foul') {
      if (strikes < 2) {
        setStrikes(prev => prev + 1)
      }
      setLoading(false)
    } else if (result === 'hit_by_pitch') {
      await completeAtBat('hit_by_pitch')
    } else {
      setLoading(false)
    }
  }

  const advanceRunners = (outcome: string): { newRunners: typeof gameState, runsScored: number } => {
    const currentBatter = getCurrentBatter()
    let runsScored = 0
    
    let newFirst: Runner | null = null
    let newSecond: Runner | null = null
    let newThird: Runner | null = null

    const { runnerFirst, runnerSecond, runnerThird } = gameState

    switch (outcome) {
      case 'single':
      case 'walk':
      case 'hit_by_pitch':
        // Batter to first, runners advance one base if forced
        newFirst = currentBatter
        if (runnerFirst) {
          newSecond = runnerFirst
          if (runnerSecond) {
            newThird = runnerSecond
            if (runnerThird) {
              runsScored++ // Runner on third scores
            }
          } else {
            newThird = runnerThird // Stay if not forced
          }
        } else {
          newSecond = runnerSecond
          newThird = runnerThird
        }
        break

      case 'double':
        // Batter to second, all runners advance two bases
        newSecond = currentBatter
        if (runnerThird) runsScored++
        if (runnerSecond) runsScored++
        if (runnerFirst) newThird = runnerFirst
        break

      case 'triple':
        // Batter to third, all runners score
        newThird = currentBatter
        if (runnerThird) runsScored++
        if (runnerSecond) runsScored++
        if (runnerFirst) runsScored++
        break

      case 'home_run':
        // Everyone scores
        runsScored = 1 // Batter
        if (runnerFirst) runsScored++
        if (runnerSecond) runsScored++
        if (runnerThird) runsScored++
        break

      case 'groundout':
      case 'flyout':
      case 'lineout':
      case 'popout':
        // Out - runners stay (simplified, no advancement on outs for now)
        newFirst = runnerFirst
        newSecond = runnerSecond
        newThird = runnerThird
        break

      case 'strikeout_swinging':
      case 'strikeout_looking':
        // Strikeout - runners stay
        newFirst = runnerFirst
        newSecond = runnerSecond
        newThird = runnerThird
        break

      case 'error':
        // Similar to single
        newFirst = currentBatter
        newSecond = runnerFirst
        newThird = runnerSecond
        if (runnerThird) runsScored++
        break

      case 'fielders_choice':
        // Batter reaches, but a runner is out - simplified
        newFirst = currentBatter
        // Assume lead runner is out
        newSecond = null
        newThird = runnerSecond
        break

      default:
        newFirst = runnerFirst
        newSecond = runnerSecond
        newThird = runnerThird
    }

    return {
      newRunners: {
        ...gameState,
        runnerFirst: newFirst,
        runnerSecond: newSecond,
        runnerThird: newThird,
      },
      runsScored
    }
  }

  const completeAtBat = async (
    result: string, 
    hitType?: string, 
    gridX?: number, 
    gridY?: number,
    fieldedBy?: string,
    manualRbi?: number
  ) => {
    if (!currentAtBat) return

    // Calculate runner advancement and RBIs
    const { newRunners, runsScored } = advanceRunners(result)
    const rbi = manualRbi ?? runsScored

    console.log('Completing at-bat:', { result, rbi, runsScored })

    const { error: updateError } = await supabase
      .from('at_bats')
      .update({
        result,
        hit_type: hitType || null,
        hit_grid_x: gridX ?? null,
        hit_grid_y: gridY ?? null,
        fielded_by: fieldedBy || null,
        pitch_count: pitchCount,
        rbi
      })
      .eq('id', currentAtBat.id)

    if (updateError) {
      console.error('Error updating at-bat:', updateError)
      setError(`Failed to update at-bat: ${updateError.message}`)
      setLoading(false)
      return
    }

    // Handle outs
    const isOut = ['strikeout_swinging', 'strikeout_looking', 'groundout', 'flyout', 
      'lineout', 'popout', 'force_out', 'tag_out', 'double_play', 'fielders_choice'].includes(result)
    
    let newOuts = gameState.outs
    let newInning = gameState.inning
    let newIsTopInning = gameState.isTopInning
    let clearRunners = false

    if (isOut) {
      newOuts = result === 'double_play' ? gameState.outs + 2 : gameState.outs + 1
      
      if (newOuts >= 3) {
        // Side retired
        clearRunners = true
        newOuts = 0
        if (gameState.isTopInning) {
          newIsTopInning = false
        } else {
          newIsTopInning = true
          newInning = gameState.inning + 1
        }
      }
    }

    // Update scores
    const newHomeScore = gameState.homeScore + (isHomeBatting ? rbi : 0)
    const newAwayScore = gameState.awayScore + (!isHomeBatting ? rbi : 0)

    // Save new base state to database
    await supabase
      .from('base_states')
      .insert({
        session_id: session.id,
        inning: newInning,
        is_top_inning: newIsTopInning,
        outs: newOuts,
        home_score: newHomeScore,
        away_score: newAwayScore,
      })

    // Update local game state
    setGameState({
      inning: newInning,
      isTopInning: newIsTopInning,
      outs: newOuts,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      runnerFirst: clearRunners ? null : newRunners.runnerFirst,
      runnerSecond: clearRunners ? null : newRunners.runnerSecond,
      runnerThird: clearRunners ? null : newRunners.runnerThird,
    })

    // Refresh plays from database
    const { data: plays } = await supabase
      .from('at_bats')
      .select(`
        id, inning, is_home_team, result, rbi,
        batter:profiles!at_bats_batter_profile_id_fkey(full_name),
        opponent_batter:opponent_players!at_bats_batter_opponent_id_fkey(name)
      `)
      .eq('session_id', session.id)
      .neq('result', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('Fetched plays:', plays)
    setRecentPlays(plays || [])
    
    // Clear current at-bat to trigger new one
    setCurrentAtBat(null)
    setLoading(false)
  }

  const handleBallInPlayComplete = (hitType: string, outcome: string) => {
    setShowBallInPlay(false)
    setPendingPlay({ hitType, outcome })
    
    // For outs, show field picker to record where ball was fielded
    if (outcome === 'out') {
      setShowFieldPicker(true)
    } else if (['single', 'double', 'triple', 'error'].includes(outcome)) {
      // For hits, show field picker for hit location
      setShowFieldPicker(true)
    } else if (outcome === 'home_run') {
      // Home runs don't need field location
      completeAtBat('home_run', hitType)
    } else {
      // Fielder's choice etc
      setShowFieldPicker(true)
    }
  }

  const handleFieldLocationSelect = (x: number, y: number, position: string) => {
    setShowFieldPicker(false)
    
    if (pendingPlay) {
      const result = pendingPlay.outcome === 'out' ? getOutType(pendingPlay.hitType) : pendingPlay.outcome
      completeAtBat(result as AtBatResult, pendingPlay.hitType as HitType, x, y, position)
      setPendingPlay(null)
    }
  }

  const getOutType = (hitType: string): string => {
    switch (hitType) {
      case 'ground_ball':
      case 'hard_ground_ball':
      case 'bunt':
        return 'groundout'
      case 'fly_ball':
        return 'flyout'
      case 'line_drive':
        return 'lineout'
      case 'pop_fly':
        return 'popout'
      default:
        return 'groundout'
    }
  }

  const handleRunnerAdvancementComplete = (movements: any[], runsScored: number) => {
    setShowRunnerModal(false)
    
    if (pendingPlay) {
      const result = pendingPlay.outcome === 'out' ? getOutType(pendingPlay.hitType) : pendingPlay.outcome
      completeAtBat(
        result as AtBatResult, 
        pendingPlay.hitType as HitType, 
        pendingPlay.gridX, 
        pendingPlay.gridY, 
        pendingPlay.fieldedBy,
        runsScored
      )
      setPendingPlay(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link href={`/schedule/${session.event_id}`} className="text-gray-500">
          ← Exit
        </Link>
        <span className="font-medium text-sm">Scoring</span>
        <button className="text-blue-600 text-sm">Pause</button>
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Score Header */}
      <div className="bg-gray-900 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-xs text-gray-400">{awayTeamName}</div>
            <div className="text-2xl font-bold">{gameState.awayScore}</div>
          </div>
          <div className="text-center px-4">
            <div className="text-xs text-gray-400">
              {gameState.isTopInning ? 'Top' : 'Bot'}
            </div>
            <div className="text-lg font-bold">{gameState.inning}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-xs text-gray-400">{homeTeamName}</div>
            <div className="text-2xl font-bold">{gameState.homeScore}</div>
          </div>
        </div>
      </div>

      {/* Diamond and Count */}
      <DiamondDisplay
        runnerFirst={!!gameState.runnerFirst}
        runnerSecond={!!gameState.runnerSecond}
        runnerThird={!!gameState.runnerThird}
        balls={balls}
        strikes={strikes}
        outs={gameState.outs}
      />

      {/* Current Batter */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="text-sm text-gray-500">At Bat</div>
        <div className="font-semibold text-lg">{getCurrentBatterName()}</div>
        <div className="text-xs text-gray-400">
          {gameState.isTopInning ? awayTeamName : homeTeamName} batting • #{currentBatterIndex + 1} in order
        </div>
      </div>

      {/* Pitch Buttons */}
      <PitchButtons
        onBall={() => recordPitch('ball')}
        onStrike={() => recordPitch('strike_swinging')}
        onFoul={() => recordPitch('strike_foul')}
        onBallInPlay={() => setShowBallInPlay(true)}
        onHitByPitch={() => recordPitch('hit_by_pitch')}
        disabled={loading || !currentAtBat}
        balls={balls}
        strikes={strikes}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="bg-blue-50 px-4 py-2 text-blue-700 text-sm text-center">
          Processing...
        </div>
      )}

      {/* Play by Play Log */}
      <div className="flex-1 overflow-auto">
        <PlayByPlayLog plays={recentPlays} />
      </div>

      {/* Modals */}
      <BallInPlayMenu
        isOpen={showBallInPlay}
        onClose={() => setShowBallInPlay(false)}
        onComplete={handleBallInPlayComplete}
      />

      <FieldLocationPicker
        isOpen={showFieldPicker}
        onClose={() => {
          setShowFieldPicker(false)
          setPendingPlay(null)
        }}
        onSelect={handleFieldLocationSelect}
      />

      <RunnerAdvancementModal
        isOpen={showRunnerModal}
        runners={[
          ...(gameState.runnerFirst ? [{ id: gameState.runnerFirst.id, name: gameState.runnerFirst.name, fromBase: 'first' as const, isOpponent: gameState.runnerFirst.isOpponent }] : []),
          ...(gameState.runnerSecond ? [{ id: gameState.runnerSecond.id, name: gameState.runnerSecond.name, fromBase: 'second' as const, isOpponent: gameState.runnerSecond.isOpponent }] : []),
          ...(gameState.runnerThird ? [{ id: gameState.runnerThird.id, name: gameState.runnerThird.name, fromBase: 'third' as const, isOpponent: gameState.runnerThird.isOpponent }] : []),
        ]}
        batterName={getCurrentBatterName()}
        outcome={pendingPlay?.outcome || ''}
        onComplete={handleRunnerAdvancementComplete}
        onClose={() => {
          setShowRunnerModal(false)
          setPendingPlay(null)
        }}
      />
    </div>
  )
}