import type { JD } from '@lunisolar/julian'

export type DateDict = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  millis?: number
}

export type JDConfig = {
  isUTC: boolean
  offset: number
}

export type LunarMonth = {
  isLeap: boolean
  len: number
  month: number
  dayJdn: number
  dayJd: JD
  solarTerms: {
    value: number
    idx: number
    jdn: number
    jd: JD
  }[]
}

export type GreUnitFullName =
  | 'millisecond'
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'

export type GreUnitShortName = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'q' | 'y'

export type GreUnit = GreUnitFullName | GreUnitShortName
