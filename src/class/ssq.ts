import { SUO_KB, SUO_S, QI_S, QI_KB } from '../constants/qs'
import { J2000, T_YEAR_DAYS } from '../constants'
import { S_aLonT2, S_aLonT, MS_aLonT, MS_aLonT2 } from '../utils/xl'
import { dtT } from '../utils/deltaT'
import { year2Ayear, int2 } from '../utils/func'
import { xl1Calc } from '../utils/eph0'
import { cache } from '@lunisolar/utils'
// const { floor } = Math

/************************
  实气实朔计算器
  适用范围 -722年2月22日——1959年12月
  平气平朔计算使用古历参数进行计算
  定朔、定气计算使用开普勒椭圆轨道计算，同时考虑了光行差和力学时与UT1的时间差
  古代历算仅在晚期才使用开普勒方法计算，此前多采用一些修正表并插值得到，精度很低，与本程序中
的开普勒方法存在误差，造成朔日计算错误1千多个，这些错误使用一个修正表进行订正。同样，定气部分
也使用了相同的方法时行订正。
  平气朔表的算法(线性拟合)：
  气朔日期计算公式：D = k*n + b  , 式中n=0,1,2,3,...,N-1, N为该式适用的范围
  h表示k不变b允许的误差,如果b不变则k许可误差为h/N
  每行第1个参数为k,第2参数为b
  public中定义的成员可以直接使用
*************************/

/**
 * 气朔解压缩
 */
export function uncompressQS(s: string) {
  var o = '0000000000',
    o2 = o + o
  s = s.replace(/J/g, '00')
  s = s.replace(/I/g, '000')
  s = s.replace(/H/g, '0000')
  s = s.replace(/G/g, '00000')
  s = s.replace(/t/g, '02')
  s = s.replace(/s/g, '002')
  s = s.replace(/r/g, '0002')
  s = s.replace(/q/g, '00002')
  s = s.replace(/p/g, '000002')
  s = s.replace(/o/g, '0000002')
  s = s.replace(/n/g, '00000002')
  s = s.replace(/m/g, '000000002')
  s = s.replace(/l/g, '0000000002')
  s = s.replace(/k/g, '01')
  s = s.replace(/j/g, '0101')
  s = s.replace(/i/g, '001')
  s = s.replace(/h/g, '001001')
  s = s.replace(/g/g, '0001')
  s = s.replace(/f/g, '00001')
  s = s.replace(/e/g, '000001')
  s = s.replace(/d/g, '0000001')
  s = s.replace(/c/g, '00000001')
  s = s.replace(/b/g, '000000001')
  s = s.replace(/a/g, '0000000001')
  s = s.replace(/A/g, o2 + o2 + o2)
  s = s.replace(/B/g, o2 + o2 + o)
  s = s.replace(/C/g, o2 + o2)
  s = s.replace(/D/g, o2 + o)
  s = s.replace(/E/g, o2)
  s = s.replace(/F/g, o)
  return s
}

export class SSQ {
  //实朔实气计算器
  static readonly SB = uncompressQS(SUO_S) //朔修正表
  static readonly QB = uncompressQS(QI_S) //气修正表
  //朔直线拟合参数
  static soLow(W: number): number {
    //低精度定朔计算,在2000年至600，误差在2小时以内(仍比古代日历精准很多)
    var v = 7771.37714500204
    var t = (W + 1.08472) / v // L
    t -=
      (-0.0000331 * t * t +
        0.10976 * Math.cos(0.785 + 8328.6914 * t) +
        0.02224 * Math.cos(0.187 + 7214.0629 * t) -
        0.03342 * Math.cos(4.669 + 628.3076 * t)) /
        v +
      (32 * (t + 1.8) * (t + 1.8) - 20) / 86400 / 36525
    return t * 36525 // + 8 / 24
  }

  static qiLow(W: number): number {
    //最大误差小于30分钟，平均5分
    var t,
      L,
      v = 628.3319653318
    t = (W - 4.895062166) / v //第一次估算,误差2天以内
    t -=
      (53 * t * t +
        334116 * Math.cos(4.67 + 628.307585 * t) +
        2061 * Math.cos(2.678 + 628.3076 * t) * t) /
      v /
      10000000 //第二次估算,误差2小时以内

    L =
      48950621.66 +
      6283319653.318 * t +
      53 * t * t + //平黄经
      334166 * Math.cos(4.669257 + 628.307585 * t) + //地球椭圆轨道级数展开
      3489 * Math.cos(4.6261 + 1256.61517 * t) + //地球椭圆轨道级数展开
      2060.6 * Math.cos(2.67823 + 628.307585 * t) * t - //一次泊松项
      994 -
      834 * Math.sin(2.1824 - 33.75705 * t) //光行差与章动修正

    t -= (L / 10000000 - W) / 628.332 + (32 * (t + 1.8) * (t + 1.8) - 20) / 86400 / 36525
    return t * 36525 // + 8 / 24
  }

  static qiHigh(W: number) {
    //较高精度气
    var t = S_aLonT2(W) * 36525
    t = t - dtT(t) // + 8 / 24
    var v = ((t + 0.5) % 1) * 86400
    if (v < 1200 || v > 86400 - 1200) t = S_aLonT(W) * 36525 - dtT(t) // + 8 / 24
    return t
  }

  static soHigh(W: number) {
    //较高精度朔
    var t = MS_aLonT2(W) * 36525
    t = t - dtT(t) // + 8 / 24
    var v = ((t + 0.5) % 1) * 86400
    if (v < 1800 || v > 86400 - 1800) t = MS_aLonT(W) * 36525 - dtT(t) // + 8 / 24
    return t
  }

  /**
   * 气朔解压缩
   */
  static uncompress = uncompressQS

  /**
   * 平气或平朔
   * @param jdn 儒略日
   * @param flag 0平气，1平朔
   */
  static averageQS(jdn: number, flag: 0 | 1) {
    const pc = flag === 1 ? 14 : 7
    // 平气或平朔
    let k: number = 0
    for (let i = 0; i < SUO_KB.length; i += 2) {
      if (jdn + pc < SUO_KB[i + 2]) {
        k = i
        break
      }
    }
    let d = SUO_KB[k] + SUO_KB[k + 1] * Math.floor((jdn + pc - SUO_KB[k]) / SUO_KB[k + 1])
    d = Math.floor(d + 0.5)
    if (d == 1683460) d++ //如果使用太初历计算-103年1月24日的朔日,结果得到的是23日,这里修正为24日(实历)。修正后仍不影响-103的无中置闰。如果使用秦汉历，得到的是24日，本行D不会被执行。
    return d
  }

  /**
   * 取得指定儒略日符近的朔日(定朔)
   * @param jdn 指定儒略日
   */
  static calcNewMoon(jdn: number) {
    const pc = 14
    const f1 = SUO_KB[0] - pc
    const f2 = SUO_KB[SUO_KB.length - 1] - pc
    const f3 = 2436935
    if (jdn < f1 || jdn >= f3) {
      //平气朔表中首个之前，使用现代天文算法。1960.1.1以后，使用现代天文算法 (这一部分调用了qi_high和so_high,所以需星历表支持)
      // 2451551是2000.1.7的那个朔日,黄经差为0.定朔计算
      return (
        Math.floor(
          SSQ.soHigh(Math.floor((jdn + pc - 2451551) / 29.5306) * Math.PI * 2) + 0.5 + 8 / 24
        ) + J2000
      )
    } else if (jdn >= f1 && jdn < f2) {
      // 平朔
      return SSQ.averageQS(jdn, 1)
    } else if (jdn >= f2 && jdn < f3) {
      // 定朔
      let d =
        Math.floor(SSQ.soLow(Math.floor((jdn + pc - 2451551) / 29.5306) * Math.PI * 2) + 0.5) +
        J2000 //2451551是2000.1.7的那个朔日,黄经差为0.定朔计算
      const start = Math.floor((jdn - f2) / 29.5306)
      const n = SSQ.SB.slice(start, start + 1) //找定朔修正值
      // let n = this.SB.substr(Math.floor((jdn - f2) / 29.5306), 1) //找定朔修正值
      if (n === '1') return d + 1
      if (n === '2') return d - 1
      return d
    }
    return 0
  }

  static calcSolarTerm(jdn: number) {
    const pc = 7
    const f1 = QI_KB[0] - pc
    const f2 = QI_KB[QI_KB.length - 1] - pc
    const f3 = 2436935
    if (jdn < f1 || jdn >= f3) {
      //平气朔表中首个之前，使用现代天文算法。1960.1.1以后，使用现代天文算法 (这一部分调用了qi_high和so_high,所以需星历表支持)
      // 2451551是2000.1.7的那个朔日,黄经差为0.定朔计算
      // return (
      //   Math.floor(
      //     SSQ.qiHigh((Math.floor(((jdn + pc - 2451259) / T_YEAR_DAYS) * 24) * Math.PI) / 12) +
      //       0.5 +
      //       8 / 24
      //   ) + J2000
      // )
      return (
        SSQ.qiHigh((Math.floor(((jdn + pc - 2451259) / T_YEAR_DAYS) * 24) * Math.PI) / 12) +
        0.5 +
        8 / 24 +
        J2000
      )
    } else if (jdn >= f1 && jdn < f2) {
      // 平气
      return SSQ.averageQS(jdn, 0)
    } else {
      // 定气
      const d =
        Math.floor(
          SSQ.qiLow((Math.floor(((jdn + pc - 2451259) / T_YEAR_DAYS) * 24) * Math.PI) / 12) +
            0.5 +
            8 / 24
        ) + J2000 //2451259是1999.3.21,太阳视黄经为0,春分.定气计算
      const start = Math.floor(((jdn - f2) / T_YEAR_DAYS) * 24)
      const n = SSQ.QB.slice(start, start + 1) //找定气修正值
      if (n === '1') return d + 1
      // if (n === '2') return d - 1
      return d
    }
  }

  readonly year: number
  readonly cache = new Map<string, any>()
  constructor(year: number) {
    this.year = year
  }

  /**
   * 取得一年指定的月相
   * @param angle 月相角度 0为朔，180为望
   */
  getMoons(angle = 0) {
    angle = (360 + angle) % 360
    const y = year2Ayear(this.year) - 2000
    const n = 14
    const n0 = int2(y * (T_YEAR_DAYS / 29.53058886)) //截止当年首经历朔望的个数
    let T
    const res = []
    for (let i = 0; i < n; i++) {
      T = MS_aLonT((n0 + i + angle / 360) * 2 * Math.PI) //精确时间计算,入口参数是当年各朔望黄经
      const r = xl1Calc(2, T, -1) //计算月亮
      // const jdn = T * 36525 + J2000 + 8 / 24 - dtT(T * 36525)
      const jdn = T * 36525 + J2000 - dtT(T * 36525)
      // const jd = new JD(jdn)
      // const date = JDX.DD(jdn)
      const item = {
        jdn,
        // jd,
        r // 月地距离
      }
      // if (i % 50 == 0) (s += s2), (s2 = '')
      res.push(item)
    }
  }

  @cache('ssq:d0')
  getD0() {
    const d0 = int2((this.year - 2000) * T_YEAR_DAYS + 180)
    let w = Math.floor((d0 - 355 + 183) / T_YEAR_DAYS) * T_YEAR_DAYS + 355 + J2000 //355是2000.12冬至,得到较靠近jd的冬至估计值
    if (SSQ.calcSolarTerm(w) > d0 + J2000) w -= T_YEAR_DAYS
    return w
  }

  /**
   * 取得冬至
   */
  @cache('ssq:winterSolstice')
  getWinterSolstice() {
    const d0 = this.getD0()
    const w = SSQ.calcSolarTerm(d0)
    return SSQ.calcSolarTerm(w)
  }

  @cache('ssq:newMoonDays')
  getNewMoonDays() {
    //今年"首朔"的日月黄经差w
    const ws = this.getWinterSolstice()
    let w = SSQ.calcNewMoon(ws) //求较靠近冬至的朔日
    if (w > ws) w -= 29.53
    const res = []
    //该年所有朔,包含14个月的始末
    for (let i = 0; i < 15; i++) res[i] = SSQ.calcNewMoon(w + 29.5306 * i)
    return res
  }

  getSolarTerms(flag: 0 | 1 = 0) {
    if (flag === 1) {
      const d0 = this.getD0()
      const w = SSQ.calcSolarTerm(d0)
      const zq = new Array(25)
      for (let i = 0; i < 25; i++) {
        zq[i] = {
          idx: (i + 23) % 24,
          jdn: SSQ.calcSolarTerm(w + 15.2184 * i) //25个节气时刻(北京时间),从冬至开始到下一个冬至以后
        }
      }
      return zq
    }
    // 天文计算
    const y = year2Ayear(this.year) - 2000
    var n = 19
    const res = []
    for (let i = -6; i < n; i++) {
      const T = S_aLonT((y + (i * 15) / 360 + 1) * 2 * Math.PI) //精确节气时间计算
      const jdn = T * 36525 + J2000 - dtT(T * 36525)
      // const jdn = T * 36525 + J2000 + 8 / 24 - dtT(T * 36525)
      // const jd = new JD(jdn)
      // const date = JDX.DD(jdn)
      const xn = (i + 6) % 24
      const item = {
        // jd,
        jdn,
        idx: (xn + 23) % 24
        // name: jqmc[xn]
      }
      res.push(item)
    }
    return res
  }

  getQS() {
    //该年的气
    // const d0 = this.getD0()
    // const solartTerms = this.getSolarTerms(1)
    // const newMoonDays = this.getNewMoonDays()
  }
}

export const qiAccurate = function (W: number) {
  var t = S_aLonT(W) * 36525
  return t - dtT(t) + 8 / 24
} // 精气

export const soAccurate = function (W: number) {
  var t = MS_aLonT(W) * 36525
  return t - dtT(t) + 8 / 24
} // 精朔
