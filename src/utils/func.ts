// 寿星万年历工具，参考 https://github.com/sxwnl/sxwnl/
// const { PI } = Math
// import { XL0 } from '../constants/xl0'
// import { XL1 } from '../constants/xl1'
import { RAD, GRE_UNITS, REGEX_PARSE } from '../constants'
import { DateDict, GreUnit, GreUnitFullName } from '../../typings/types'

//=================================三角函数等=======================================
const {
  // floor,
  // PI,
  // sqrt,
  // abs,
  // sin,
  cos
  // tan,
  // asin,
  // acos,
  // atan,
  // atan2
} = Math

//==================================================================================
export function int2(v: number) {
  return Math.floor(v)
}
/**
 * 求余
 */
export function mod2(v: number, n: number) {
  return ((v % n) + n) % n
}

/**
 * 太阳光行差,t是世纪数
 */
export function gxc_sunLon(t: number) {
  var v = -0.043126 + 628.301955 * t - 0.000002732 * t * t //平近点角
  var e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t
  return (-20.49552 * (1 + e * cos(v))) / RAD //黄经光行差
}

/**
 * 黄纬光行差
 */
export function gxc_sunLat(t: number) {
  return 0
}
/**
 * 月球经度光行差,误差0.07"
 */
export function gxc_moonLon(t: number) {
  return -3.4e-6
}
/**
 * 月球纬度光行差,误差0.006"
 */
export function gxc_moonLat(t: number) {
  return (0.063 * Math.sin(0.057 + 8433.4662 * t + 0.000064 * t * t)) / RAD
}

//传入普通纪年或天文纪年，传回天文纪年
export function year2Ayear(c: number | string): number {
  let y: string | number = String(c).replace(/[^0-9Bb\*-]/g, '')
  let q = y.slice(0, 1)
  if (q == 'B' || q == 'b' || q == '*') {
    //通用纪年法(公元前)
    y = 1 - Number(y.slice(1))
    if (y > 0) {
      throw new Error('通用纪法的公元前纪法从B.C.1年开始。并且没有公元0年')
      // return -10000
    }
  } // else y -= 0
  if (y < -4712) throw new Error('超过B.C. 4713不准')
  if (y > 9999) throw new Error('超过9999年的农历计算很不准。')
  return y as number
}

export function date2DateDict(date?: Date | Partial<DateDict> | number): DateDict {
  if (typeof date === 'number') {
    date = new Date(date)
  }
  if (date instanceof Date) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      millis: date.getUTCMilliseconds()
    }
  }
  const now = new Date()
  return {
    year: date?.year ?? now.getUTCFullYear(),
    month: date?.month ?? now.getUTCMonth() + 1,
    day: date?.day ?? now.getUTCDate(),
    hour: typeof date === 'undefined' ? now.getUTCHours() : date.hour ?? 0,
    minute: typeof date === 'undefined' ? now.getUTCMinutes() : date.minute ?? 0,
    second: typeof date === 'undefined' ? now.getUTCSeconds() : date.second ?? 0,
    millis: typeof date === 'undefined' ? now.getUTCSeconds() : date.millis ?? 0
  }
}

export function gre2jdn(date?: Date | Partial<DateDict>, isUTC = false) {
  const dateDict = date2DateDict(date) as DateDict
  const now = new Date()
  let year = dateDict?.year ?? now.getFullYear()
  let month = dateDict?.month ?? now.getMonth() + 1
  let day = dateDict?.day ?? now.getDate()
  const hour = dateDict?.hour ?? 0
  const m = dateDict?.minute ?? 0
  const s = dateDict?.second ?? 0
  const ms = dateDict?.millis ?? 0
  const tzOffset = now.getTimezoneOffset() // -480
  let dig = hour / 24 + m / (24 * 60) + s / (24 * 60 * 60) + ms / (24 * 60 * 60 * 1000)
  // 减去时区差
  if (date && !(date instanceof Date) && !isUTC) {
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
 * 处理日期单位
 * @param unit
 */
export const prettyUnit = (unit?: GreUnit): GreUnitFullName | '' => {
  if (!unit) return ''
  unit = unit.trim() as GreUnit
  return (
    (GRE_UNITS as { [prop: string]: GreUnitFullName })[unit] ||
    (unit || '').toLowerCase().replace(/s$/, '')
  )
}

export const parseDateString = (str: string): DateDict => {
  const now = new Date()
  const res: DateDict = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millis: 0
  }
  const d = str.match(REGEX_PARSE) as any
  if (d) {
    const ms = (d[7] || '0').substring(0, 3)
    res.year = Number(d[1] || res.year)
    res.month = Number(d[2] || 0)
    res.day = Number(d[3] || 1)
    res.hour = Number(d[4] || 0)
    res.minute = Number(d[5] || 0)
    res.second = Number(d[6] || 0)
    res.millis = Number(ms)
  }
  return res
}
