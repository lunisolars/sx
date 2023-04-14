import { JD } from '../../src/class/jd'

// import { JD as JDX } from '../../src/utils/jd'

describe('test JD Class', () => {
  it('test JD', () => {
    const jd = JD.fromGre({ Y: 2023, M: 4, D: 14, h: 12 }, { isUTC: true })
    expect(jd.jdn).toBe(2460049)
    expect(jd.format(`YYYY-MM-DD HH:mm:ss`)).toBe('2023-04-14 12:00:00')
  })
})
