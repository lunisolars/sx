import { DateDict, JDConfig, GreUnit } from '../../typings/types'
import { int2, gre2jdn, prettyUnit, parseDateString } from '../utils/func'
import { GRE_UNITS } from '../constants'
import { cache } from '@lunisolar/utils'

export class JD {
  readonly jdn: number
  readonly config: JDConfig
  readonly timezoneOffset: number
  readonly cache = new Map<string, any>()
  constructor(jdn: number, config?: Partial<JDConfig>) {
    const defaultConfig = {
      isUTC: false,
      offset: 0
    }
    this.config = Object.assign({}, defaultConfig, config)
    this.jdn = jdn
    this.timezoneOffset = this.config.isUTC ? 0 : new Date().getTimezoneOffset()
  }

  /**
   * 公历转儒略日数
   * @param date 公历
   * @param isUTC is UTC?
   * @returns 儒略日数
   */
  static gre2jdn(date?: Date | Partial<DateDict> | string, isUTC = false) {
    if (typeof date === 'string') date = parseDateString(date)
    return gre2jdn(date, isUTC)
  }

  /**
   * 通过公历创建儒略日对象
   * @param dateDict 公历日期字典对象
   * @param config 设置，主要是isUTC
   * @returns JD实例
   */
  static fromGre(dateDict?: Partial<DateDict> | string, config?: Partial<JDConfig>) {
    if (typeof dateDict === 'string') dateDict = parseDateString(dateDict)
    const jdn = JD.gre2jdn(dateDict, config?.isUTC)
    return new JD(jdn, config)
  }

  /**
   * 儒略日数转公历
   * @param jdn 儒略日数
   * @returns DateDict
   */
  static jdn2gre(jdn: number, isUTC = false): Required<DateDict> {
    if (!isUTC) {
      const timezoneOffset = -new Date().getTimezoneOffset()
      jdn += timezoneOffset / (24 * 60)
    }
    //儒略日数转公历
    const r: Required<DateDict> = {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0,
      millis: 0
    }
    let D = int2(jdn + 0.5),
      F = jdn + 0.5 - D,
      c //取得日数的整数部份A及小数部分F
    if (D >= 2299161) {
      c = int2((D - 1867216.25) / 36524.25)
      D += 1 + c - int2(c / 4)
    }
    D += 1524
    r.year = int2((D - 122.1) / 365.25) //年数
    D -= int2(365.25 * r.year)
    r.month = int2(D / 30.601) //月数
    D -= int2(30.601 * r.month)
    r.day = D //日数
    if (r.month > 13) {
      r.month -= 13
      r.year -= 4715
    } else {
      r.month -= 1
      r.year -= 4716
    }
    //日的小数转为时分秒
    F *= 24
    r.hour = int2(F)
    F -= r.hour
    F *= 60
    r.minute = int2(F)
    F -= r.minute
    F *= 60
    r.second = int2(F)
    F -= r.second
    r.millis = F * 1000
    return r
  }

  @cache('jd:toGre')
  toGre(): Required<DateDict> {
    const jdn = this.jdn
    const mOffset = this.config.offset / (24 * 60)
    const res = JD.jdn2gre(jdn + mOffset, this.config.isUTC)
    return res
  }

  clone(): JD {
    return new JD(this.jdn, this.config)
  }

  get year() {
    return this.toGre().year
  }

  get month() {
    return this.toGre().month
  }

  get day() {
    return this.toGre().day
  }

  get hour() {
    return this.toGre().hour
  }

  get minute() {
    return this.toGre().minute
  }

  get second() {
    return this.toGre().second
  }

  get millis() {
    return this.toGre().millis
  }

  get dayOfWeek() {
    let mOffset = this.config.isUTC ? 0 : -this.timezoneOffset / (24 * 60)
    mOffset += this.config.offset
    return int2(this.jdn + 1.5 + 7000000 + mOffset) % 7
  }

  add(value: number, unit: GreUnit) {
    const pUnit = prettyUnit(unit)
    let diff = value
    let jdn = this.jdn
    if (pUnit === GRE_UNITS.h) {
      diff = value / 24
    } else if (pUnit === GRE_UNITS.m) {
      diff = value / (24 * 60)
    } else if (pUnit === GRE_UNITS.s) {
      diff = value / (24 * 60 * 60)
    } else if (unit === GRE_UNITS.M || unit === GRE_UNITS.y) {
      const gre = JD.jdn2gre(this.jdn, this.config.isUTC)
      diff = 0
      if (unit === GRE_UNITS.M) gre.month += 1
      if (unit === GRE_UNITS.y) gre.year += 1

      jdn = JD.gre2jdn(gre, this.config.isUTC)
    } else if (unit === GRE_UNITS.w) {
      diff = value / 7
    }
    return new JD(jdn + diff, this.config)
  }

  format(formatStr?: string) {
    const FORMAT_DEFAULT = 'YYYY-MM-DD HH:mm:ss'
    const str = formatStr || FORMAT_DEFAULT
    const REGEX_FORMAT =
      /\[([^\]]+)]|J|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g
    const meridiemFunc = (hour: number, minute: number, isLowercase: boolean) => {
      const m = hour < 12 ? 'AM' : 'PM'
      return isLowercase ? m.toLowerCase() : m
    }
    const padZoneStr = (timezoneOffset: number) => {
      const minutes = Math.abs(timezoneOffset)
      const hourOffset = Math.floor(minutes / 60)
      const minuteOffset = minutes % 60
      return `${timezoneOffset <= 0 ? '+' : '-'}${String(hourOffset).padStart(2, '0')}:${String(
        minuteOffset
      ).padStart(2, '0')}`
    }

    const y = this.year
    const M = this.month
    const D = this.day
    const H = this.hour
    const m = this.minute
    const s = this.second
    const w = this.dayOfWeek
    const h = H % 12 || 12
    const tz = padZoneStr(this.timezoneOffset)
    const matches = {
      J: String(this.jdn),
      YY: String(y).slice(-2),
      YYYY: String(y),
      M: String(M),
      MM: String(M).padStart(2, '0'),
      D: String(D),
      DD: String(D).padStart(2, '0'),
      d: String(w),
      H: String(H),
      HH: String(H).padStart(2, '0'),
      h: String(h),
      hh: String(h).padStart(2, '0'),
      a: meridiemFunc(H, m, true),
      A: meridiemFunc(H, m, false),
      m: String(m),
      mm: String(m).padStart(2, '0'),
      s: String(s),
      ss: String(s).padStart(2, '0'),
      SSS: String(this.millis).padStart(3, '0'),
      Z: tz,
      ZZ: tz.replace(':', '')
    }

    return str.replace(REGEX_FORMAT, (match, $1) => {
      return $1 || matches[match as keyof typeof matches]
    })
  }
}
