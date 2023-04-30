import { S_aLon, MS_aLonT, S_aLonT } from './utils/xl'
import { int2 } from './utils/func'
import { J2000, PI2 } from './constants'
import { dtT } from './utils/deltaT'
// import { JD as JDX, JDR } from './utils/jd'
import { qiAccurate } from './utils/qs'
import { year2Ayear } from './utils/func'
import { xl1Calc } from './utils/eph0'
import { DateDict } from '../typings/types'
import { JD } from './class/jd'

export const jqmc = new Array(
  '冬至',
  '小寒',
  '大寒',
  '立春',
  '雨水',
  '惊蛰',
  '春分',
  '清明',
  '谷雨',
  '立夏',
  '小满',
  '芒种',
  '夏至',
  '小暑',
  '大暑',
  '立秋',
  '处暑',
  '白露',
  '秋分',
  '寒露',
  '霜降',
  '立冬',
  '小雪',
  '大雪'
)

type ComputeSolarTermResItem = {
  index: number
  d0: number
  jd: JD
  d: number
  jdn: number
  name: string
}

type YeaarQsCacheItem = {
  q: DateDict[]
  s: DateDict[]
}

export const yearQsCache = new Map<string, YeaarQsCacheItem>()

export function getYearBd0(year: number) {
  const dd = {
    year,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    second: 0.1
  }
  return int2(JD.date2jdn(dd, true)) - J2000
}

export const computeYearQs = (year: number) => {
  // 节气
  const solarTerm: ComputeSolarTermResItem[] = []
  // 节气计算
  const Bd0 = getYearBd0(year) //公历月首,中午
  const jd2 = Bd0 + dtT(Bd0) - 8 / 24

  //节气查找
  let w = S_aLon(jd2 / 36525, 3)
  w = (int2(((w - 0.13) / PI2) * 24) * PI2) / 24
  // let d: number

  for (let i = 0; i < 26; i++) {
    // w += (i * PI2) / 24
    const d = qiAccurate(w)
    const D = int2(d + 0.5)
    // xn为从冬至起的节气序号
    const xn = int2((w / PI2) * 24 + 24000006.01) % 24

    // lunisolar的节气序号从小寒气，所以要-1
    const idx = (xn + 23) % 24
    w += PI2 / 24
    if (D < Bd0) continue
    const jdn = J2000 + d
    const jd = new JD(jdn)
    const name = jqmc[xn]
    solarTerm.push({
      d0: Bd0 + jd.day - 1,
      jd,
      index: idx,
      name,
      d,
      jdn
    })
  }

  const newMoons = computeMoon(year, 0)
  let mk = int2((Bd0 + J2000 - newMoons[1].jdn) / 30)
  if (mk < 13 && newMoons[mk + 1].jdn <= Bd0 + J2000) mk++ //农历所在月的序数
  console.log('mk', mk)

  // const newMoons2 = []
  // let w2 = SSQ.calc(solarTerm[0].jd, '朔')
  // if (w2 > newMoons[0].jd) w2 -= 29.5306
  // w2 -= J2000
  // for (let i = 0; i < 15; i++) newMoons2[i] = SSQ.calc(w2 + 29.5306 * i, '朔') + J2000
  // console.log(
  //   'newMoons2',
  //   newMoons2.map(i => JD.JD2str(i))
  // )
  return solarTerm
}

/**
 * 定朔 (冬至最近的一个朔日起算)
 * @param angle 月日黄经差角度，0为朔，180为望
 */
export function computeMoon(year: number | string, angle: number) {
  angle = (360 + angle) % 360
  const y = year2Ayear(year) - 2000
  const n = 14
  const n0 = int2(y * (365.2422 / 29.53058886)) //截止当年首经历朔望的个数
  let T
  const res = []

  for (let i = 0; i < n; i++) {
    T = MS_aLonT((n0 + i + angle / 360) * 2 * Math.PI) //精确时间计算,入口参数是当年各朔望黄经
    const r = xl1Calc(2, T, -1) //计算月亮
    // const jdn = T * 36525 + J2000 + 8 / 24 - dtT(T * 36525)
    const jdn = T * 36525 + J2000 - dtT(T * 36525)
    const jd = new JD(jdn)
    // const date = JDX.DD(jdn)
    const item = {
      jdn,
      jd,
      r // 月地距离
    }
    // if (i % 50 == 0) (s += s2), (s2 = '')
    res.push(item)
  }

  return res
}

/**
 * 定气 （取得往年冬至到今年冬至的所有节气信息）
 * @param year 年份
 * @returns {{jd, date, dateStr, idx, name}[]}
 */
export function computeSolarTerm(year: number | string) {
  const y = year2Ayear(year) - 2000
  var n = 19
  const res = []
  for (let i = -6; i < n; i++) {
    const T = S_aLonT((y + (i * 15) / 360 + 1) * 2 * Math.PI) //精确节气时间计算
    const jdn = T * 36525 + J2000 - dtT(T * 36525)
    // const jdn = T * 36525 + J2000 + 8 / 24 - dtT(T * 36525)
    const jd = new JD(jdn)
    // const date = JDX.DD(jdn)
    const xn = (i + 6) % 24
    const item = {
      jd,
      jdn,
      idx: (xn + 23) % 24,
      name: jqmc[xn]
    }
    res.push(item)
  }
  return res
}

export function computeYearLunarMonths(year: number) {
  // const Bd0 = getYearBd0(year)
  const newMoons = computeMoon(year, 0) // 从往年冬至第一个朔日开始取
  const solarTerms = computeSolarTerm(year)

  // 初始化月序
  const ymOffset = newMoons[0].jdn < solarTerms[0].jdn ? -1 : 0
  const ym = new Array(14).fill(0).map((v, i) => {
    const m = i + ymOffset
    if (m < 0) return (m + 12) % 12
    if (m === 0) return 12
    return m
  })
  //无中气置闰法确定闰月,(气朔结合法,数据源需有冬至开始的的气和朔)
  let leapIdx: number = -1
  if (newMoons[12].jd <= solarTerms[24].jd) {
    //第13月的月末没有超过冬至(不含冬至),说明今年含有13个月
    for (let i = 0; i < 14; i++) {
      //在13个月中找第1个没有中气的月份
      if (
        parseInt(`${newMoons[i].jd.format('MMDD')}`) >
        parseInt(`${solarTerms[2 * i].jd.format('MMDD')}`)
      )
        leapIdx = i
      if (i > leapIdx) break
    }
  }
  let leap = -1
  const lunars: {
    isLeap: boolean
    month: number
    jdn: number
    r: number
    monthLen: number
  }[] = new Array(13)
  for (let i = 0; i < 13; i++) {
    const monthLen = int2(newMoons[i + 1].jdn - 0.5 + 8 / 24) - int2(newMoons[i].jdn - 0.5 + 8 / 24)
    console.log('monthLen', newMoons[i + 1].jdn - newMoons[i].jdn)
    const item = {
      isLeap: false,
      month: ym[i],
      jdn: newMoons[i].jdn,
      r: newMoons[i].r,
      monthLen2: newMoons[i + 1].jdn - newMoons[i].jdn,
      monthLen3: int2(newMoons[i + 1].jdn) - int2(newMoons[i].jdn),
      monthLen,
      format: newMoons[i].jd.format()
    }
    if (i >= leapIdx && leapIdx !== -1) {
      let m = ym[i] - 1
      if (m === 0) m = 12
      ym[i] = m
      item.month = m
      if (i === leapIdx) {
        leap = m
        item.isLeap = true
      }
    }
    lunars[i] = item
  }
  // console.log(
  //   'newMoon',
  //   newMoons.map(i => i.jd.format())
  // )
  // console.log(lunars)
  console.log('leap', leapIdx, leap, ym)
  // for (let i)
}
