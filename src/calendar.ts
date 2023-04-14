import { S_aLon, MS_aLonT, S_aLonT } from './utils/xl'
import { int2 } from './utils/func'
import { J2000, PI2 } from './constants'
import { dtT } from './utils/deltaT'
import { JD, JDR } from './utils/jd'
import { qiAccurate } from './utils/qs'
import { year2Ayear } from './utils/func'
import { xl1Calc } from './utils/eph0'
import { DateDict } from '../typings/types'

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
  date: JDR
  d: number
  jd: number
  timeStr: string
  name: string
}

type YeaarQsCacheItem = {
  q: DateDict[]
  s: DateDict[]
}

export const yearQsCache = new Map<string, YeaarQsCacheItem>()

export function getYearBd0(year: number) {
  return int2(JD.JD(year, 1, 1 + ((0.1 / 60 + 0) / 60 + 12) / 24)) - J2000
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
    const jd = J2000 + d
    const date = JD.DD(jd)
    const name = jqmc[xn]
    solarTerm.push({
      d0: Bd0 + date.D - 1,
      index: idx,
      name,
      date,
      timeStr: JD.timeStr(d),
      d,
      jd
    })
  }

  const newMoons = computeMoon(year, 0)
  let mk = int2((Bd0 + J2000 - newMoons[1].jd) / 30)
  if (mk < 13 && newMoons[mk + 1].jd <= Bd0 + J2000) mk++ //农历所在月的序数
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
 * 定朔 (立冬后的第一个朔日起算)
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
    const jd = T * 36525 + J2000 + 8 / 24 - dtT(T * 36525)
    const date = JD.DD(jd)
    const item = {
      jd,
      date,
      dateStr: JD.DD2str(date),
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
    const jd = T * 36525 + J2000 + 8 / 24 - dtT(T * 36525)
    const date = JD.DD(jd)
    const xn = (i + 6) % 24
    const item = {
      jd,
      date,
      dateStr: JD.DD2str(date),
      idx: (xn + 23) % 24,
      name: jqmc[xn]
    }
    res.push(item)
  }
  return res
}

export function computeYearLunarMonths(year: number) {
  const Bd0 = getYearBd0(year)
  const newMoons = computeMoon(year, 0) // 从往年冬至第一个朔日开始取
  const solarTerms = computeSolarTerm(year)
  let mk = int2((Bd0 + J2000 - newMoons[0].jd) / 30)
  // console.log(newMoons, mk)
  if (mk < 13 && newMoons[mk + 1].jd <= Bd0 + J2000) mk++ //农历所在月的序数
  const ym = new Array(13).map(i => i - 1)
  //无中气置闰法确定闰月,(气朔结合法,数据源需有冬至开始的的气和朔)
  let leap: number = -1
  if (newMoons[12].jd <= solarTerms[24].jd) {
    //第13月的月末没有超过冬至(不含冬至),说明今年含有13个月
    for (let i = 0; i < 13; i++) {
      //在13个月中找第1个没有中气的月份
      // console.log(
      //   'solarTerms[2 * i]',
      //   i,
      //   newMoons[i].dateStr,
      //   solarTerms[2 * i].dateStr,
      //   solarTerms[2 * i].name,
      //   2 * i + 1 < 25 ? solarTerms[2 * i + 1].dateStr : '',
      //   2 * i + 1 < 25 ? solarTerms[2 * i + 1].name : ''
      // )
      console.log(
        JD.JD2str(int2(newMoons[i].jd - 8 / 24)),
        JD.JD2str(int2(solarTerms[2 * i].jd - 8 / 24))
      )
      // if (int2(newMoons[i].jd - 8 / 24) > int2(solarTerms[2 * i].jd - 8 / 24)) leap = i
      if (
        parseInt(`${newMoons[i].date.M}${newMoons[i].date.D}`) >
        parseInt(`${solarTerms[2 * i].date.M}${solarTerms[2 * i].date.D}`)
      )
        leap = i
      if (i > leap) break
    }
  }
  console.log(
    'newMoon',
    newMoons.map(i => i.dateStr)
  )
  const test = [
    8363, 8392, 8422, 8451, 8481, 8510, 8539, 8569, 8599, 8628, 8658, 8688, 8717, 8747, 8776
  ].map(i => JD.JD2str(i + J2000))
  console.log('test', test)
  console.log('leap', leap)
  // for (let i)
}
