import { S_aLon } from './utils/xl'
import { int2 } from './utils/func'
import { J2000, PI2 } from './constants'
import { dtT } from './utils/deltaT'
import { JD, JDR } from './utils/jd'
import { qiAccurate } from './utils/qs'

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

type DItem = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

type YeaarQsCacheItem = {
  q: DItem[]
  s: DItem[]
}

export const yearQsCache = new Map<string, YeaarQsCacheItem>()

export const computeYearQs = (year: number) => {
  // 节气
  const solarTerm: ComputeSolarTermResItem[] = []
  // 合朔
  // const newMoon: number[] = []
  // // 月天数
  // const monthLen: number[] = []

  // 节气计算
  const Bd0 = int2(JD.JD(year, 1, 1 + ((0.1 / 60 + 0) / 60 + 12) / 24)) - J2000 //公历月首,中午
  const jd2 = Bd0 + dtT(Bd0) - 8 / 24

  //节气查找
  let w = S_aLon(jd2 / 36525, 3)
  w = (int2(((w - 0.13) / PI2) * 24) * PI2) / 24
  // let d: number

  //纪日,2000年1月7日起算
  // } while (D + 12 < Bd0 + Bdn)

  for (let i = 0; i < 26; i++) {
    // w += (i * PI2) / 24
    const d = qiAccurate(w)
    const D = int2(d + 0.5)
    // xn为从冬至起的节气序号
    const xn = int2((w / PI2) * 24 + 24000006.01) % 24
    // const xn = (i + 1) % 24
    console.log(xn, d, D, Bd0)
    // lunisolar的节气序号从小寒气，所以要-1
    const idx = (xn + 23) % 24
    w += PI2 / 24
    if (D < Bd0) continue
    const jd = 2451545 + d
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

  return solarTerm
}
