import { JD } from '../../src/class/jd'
import { SSQ } from '../../src/class/ssq'
import { SSQ as SSQX } from '../../src/utils/qs'
import { J2000 } from '../../src/constants'

// import { JD as JDX } from '../../src/utils/jd'

describe('test SSQ Class', () => {
  it('test SSQ 2023', () => {
    const ssq = new SSQ(2023)
    // const st = ssq.getSolarTerms(1)
    // const st2 = ssq.getSolarTerms(0)
    SSQX.calcY(Math.floor(23) * 365.2422 + 180)
    // st.map((v, i) => {
    //   console.log(v, i)
    //   const jd = new JD(v.jdn, { isUTC: true })
    //   const jd2 = new JD(st2[i].jdn)
    //   const jd3 = new JD(SSQX.ZQ[i] + J2000, { isUTC: true })
    //   console.log(jd.format(), jd2.format(), jd3.format())
    // })
    const yearQS = ssq.getQS()
    const months = ssq.getMoons(0)
    yearQS.map((v, i) => {
      const jd = new JD(v.dayJdn, { isUTC: true })
      const ssqJd = new JD(SSQX.HS[i] + J2000, { isUTC: true })
      console.log('yearqs', jd.format(), ssqJd.format(), new JD(months[i].jdn).format())
      console.log(v)
    })
  })
})
