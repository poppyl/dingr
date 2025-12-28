'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import DiamondDisplay from './diamond-display'
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

interface GameState {
  inning: number
  isTopInning: boolean
  outs: number
  homeScore: number
  awayScore: number
  runnerFirst: Runner | null
  runnerSecond: Runner | null
  runnerThird: Runner | null
}

interface DemoPlayer {
  id: string
  name: string
  jersey_number: number
}

// Demo lineup data
const DEMO_HOME_LINEUP: DemoPlayer[] = [
  { id: 'demo-home-1', name: 'Casey Mitchell', jersey_number: 7 },
  { id: 'demo-home-2', name: 'Jordan Rivera', jersey_number: 23 },
  { id: 'demo-home-3', name: 'Alex Thompson', jersey_number: 12 },
  { id: 'demo-home-4', name: 'Sam Williams', jersey_number: 44 },
  { id: 'demo-home-5', name: 'Taylor Brown', jersey_number: 3 },
  { id: 'demo-home-6', name: 'Morgan Davis', jersey_number: 15 },
  { id: 'demo-home-7', name: 'Riley Johnson', jersey_number: 8 },
  { id: 'demo-home-8', name: 'Jamie Garcia', jersey_number: 21 },
  { id: 'demo-home-9', name: 'Drew Martinez', jersey_number: 5 },
]

const DEMO_AWAY_LINEUP: DemoPlayer[] = [
  { id: 'demo-away-1', name: 'Chris Anderson', jersey_number: 2 },
  { id: 'demo-away-2', name: 'Pat O\'Brien', jersey_number: 17 },
  { id: 'demo-away-3', name: 'Kelly Wong', jersey_number: 9 },
  { id: 'demo-away-4', name: 'Quinn Foster', jersey_number: 32 },
  { id: 'demo-away-5', name: 'Blake Torres', jersey_number: 11 },
  { id: 'demo-away-6', name: 'Avery Nelson', jersey_number: 6 },
  { id: 'demo-away-7', name: 'Jesse Cooper', jersey_number: 25 },
  { id: 'demo-away-8', name: 'Cameron Reed', jersey_number: 14 },
  { id: 'demo-away-9', name: 'Skyler Hughes', jersey_number: 4 },
]

interface ActionSnapshot {
  type: 'pitch' | 'at_bat' | 'runner'
  description: string
  gameState: GameState
  balls: number
  strikes: number
  homeBatterIndex: number
  awayBatterIndex: number
  atBatDbId?: string
  pitchDbId?: string
  recentPlays: any[]
}

interface InningScore {
  inning: number
  homeRuns: number
  awayRuns: number
}

export default function ScoringInterface({
  session,
  currentState,
  homeLineup: initialHomeLineup,
  awayPlayers: initialAwayPlayers,
  currentAtBat: initialAtBat,
  recentPlays: initialPlays,
  userId
}: ScoringInterfaceProps) {
  const supabase = createClient()

  // ===== TEAM NAMES - Get actual names from the event =====
  // The session query uses: home_team:teams!events_team_id_fkey and away_team:opponent_teams
  const getTeamNames = () => {
    const event = session?.event
    
    if (!event) {
      return { homeTeamName: 'Home Team', awayTeamName: 'Away Team' }
    }
    
    // home_team is our Edinburgh team (from teams table)
    // away_team is the opponent (from opponent_teams table)
    const ourTeam = event.home_team?.name || 'Edinburgh'
    const opponentTeam = event.away_team?.name || 'Opponent'
    
    // If it's a home game, we're home. Otherwise opponent is home
    if (event.is_home_game) {
      return { homeTeamName: ourTeam, awayTeamName: opponentTeam }
    } else {
      return { homeTeamName: opponentTeam, awayTeamName: ourTeam }
    }
  }
  
  const { homeTeamName, awayTeamName } = getTeamNames()

  // ===== DEMO MODE =====
  const [demoMode, setDemoMode] = useState(false)
  const [showDemoPrompt, setShowDemoPrompt] = useState(false)
  const [needsNewAtBat, setNeedsNewAtBat] = useState(false)

  // ===== GAME STATE =====
  const [gameState, setGameState] = useState<GameState>({
    inning: currentState?.inning || 1,
    isTopInning: currentState?.is_top_inning ?? true,
    outs: currentState?.outs || 0,
    homeScore: currentState?.home_score || 0,
    awayScore: currentState?.away_score || 0,
    runnerFirst: null,
    runnerSecond: null,
    runnerThird: null,
  })

  // ===== AT-BAT STATE =====
  const [currentAtBat, setCurrentAtBat] = useState<any>(initialAtBat)
  const [balls, setBalls] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [pitchCount, setPitchCount] = useState(initialAtBat?.pitches?.length || 0)
  const [homeBatterIndex, setHomeBatterIndex] = useState(0)
  const [awayBatterIndex, setAwayBatterIndex] = useState(0)

  // ===== UI STATE =====
  const [showBallInPlay, setShowBallInPlay] = useState(false)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [showRunnerModal, setShowRunnerModal] = useState(false)
  const [pendingPlay, setPendingPlay] = useState<{hitType: string, outcome: string} | null>(null)
  const [recentPlays, setRecentPlays] = useState<any[]>(initialPlays || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [actionHistory, setActionHistory] = useState<ActionSnapshot[]>([])
  const [activityFeed, setActivityFeed] = useState<string[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [offlineQueue, setOfflineQueue] = useState<any[]>([])
  const [scoringMode, setScoringMode] = useState(false)
  
  // Initialize inning scores for all innings from 1 to current
  const initialInning = currentState?.inning || 1
  const [inningScores, setInningScores] = useState<InningScore[]>(() => {
    const scores: InningScore[] = []
    for (let i = 1; i <= initialInning; i++) {
      scores.push({ inning: i, homeRuns: 0, awayRuns: 0 })
    }
    return scores
  })

  // ===== LINEUP MANAGEMENT =====
  const homeLineup = demoMode ? DEMO_HOME_LINEUP : initialHomeLineup
  const awayPlayers = demoMode ? DEMO_AWAY_LINEUP : initialAwayPlayers

  // Check if we need demo mode
  useEffect(() => {
    const hasNoLineup = (!initialHomeLineup || initialHomeLineup.length === 0) && 
                        (!initialAwayPlayers || initialAwayPlayers.length === 0)
    if (hasNoLineup && !demoMode) {
      setShowDemoPrompt(true)
    }
  }, [initialHomeLineup, initialAwayPlayers, demoMode])

  // ===== CURRENT BATTER LOGIC =====
  const isHomeBatting = !gameState.isTopInning
  const currentBatterIndex = isHomeBatting ? homeBatterIndex : awayBatterIndex

  const getCurrentBatter = useCallback(() => {
    if (isHomeBatting) {
      const index = homeBatterIndex % homeLineup.length
      return homeLineup[index] || homeLineup[0]
    } else {
      const index = awayBatterIndex % awayPlayers.length
      return awayPlayers[index] || awayPlayers[0]
    }
  }, [isHomeBatting, homeBatterIndex, awayBatterIndex, homeLineup, awayPlayers])

  const getCurrentBatterName = useCallback(() => {
    const batter = getCurrentBatter()
    if (!batter) return 'Unknown Batter'
    
    if (demoMode) {
      return (batter as DemoPlayer).name
    }
    
    if (isHomeBatting) {
      return (batter as LineupPlayer).player?.full_name || 'Unknown'
    } else {
      return (batter as OpponentPlayer).name || 'Unknown'
    }
  }, [getCurrentBatter, demoMode, isHomeBatting])

  const getCurrentBatterJersey = useCallback((): number | undefined => {
    const batter = getCurrentBatter()
    if (!batter) return undefined
    
    if (demoMode) {
      return (batter as DemoPlayer).jersey_number
    }
    
    if (isHomeBatting) {
      // LineupPlayer type doesn't include jersey_number, but it may come from database join
      return (batter as any).jersey_number ?? undefined
    } else {
      return (batter as OpponentPlayer).jersey_number ?? undefined
    }
  }, [getCurrentBatter, demoMode, isHomeBatting])

  // ===== UNDO FUNCTIONALITY =====
  const saveSnapshot = useCallback((type: ActionSnapshot['type'], description: string, atBatDbId?: string, pitchDbId?: string) => {
    const snapshot: ActionSnapshot = {
      type,
      description,
      gameState: { ...gameState },
      balls,
      strikes,
      homeBatterIndex,
      awayBatterIndex,
      atBatDbId,
      pitchDbId,
      recentPlays: [...recentPlays],
    }
    setActionHistory((prev: ActionSnapshot[]) => [snapshot, ...prev].slice(0, 20))
  }, [gameState, balls, strikes, homeBatterIndex, awayBatterIndex, recentPlays])

  const undoLastAction = useCallback(async () => {
    if (actionHistory.length === 0) return
    
    const [lastAction, ...remaining] = actionHistory
    setLoading(true)

    try {
      // Delete from database if needed
      if (lastAction.pitchDbId) {
        await supabase.from('pitches').delete().eq('id', lastAction.pitchDbId)
      }
      if (lastAction.atBatDbId && lastAction.type === 'at_bat') {
        await supabase.from('at_bats').delete().eq('id', lastAction.atBatDbId)
      }

      // Restore state
      setGameState(lastAction.gameState)
      setBalls(lastAction.balls)
      setStrikes(lastAction.strikes)
      setHomeBatterIndex(lastAction.homeBatterIndex)
      setAwayBatterIndex(lastAction.awayBatterIndex)
      setRecentPlays(lastAction.recentPlays)
      setActionHistory(remaining)
      
      addActivity(`Undid: ${lastAction.description}`)
    } catch (err) {
      console.error('Undo error:', err)
    } finally {
      setLoading(false)
    }
  }, [actionHistory, supabase])

  // ===== ACTIVITY FEED =====
  const addActivity = useCallback((message: string) => {
    setActivityFeed((prev: string[]) => [message, ...prev].slice(0, 50))
  }, [])

  // ===== CREATE NEW AT-BAT =====
  const createNewAtBat = useCallback(async () => {
    if (demoMode) {
      const batter = getCurrentBatter() as DemoPlayer
      setCurrentAtBat({
        id: `demo-at-bat-${Date.now()}`,
        _isDemo: true,
        _demoBatterName: batter?.name || 'Demo Batter',
        _demoBatterJersey: batter?.jersey_number,
      })
      setBalls(0)
      setStrikes(0)
      setPitchCount(0)
      setNeedsNewAtBat(false)
      addActivity(`New at-bat: ${batter?.name || 'Demo Batter'}`)
      return
    }

    try {
      const isHomeBattingNow = !gameState.isTopInning
      const batter = getCurrentBatter()
      
      const atBatData: any = {
        event_id: session.event_id,
        inning: gameState.inning,
        is_home_team: isHomeBattingNow,
        result: 'in_progress',
        rbi: 0,
        scored_by_profile_id: userId,
        status: 'draft',
      }

      if (isHomeBattingNow && batter) {
        atBatData.batter_profile_id = (batter as LineupPlayer).player?.id
      } else if (!isHomeBattingNow && batter) {
        atBatData.batter_opponent_id = (batter as OpponentPlayer).id
      }

      const { data, error } = await supabase
        .from('at_bats')
        .insert(atBatData)
        .select()
        .single()

      if (error) throw error

      setCurrentAtBat(data)
      setBalls(0)
      setStrikes(0)
      setPitchCount(0)
      setNeedsNewAtBat(false)
      addActivity(`New at-bat: ${getCurrentBatterName()}`)
    } catch (err) {
      console.error('Error creating at-bat:', err)
      setError('Failed to create at-bat')
    }
  }, [demoMode, gameState, getCurrentBatter, getCurrentBatterName, session, userId, supabase, addActivity])

  // Auto-create at-bat when needed (combines both triggers)
  useEffect(() => {
    // Only create if we don't have an at-bat and either:
    // 1. needsNewAtBat flag is set, OR
    // 2. Initial load with lineup available
    const shouldCreate = !currentAtBat && !showDemoPrompt && (
      needsNewAtBat || 
      homeLineup.length > 0 || 
      awayPlayers.length > 0 || 
      demoMode
    )
    
    if (shouldCreate) {
      createNewAtBat()
    }
  }, [needsNewAtBat, currentAtBat, showDemoPrompt, homeLineup.length, awayPlayers.length, demoMode, createNewAtBat])

  // ===== RECORD PITCH =====
  const recordPitch = useCallback(async (type: string) => {
    if (!currentAtBat) return
    setLoading(true)

    const description = type === 'ball' ? 'Ball' : 
                       type === 'strike_swinging' ? 'Strike (swinging)' :
                       type === 'strike_looking' ? 'Strike (called)' :
                       type === 'strike_foul' ? 'Foul ball' :
                       type === 'hit_by_pitch' ? 'Hit by pitch' : type

    try {
      let pitchDbId: string | undefined

      if (!demoMode) {
        // Map pitch types to valid database result values
        // Valid: ball, strike_called, strike_swinging, strike_foul, strike_foul_tip, 
        //        in_play, hit_by_pitch, balk, wild_pitch, passed_ball, pickoff_attempt, pitchout
        const dbResult = type === 'ball' ? 'ball' :
                         type === 'strike_swinging' ? 'strike_swinging' :
                         type === 'strike_looking' ? 'strike_called' :
                         type === 'strike_foul' ? 'strike_foul' :
                         type === 'hit_by_pitch' ? 'hit_by_pitch' : 'ball'
        
        // Validate required IDs before attempting database insert
        if (!session?.id) {
          console.warn('Skipping pitch insert - no session ID')
        } else if (!currentAtBat.id || currentAtBat.id.startsWith('demo-')) {
          console.warn('Skipping pitch insert - invalid at-bat ID:', currentAtBat.id)
        } else {
          console.log('Inserting pitch:', { session_id: session.id, at_bat_id: currentAtBat.id, result: dbResult })
          const { data, error } = await supabase
            .from('pitches')
            .insert({
              session_id: session.id,
              at_bat_id: currentAtBat.id,
              inning: gameState.inning,
              is_top_inning: gameState.isTopInning,
              balls: balls,
              strikes: strikes,
              outs: gameState.outs,
              pitch_number: pitchCount + 1,
              pitch_type: type,
              result: dbResult,
            })
            .select('id')
            .single()

          if (error) {
            console.error('Supabase pitch insert error:', error.message, error.code, error.details)
            throw error
          }
          pitchDbId = data.id
        }
      }

      saveSnapshot('pitch', description, undefined, pitchDbId)
      setPitchCount((prev: number) => prev + 1)
      addActivity(description)

      // Handle pitch result
      if (type === 'ball') {
        if (balls >= 3) {
          await completeAtBat('walk', 0)
        } else {
          setBalls((prev: number) => prev + 1)
        }
      } else if (type === 'strike_swinging' || type === 'strike_looking') {
        if (strikes >= 2) {
          await completeAtBat(type === 'strike_looking' ? 'strikeout_looking' : 'strikeout_swinging', 0)
        } else {
          setStrikes((prev: number) => prev + 1)
        }
      } else if (type === 'strike_foul') {
        if (strikes < 2) {
          setStrikes((prev: number) => prev + 1)
        }
      } else if (type === 'hit_by_pitch') {
        await completeAtBat('hit_by_pitch', 0)
      }
    } catch (err: any) {
      console.error('Error recording pitch:', JSON.stringify(err, null, 2), err?.message, err?.code)
      setError('Failed to record pitch')
    } finally {
      setLoading(false)
    }
  }, [currentAtBat, balls, strikes, pitchCount, demoMode, supabase, saveSnapshot, addActivity, session, gameState])

  // ===== COMPLETE AT-BAT =====
  const completeAtBat = useCallback(async (result: string, rbi: number, hitType?: string, gridX?: number, gridY?: number) => {
    if (!currentAtBat) return
    setLoading(true)

    const batterName = demoMode ? currentAtBat._demoBatterName : getCurrentBatterName()

    try {
      if (!demoMode && currentAtBat.id && !currentAtBat.id.startsWith('demo-')) {
        const { error } = await supabase
          .from('at_bats')
          .update({
            result,
            rbi,
            hit_type: hitType || null,
            hit_grid_x: gridX || null,
            hit_grid_y: gridY || null,
            status: 'official',
          })
          .eq('id', currentAtBat.id)
        
        if (error) {
          console.error('Supabase at_bat update error:', error.message, error.code, error.details)
        }
      }

      saveSnapshot('at_bat', `${batterName} ${result}`, currentAtBat.id)

      // Create play for log with proper batter name
      const newPlay = {
        id: currentAtBat.id || `demo-${Date.now()}`,
        inning: gameState.inning,
        is_home_team: !gameState.isTopInning,
        result,
        rbi,
        _demoBatterName: batterName,
        batter: !gameState.isTopInning ? { full_name: batterName } : null,
        opponent_batter: gameState.isTopInning ? { name: batterName } : null,
      }
      setRecentPlays((prev: any[]) => [newPlay, ...prev].slice(0, 50))

      // Update score if RBIs
      if (rbi > 0) {
        if (!gameState.isTopInning) {
          setGameState((prev: GameState) => ({ ...prev, homeScore: prev.homeScore + rbi }))
          updateInningScore(gameState.inning, rbi, true)
        } else {
          setGameState((prev: GameState) => ({ ...prev, awayScore: prev.awayScore + rbi }))
          updateInningScore(gameState.inning, rbi, false)
        }
      }

      // Check for out
      const isOut = ['strikeout_swinging', 'strikeout_looking', 'groundout', 'flyout', 'lineout', 'popout', 'double_play'].includes(result)
      const outsFromPlay = result === 'double_play' ? 2 : (isOut ? 1 : 0)

      if (outsFromPlay > 0) {
        const newOuts = gameState.outs + outsFromPlay
        if (newOuts >= 3) {
          // Inning change
          if (!gameState.isTopInning) {
            // End of inning
            setGameState((prev: GameState) => ({
              ...prev,
              inning: prev.inning + 1,
              isTopInning: true,
              outs: 0,
              runnerFirst: null,
              runnerSecond: null,
              runnerThird: null,
            }))
            ensureInningScore(gameState.inning + 1)
          } else {
            // Switch to bottom
            setGameState((prev: GameState) => ({
              ...prev,
              isTopInning: false,
              outs: 0,
              runnerFirst: null,
              runnerSecond: null,
              runnerThird: null,
            }))
          }
          addActivity('3 outs - side retired')
        } else {
          setGameState((prev: GameState) => ({ ...prev, outs: newOuts }))
        }
      }

      // Advance batter
      if (isHomeBatting) {
        setHomeBatterIndex((prev: number) => (prev + 1) % 9)
      } else {
        setAwayBatterIndex((prev: number) => (prev + 1) % 9)
      }


      // Runner advancement for hits
      if (['single', 'double', 'triple', 'home_run', 'walk', 'hit_by_pitch'].includes(result)) {
        advanceRunners(result, batterName)
      }

      addActivity(`${batterName} ${result.replace(/_/g, ' ')}${rbi > 0 ? ` (${rbi} RBI)` : ''}`)
      setCurrentAtBat(null)
      setNeedsNewAtBat(true)
    } catch (err) {
      console.error('Error completing at-bat:', err)
      setError('Failed to complete at-bat')
    } finally {
      setLoading(false)
    }
  }, [currentAtBat, demoMode, gameState, isHomeBatting, getCurrentBatterName, saveSnapshot, addActivity, supabase])

  // ===== RUNNER ADVANCEMENT =====
  const advanceRunners = useCallback((result: string, batterName: string) => {
    const newRunner: Runner = { id: `runner-${Date.now()}`, name: batterName, isOpponent: gameState.isTopInning }

    setGameState((prev: GameState) => {
      let newState = { ...prev }
      let runsScored = 0

      if (result === 'home_run') {
        // Everyone scores
        if (prev.runnerThird) runsScored++
        if (prev.runnerSecond) runsScored++
        if (prev.runnerFirst) runsScored++
        runsScored++ // Batter scores
        newState.runnerFirst = null
        newState.runnerSecond = null
        newState.runnerThird = null
      } else if (result === 'triple') {
        if (prev.runnerThird) runsScored++
        if (prev.runnerSecond) runsScored++
        if (prev.runnerFirst) runsScored++
        newState.runnerFirst = null
        newState.runnerSecond = null
        newState.runnerThird = newRunner
      } else if (result === 'double') {
        if (prev.runnerThird) runsScored++
        if (prev.runnerSecond) runsScored++
        newState.runnerThird = prev.runnerFirst
        newState.runnerFirst = null
        newState.runnerSecond = newRunner
      } else if (result === 'single' || result === 'walk' || result === 'hit_by_pitch') {
        if (prev.runnerThird) runsScored++
        newState.runnerThird = prev.runnerSecond
        newState.runnerSecond = prev.runnerFirst
        newState.runnerFirst = newRunner
      }

      // Update score from runner advancement
      if (runsScored > 0) {
        if (!prev.isTopInning) {
          newState.homeScore = prev.homeScore + runsScored
        } else {
          newState.awayScore = prev.awayScore + runsScored
        }
      }

      return newState
    })
  }, [gameState.isTopInning])

  // ===== INNING SCORES =====
  const ensureInningScore = (inning: number) => {
    setInningScores((prev: InningScore[]) => {
      if (prev.find(s => s.inning === inning)) return prev
      return [...prev, { inning, homeRuns: 0, awayRuns: 0 }]
    })
  }

  const updateInningScore = (inning: number, runs: number, isHome: boolean) => {
    setInningScores((prev: InningScore[]) => prev.map(score => 
      score.inning === inning 
        ? { ...score, [isHome ? 'homeRuns' : 'awayRuns']: score[isHome ? 'homeRuns' : 'awayRuns'] + runs }
        : score
    ))
  }

  // ===== BALL IN PLAY HANDLERS =====
  const handleBallInPlayComplete = (hitType: string, outcome: string) => {
    setShowBallInPlay(false)
    
    const isHit = ['single', 'double', 'triple', 'home_run'].includes(outcome)
    const needsLocation = isHit || ['groundout', 'flyout', 'lineout', 'popout'].includes(outcome)
    
    if (needsLocation) {
      setPendingPlay({ hitType, outcome })
      setShowFieldPicker(true)
    } else {
      completeAtBat(outcome, 0, hitType)
    }
  }

  const handleFieldLocationSelect = (x: number, y: number) => {
    setShowFieldPicker(false)
    if (pendingPlay) {
      // Calculate RBIs based on outcome and runners
      let rbi = 0
      if (['single', 'double', 'triple'].includes(pendingPlay.outcome)) {
        if (gameState.runnerThird) rbi++
        if (pendingPlay.outcome === 'double' && gameState.runnerSecond) rbi++
        if (pendingPlay.outcome === 'triple') {
          if (gameState.runnerSecond) rbi++
          if (gameState.runnerFirst) rbi++
        }
      } else if (pendingPlay.outcome === 'home_run') {
        rbi = 1 + (gameState.runnerFirst ? 1 : 0) + (gameState.runnerSecond ? 1 : 0) + (gameState.runnerThird ? 1 : 0)
      }
      
      completeAtBat(pendingPlay.outcome, rbi, pendingPlay.hitType, x, y)
      setPendingPlay(null)
    }
  }

  // ===== QUICK RESULTS =====
  const quickWalk = () => {
    addActivity('Walk')
    completeAtBat('walk', 0)
  }

  const quickStrikeout = () => {
    addActivity('Strikeout')
    completeAtBat('strikeout_swinging', 0)
  }

  // ===== DEMO MODE PROMPT =====
  if (showDemoPrompt) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Lineups Set</h2>
          <p className="text-gray-600 mb-6">
            This game doesn&apos;t have lineups configured yet. Would you like to use demo mode with sample players?
          </p>
          <div className="flex gap-3">
            <Link
              href={`/schedule/${session.event_id}`}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl text-center"
            >
              Go Back
            </Link>
            <button
              onClick={() => {
                setDemoMode(true)
                setShowDemoPrompt(false)
                setCurrentAtBat(null)  // Clear any existing at-bat to trigger new demo at-bat
                setNeedsNewAtBat(true)
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700"
            >
              Try Demo Mode
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== MAIN UI =====
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href={`/schedule/${session.event_id}`} className="text-gray-500 text-sm">
          ← Exit
        </Link>
        <div className="flex items-center gap-2">
          {demoMode && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              Demo
            </span>
          )}
          {!isOnline && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              Offline
            </span>
          )}
          <span className="font-medium text-sm">Scoring</span>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="text-blue-600 text-sm font-medium"
          >
            Options
          </button>
          
          {showOptionsMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowOptionsMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50 py-1">
                <button
                  onClick={() => { setShowOptionsMenu(false); undoLastAction() }}
                  disabled={actionHistory.length === 0}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Undo ({actionHistory.length})
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Score Header - hidden in scoring mode */}
      {!scoringMode && (
        <div className="bg-gray-900 text-white">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between max-w-md mx-auto">
              <div className="text-center flex-1">
                <div className="text-xs text-gray-400">{awayTeamName}</div>
                <div className="text-2xl font-bold">{gameState.awayScore}</div>
              </div>
              <div className="text-center px-6">
                <div className="text-xs text-gray-400">
                  {gameState.isTopInning ? 'Top' : 'Bot'}
                </div>
                <div className="text-xl font-bold">{gameState.inning}</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-xs text-gray-400">{homeTeamName}</div>
                <div className="text-2xl font-bold">{gameState.homeScore}</div>
              </div>
            </div>
          </div>

          {/* Line Score */}
          <div className="border-t border-gray-800 px-2 py-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left px-2 w-20">Team</th>
                  {inningScores.map(score => (
                    <th key={score.inning} className={`px-2 w-6 text-center ${score.inning === gameState.inning ? 'text-yellow-400' : ''}`}>
                      {score.inning}
                    </th>
                  ))}
                  <th className="px-2 w-8 text-center border-l border-gray-700">R</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-left px-2 text-gray-300 truncate">{awayTeamName.substring(0, 10)}</td>
                  {inningScores.map(score => (
                    <td key={score.inning} className="px-2 text-center">{score.awayRuns}</td>
                  ))}
                  <td className="px-2 text-center font-bold border-l border-gray-700">{gameState.awayScore}</td>
                </tr>
                <tr>
                  <td className="text-left px-2 text-gray-300 truncate">{homeTeamName.substring(0, 10)}</td>
                  {inningScores.map(score => (
                    <td key={score.inning} className="px-2 text-center">{score.homeRuns}</td>
                  ))}
                  <td className="px-2 text-center font-bold border-l border-gray-700">{gameState.homeScore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Back to Overview - shown in scoring mode above diamond */}
      {scoringMode && (
        <div className="bg-white px-4 py-2 border-b">
          <button
            onClick={() => setScoringMode(false)}
            className="text-blue-600 text-sm font-medium"
          >
            ← Back to Overview
          </button>
        </div>
      )}

      {/* Diamond Display - contains count indicators */}
      <DiamondDisplay
        runnerFirst={!!gameState.runnerFirst}
        runnerSecond={!!gameState.runnerSecond}
        runnerThird={!!gameState.runnerThird}
        balls={balls}
        strikes={strikes}
        outs={gameState.outs}
      />

      {/* Current Batter - without duplicate count */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">At Bat</div>
            <div className="font-semibold text-lg">{getCurrentBatterName()}</div>
            <div className="text-xs text-gray-400">
              {gameState.isTopInning ? awayTeamName : homeTeamName} · #{currentBatterIndex + 1} in order
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-gray-800">
              {balls}–{strikes}
            </div>
            <div className="text-xs text-gray-400">{pitchCount} pitches</div>
          </div>
        </div>
      </div>

      {/* Conditional content based on scoring mode */}
      {scoringMode ? (
        /* ===== SCORING MODE VIEW ===== */
        <div className="flex-1 flex flex-col bg-gray-100">
          {/* Big Scoring Buttons - 2x3 grid */}
          <div className="p-4 grid grid-cols-2 gap-3">
            {/* Ball */}
            <button
              onClick={() => recordPitch('ball')}
              disabled={loading || !currentAtBat}
              className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 
                disabled:opacity-50 active:bg-gray-700 transition-colors"
            >
              <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-white text-2xl font-bold">B</span>
              </div>
              <span className="text-white text-sm font-medium">Ball</span>
            </button>

            {/* Called Strike */}
            <button
              onClick={() => recordPitch('strike_looking')}
              disabled={loading || !currentAtBat}
              className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 
                disabled:opacity-50 active:bg-gray-700 transition-colors"
            >
              <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-white text-2xl font-bold" style={{ transform: 'scaleX(-1)' }}>K</span>
              </div>
              <span className="text-white text-sm font-medium text-center">Called<br/>Strike</span>
            </button>

            {/* Swing & Miss */}
            <button
              onClick={() => recordPitch('strike_swinging')}
              disabled={loading || !currentAtBat}
              className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 
                disabled:opacity-50 active:bg-gray-700 transition-colors"
            >
              <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-white text-2xl font-bold">K</span>
              </div>
              <span className="text-white text-sm font-medium text-center">Swing &<br/>Miss</span>
            </button>

            {/* Foul */}
            <button
              onClick={() => recordPitch('strike_foul')}
              disabled={loading || !currentAtBat}
              className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 
                disabled:opacity-50 active:bg-gray-700 transition-colors"
            >
              <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-white text-2xl font-bold">F</span>
              </div>
              <span className="text-white text-sm font-medium">Foul</span>
            </button>

            {/* Ball In Play */}
            <button
              onClick={() => setShowBallInPlay(true)}
              disabled={loading || !currentAtBat}
              className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 
                disabled:opacity-50 active:bg-gray-700 transition-colors"
            >
              <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-xl">⚾</span>
              </div>
              <span className="text-white text-sm font-medium text-center">Ball In<br/>Play</span>
            </button>

            {/* Hit By Pitch */}
            <button
              onClick={() => recordPitch('hit_by_pitch')}
              disabled={loading || !currentAtBat}
              className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 
                disabled:opacity-50 active:bg-gray-700 transition-colors"
            >
              <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-white text-xl">🎯</span>
              </div>
              <span className="text-white text-sm font-medium text-center">Hit By<br/>Pitch</span>
            </button>
          </div>

          {/* Live Activity Feed */}
          <div className="flex-1 bg-white border-t overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-600">Live Activity</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activityFeed.length === 0 ? (
                <p className="text-gray-500 text-sm text-center">No activity yet</p>
              ) : (
                activityFeed.map((activity, i) => (
                  <div 
                    key={i} 
                    className={`text-sm py-1 ${i === 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
                  >
                    {activity}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ===== MAIN OVERVIEW VIEW ===== */
        <>
          {/* Scoring Mode Button */}
          <div className="bg-white px-4 py-4">
            <button
              onClick={() => setScoringMode(true)}
              disabled={!currentAtBat}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl text-lg
                hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50
                flex items-center justify-center gap-2"
            >
              <span>⚾</span>
              <span>Scoring Mode</span>
            </button>
          </div>

          {/* Play Log */}
          <div className="flex-1 overflow-hidden flex flex-col bg-white border-t">
            <div className="px-4 py-2 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-600">Play Log</span>
              <span className="text-xs text-gray-400 ml-2">{recentPlays.length} plays</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PlayByPlayLog plays={recentPlays} />
            </div>
          </div>
        </>
      )}

      {/* Ball In Play Menu */}
      {showBallInPlay && (
        <BallInPlayMenu
          isOpen={showBallInPlay}
          onClose={() => setShowBallInPlay(false)}
          onComplete={handleBallInPlayComplete}
        />
      )}

      {/* Field Location Picker */}
      {showFieldPicker && (
        <FieldLocationPicker
          isOpen={showFieldPicker}
          onClose={() => {
            setShowFieldPicker(false)
            setPendingPlay(null)
          }}
          onSelect={handleFieldLocationSelect}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg px-6 py-4 shadow-lg">
            Processing...
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}
    </div>
  )
}