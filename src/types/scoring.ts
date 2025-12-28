export interface BaseState {
  id: string
  session_id: string
  inning: number
  is_top_inning: boolean
  outs: number
  home_score: number
  away_score: number
  runner_first_profile_id: string | null
  runner_first_opponent_id: string | null
  runner_second_profile_id: string | null
  runner_second_opponent_id: string | null
  runner_third_profile_id: string | null
  runner_third_opponent_id: string | null
}

export interface Pitch {
  id: string
  session_id: string
  at_bat_id: string | null
  inning: number
  is_top_inning: boolean
  balls: number
  strikes: number
  outs: number
  result: PitchResult
  pitch_number: number
}

export type PitchResult = 
  | 'ball' | 'strike_called' | 'strike_swinging' 
  | 'strike_foul' | 'strike_foul_tip' | 'in_play'
  | 'hit_by_pitch' | 'balk' | 'wild_pitch' | 'passed_ball'

export type AtBatResult =
  | 'in_progress'
  | 'single' | 'double' | 'triple' | 'home_run'
  | 'strikeout_swinging' | 'strikeout_looking'
  | 'groundout' | 'flyout' | 'lineout' | 'popout'
  | 'walk' | 'hit_by_pitch' | 'error' | 'fielders_choice'
  | 'sacrifice_fly' | 'sacrifice_bunt' | 'double_play'

export type HitType = 
  | 'ground_ball' | 'hard_ground_ball' | 'fly_ball' 
  | 'line_drive' | 'bunt' | 'pop_fly' | 'infield_fly'

export interface LineupPlayer {
  id: string
  batting_order: number
  fielding_position: string
  player: {
    id: string
    full_name: string
  }
}

export interface OpponentPlayer {
  id: string
  name: string
  jersey_number: number | null
}

