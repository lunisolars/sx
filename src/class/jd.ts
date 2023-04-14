import { DateDict, JDConfig } from '../../typings/types'
import { int2, date2DateDict, date2jdn } from '../utils/func'

export class JD {
  readonly jdn: number
  readonly config: JDConfig
  readonly timezoneOffset: number
  readonly cache = new Map<string, any>()
  constructor(jdn: number, config?: Partial<JDConfig>) {
    const defaultConfig = {
      isUTC: false
    }
    this.config = Object.assign({}, defaultConfig, config)
    this.jdn = jdn
    this.timezoneOffset = new Date().getTimezoneOffset()
  }

  /**
   * 公历转儒略日数
   * @param date 公历
   * @param isUTC is UTC?
   * @returns 儒略日数
   */
  static date2jdn(date?: Date | Partial<DateDict> | number, isUTC = false) {
    const dateDict = date2DateDict(date) as DateDict
    const now = new Date()
    let year = dateDict?.Y ?? now.getFullYear()
    let month = dateDict?.M ?? now.getMonth() + 1
    let day = dateDict?.D ?? now.getDate()
    const hour = dateDict?.h ?? 0
    const m = dateDict?.m ?? 0
    const s = dateDict?.s ?? 0
    const tzOffset = now.getTimezoneOffset() // -480
    console.log('date2jdn', date2jdn(new Date(year, month - 1, day, hour, m, s)))
    let dig = hour / 24 + m / (24 * 60) + s / (24 * 60 * 60)
    // 减去时区差
    console.log(date && typeof date !== 'number' && !(date instanceof Date) && !isUTC)
    if (date && typeof date !== 'number' && !(date instanceof Date) && !isUTC) {
      console.log('111')
      dig += tzOffset / (24 * 60)
    }

    //公历转儒略日
    let n = 0,
      G = 0
    if (year * 372 + month * 31 + int2(day) >= 588829) G = 1 //判断是否为格里高利历日1582*372+10*31+15
    if (month <= 2) (month += 12), year--
    if (G) (n = int2(year / 100)), (n = 2 - n + int2(n / 4)) //加百年闰
    return int2(365.25 * (year + 4716)) + int2(30.6001 * (month + 1)) + day + n - 1524.5 + dig
  }

  /**
   * 通过公历创建儒略日对象
   * @param dateObj 公历日期字典对象
   * @param config 设置，主要是isUTC
   * @returns JD实例
   */
  static fromGre(dateObj?: Partial<DateDict>, config?: Partial<JDConfig>) {
    const jdn = JD.date2jdn(dateObj, config?.isUTC)
    return new JD(jdn, config)
  }

  /**
   * 儒略日数转公历
   * @param jdn 儒略日数
   * @returns DateDict
   */
  static jdn2gre(jdn: number) {
    //儒略日数转公历
    const r: DateDict = {
      Y: 0,
      M: 0,
      D: 0,
      h: 0,
      m: 0,
      s: 0
    }
    let D = int2(jdn + 0.5),
      F = jdn + 0.5 - D,
      c //取得日数的整数部份A及小数部分F
    if (D >= 2299161) {
      c = int2((D - 1867216.25) / 36524.25)
      D += 1 + c - int2(c / 4)
    }
    D += 1524
    r.Y = int2((D - 122.1) / 365.25) //年数
    D -= int2(365.25 * r.Y)
    r.M = int2(D / 30.601) //月数
    D -= int2(30.601 * r.M)
    r.D = D //日数
    if (r.M > 13) {
      r.M -= 13
      r.Y -= 4715
    } else {
      r.M -= 1
      r.Y -= 4716
    }
    //日的小数转为时分秒
    F *= 24
    r.h = int2(F)
    F -= r.h
    F *= 60
    r.m = int2(F)
    F -= r.m
    F *= 60
    r.s = F
    return r
  }

  toGre(): DateDict {
    const cacheKey = 'jd:toGre'
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)
    const jdn = this.jdn
    const mOffset = this.config.isUTC ? 0 : this.timezoneOffset / (24 * 60)
    const res = JD.jdn2gre(jdn - mOffset)
    this.cache.set(cacheKey, res)
    return res
  }

  get year() {
    return this.toGre().Y
  }

  get month() {
    return this.toGre().M
  }

  get day() {
    return this.toGre().D
  }

  get hour() {
    return this.toGre().h
  }

  get minute() {
    return this.toGre().m
  }

  get second() {
    return int2(this.toGre().s)
  }

  get dayOfWeek() {
    const mOffset = this.config.isUTC ? 0 : this.timezoneOffset / (24 * 60)
    return int2(this.jdn + 1.5 + 7000000 - mOffset) % 7
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
    const y = this.year
    const M = this.month
    const D = this.day
    const H = this.hour
    const m = this.minute
    const s = this.second
    const w = this.dayOfWeek
    const h = H % 12 || 12
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
      ss: String(s).padStart(2, '0')
    }

    return str.replace(REGEX_FORMAT, (match, $1) => {
      return $1 || matches[match as keyof typeof matches]
    })
  }
}
