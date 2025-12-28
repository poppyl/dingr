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
    runnerFirst: currentState?.runner_first_profile_id || currentState?.runner_first_opponent_id || null,
    runnerSecond: currentState?.runner_second_profile_id || currentState?.runner_second_opponent_id || null,
    runnerThird: currentState?.runner_third_profile_id || currentState?.runner_third_opponent_id || null,
  })

  // At-bat state
  const [currentAtBat, setCurrentAtBat] = useState(initialAtBat)
  const [balls, setBalls] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [pitchCount, setPitchCount] = useState(initialAtBat?.pitches?.length || 0)

  // UI state
  const [showBallInPlay, setShowBallInPlay] = useState(false)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [showRunnerModal, setShowRunnerModal] = useState(false)
  const [pendingPlay, setPendingPlay] = useState<{hitType: string, outcome: string} | null>(null)
  const [recentPlays, setRecentPlays] = useState(initialPlays)
  const [loading, setLoading] = useState(false)

  // Determine current batter
  const isHomeBatting = !gameState.isTopInning
  const battingLineup = isHomeBatting ? homeLineup : awayPlayers
  const currentBatterIndex = (recentPlays.filter(p => p.is_home_team === isHomeBatting).length) % 9

  const event = session.event
  const homeTeamName = event?.home_team?.name || 'Home'
  const awayTeamName = event?.away_team?.name || 'Away'

  // Start new at-bat if needed
  useEffect(() => {
    if (!currentAtBat && battingLineup.length > 0) {
      startNewAtBat()
    }
  }, [currentAtBat, battingLineup])

  const startNewAtBat = async () => {
    const batter = battingLineup[currentBatterIndex]
    if (!batter) return

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
      atBatData.batter_profile_id = (batter as LineupPlayer).player.id
    } else {
      atBatData.batter_opponent_id = (batter as OpponentPlayer).id
    }

    const { data, error } = await supabase
      .from('at_bats')
      .insert(atBatData)
      .select()
      .single()

    if (data) {
      setCurrentAtBat(data)
      setBalls(0)
      setStrikes(0)
      setPitchCount(0)
    }
  }

  const recordPitch = async (result: string) => {
    if (!currentAtBat || loading) return
    setLoading(true)

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

    if (!error) {
      setPitchCount(prev => prev + 1)
      
      // Update count based on result
      if (result === 'ball') {
        if (balls >= 3) {
          // Walk
          await completeAtBat('walk')
        } else {
          setBalls(prev => prev + 1)
        }
      } else if (result === 'strike_called' || result === 'strike_swinging') {
        if (strikes >= 2) {
          // Strikeout
          await completeAtBat(result === 'strike_swinging' ? 'strikeout_swinging' : 'strikeout_looking')
        } else {
          setStrikes(prev => prev + 1)
        }
      } else if (result === 'strike_foul') {
        if (strikes < 2) {
          setStrikes(prev => prev + 1)
        }
        // Foul with 2 strikes doesn't change count
      } else if (result === 'hit_by_pitch') {
        await completeAtBat('hit_by_pitch')
      }
    }

    setLoading(false)
  }

  const completeAtBat = async (
    result: string, 
    hitType?: string, 
    gridX?: number, 
    gridY?: number,
    fieldedBy?: string,
    rbi: number = 0
  ) => {
    if (!currentAtBat) return

    await supabase
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

    // Handle outs
    const isOut = ['strikeout_swinging', 'strikeout_looking', 'groundout', 'flyout', 
      'lineout', 'popout', 'force_out', 'tag_out', 'double_play'].includes(result)
    
    let newOuts = gameState.outs
    if (isOut) {
      newOuts = result === 'double_play' ? gameState.outs + 2 : gameState.outs + 1
    }

    // Check for inning change
    if (newOuts >= 3) {
      if (gameState.isTopInning) {
        // Switch to bottom of inning
        setGameState(prev => ({
          ...prev,
          isTopInning: false,
          outs: 0,
          runnerFirst: null,
          runnerSecond: null,
          runnerThird: null
        }))
      } else {
        // Next inning
        setGameState(prev => ({
          ...prev,
          inning: prev.inning + 1,
          isTopInning: true,
          outs: 0,
          runnerFirst: null,
          runnerSecond: null,
          runnerThird: null
        }))
      }
      newOuts = 0
    } else {
      setGameState(prev => ({ ...prev, outs: newOuts }))
    }

    // Save new base state
    await supabase
      .from('base_states')
      .insert({
        session_id: session.id,
        after_at_bat_id: currentAtBat.id,
        inning: newOuts >= 3 ? (gameState.isTopInning ? gameState.inning : gameState.inning + 1) : gameState.inning,
        is_top_inning: newOuts >= 3 ? !gameState.isTopInning : gameState.isTopInning,
        outs: newOuts >= 3 ? 0 : newOuts,
        home_score: gameState.homeScore + (isHomeBatting ? rbi : 0),
        away_score: gameState.awayScore + (!isHomeBatting ? rbi : 0),
        // TODO: Update runner positions based on play
      })

    // Update score if runs scored
    if (rbi > 0) {
      setGameState(prev => ({
        ...prev,
        homeScore: prev.homeScore + (isHomeBatting ? rbi : 0),
        awayScore: prev.awayScore + (!isHomeBatting ? rbi : 0)
      }))
    }

    // Refresh plays and start new at-bat
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

    setRecentPlays(plays || [])
    setCurrentAtBat(null)
  }

  const handleBallInPlayComplete = (hitType: string, outcome: string) => {
    setShowBallInPlay(false)
    setPendingPlay({ hitType, outcome })
    
    // For hits and errors, show field picker
    if (['single', 'double', 'triple', 'home_run', 'error', 'out'].includes(outcome)) {
      setShowFieldPicker(true)
    } else {
      // Fielder's choice etc - skip to runner modal or complete
      setShowRunnerModal(true)
    }
  }

  const handleFieldLocationSelect = (x: number, y: number, position: string) => {
    setShowFieldPicker(false)
    
    if (pendingPlay) {
      // Check if there are runners to advance
      if (gameState.runnerFirst || gameState.runnerSecond || gameState.runnerThird) {
        setShowRunnerModal(true)
      } else {
        // No runners - complete the play
        const result = pendingPlay.outcome === 'out' ? 'groundout' : pendingPlay.outcome
        completeAtBat(result as AtBatResult, pendingPlay.hitType as HitType, x, y, position)
        setPendingPlay(null)
      }
    }
  }

  const handleRunnerAdvancementComplete = (movements: any[], runsScored: number) => {
    setShowRunnerModal(false)
    
    if (pendingPlay) {
      const result = pendingPlay.outcome === 'out' ? 'groundout' : pendingPlay.outcome
      completeAtBat(result as AtBatResult, pendingPlay.hitType as HitType, undefined, undefined, undefined, runsScored)
      setPendingPlay(null)
    }
  }

  // Get current batter name
  const getCurrentBatterName = () => {
    const batter = battingLineup[currentBatterIndex]
    if (!batter) return 'Unknown'
    if (isHomeBatting) {
      return (batter as LineupPlayer).player?.full_name || 'Unknown'
    }
    return (batter as OpponentPlayer).name || 'Unknown'
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
        runners={[]} // TODO: Build runner list from gameState
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
