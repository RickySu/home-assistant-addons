import region from '../resources/region.js'
import timeTable from '../resources/time.js'

class EEWCalculator {
  constructor() {
    this.timeTable = timeTable
    this.ln10 = Math.log(10)
  }

  intensity(epicenterLocation, pointLocation, depth, mag) {
    let float = this.eewPgv(epicenterLocation, pointLocation, depth, mag)
    return float < 0 ? 0 : float < 4.5 ? Math.round(float) : float < 5 ? 5 : float < 5.5 ? 6 : float < 6 ? 7 : float < 6.5 ? 8 : 9;
  }

  eewPga(epicenterLocation, pointLocation, depth, mag) {
    const distSurface = this.distance(epicenterLocation[0], epicenterLocation[1], pointLocation[0], pointLocation[1])
    const dist = Math.sqrt(Math.pow(distSurface, 2) + Math.pow(depth, 2))
    const pga = 1.657 * Math.exp(1.533 * mag) * Math.pow(dist, -1.607)
    let i = this.pgaToFloat(pga)
    if (i >= 4.5) {
      i = this.eewPgv(epicenterLocation, pointLocation, depth, mag)
    }

    return this.intensityFloatToInt(i)
  }

  eewPgv(epicenterLocation, pointLocation, depth, magW) {
    const long = Math.pow(10, 0.5 * magW - 1.85) / 2
    const epicenterDistance = this.distance(
      epicenterLocation[0],
      epicenterLocation[1],
      pointLocation[0],
      pointLocation[1],
    )

    const hypocenterDistance = Math.sqrt(
      Math.pow(depth, 2) + Math.pow(epicenterDistance, 2),
    ) - long

    const x = Math.max(hypocenterDistance, 3)

    const gpv600 = Math.pow(
      10,
      0.58 * magW
      + 0.0038 * depth
      - 1.29
      - Math.log(x + 0.0028 * Math.pow(10, 0.5 * magW)) / this.ln10
      - 0.002 * x,
    )

    const pgv400 = gpv600 * 1.31
    const pgv = pgv400 * 1.0

    return 2.68 + 1.72 * Math.log(pgv) / this.ln10
  }

  distance(latA, lngA, latB, lngB) {
    latA = latA * Math.PI / 180
    lngA = lngA * Math.PI / 180
    latB = latB * Math.PI / 180
    lngB = lngB * Math.PI / 180

    const sinLatA = Math.sin(Math.atan(Math.tan(latA)))
    const sinLatB = Math.sin(Math.atan(Math.tan(latB)))
    const cosLatA = Math.cos(Math.atan(Math.tan(latA)))
    const cosLatB = Math.cos(Math.atan(Math.tan(latB)))

    return Math.acos(
      sinLatA * sinLatB + cosLatA * cosLatB * Math.cos(lngA - lngB),
    ) * 6371.008
  }

  calculateWaveTime(depth, distance) {
    const za = 1 * depth
    let g0, G
    const xb = distance

    if (depth <= 40) {
      g0 = 5.10298
      G = 0.06659
    }
    else {
      g0 = 7.804799
      G = 0.004573
    }

    const zc = -1 * (g0 / G)
    const xc = (Math.pow(xb, 2) - 2 * (g0 / G) * za - Math.pow(za, 2)) / (2 * xb)
    let thetaA = Math.atan((za - zc) / xc)

    if (thetaA < 0) {
      thetaA = thetaA + Math.PI
    }

    thetaA = Math.PI - thetaA
    const thetaB = Math.atan(-1 * zc / (xb - xc))
    let ptime = (1 / G) * Math.log(Math.tan((thetaA / 2)) / Math.tan((thetaB / 2)))

    const g0_ = g0 / Math.sqrt(3)
    const g_ = G / Math.sqrt(3)
    const zc_ = -1 * (g0_ / g_)
    const xc_ = (Math.pow(xb, 2) - 2 * (g0_ / g_) * za - Math.pow(za, 2)) / (2 * xb)
    let thetaA_ = Math.atan((za - zc_) / xc_)

    if (thetaA_ < 0) {
      thetaA_ = thetaA_ + Math.PI
    }

    thetaA_ = Math.PI - thetaA_
    const thetaB_ = Math.atan(-1 * zc_ / (xb - xc_))
    let stime = (1 / g_) * Math.log(Math.tan(thetaA_ / 2) / Math.tan(thetaB_ / 2))

    if (distance / ptime > 7) {
      ptime = distance / 7
    }

    if (distance / stime > 4) {
      stime = distance / 4
    }

    return { p: ptime, s: stime }
  }

  // Utility functions
  findClosest(arr, target) {
    return arr.reduce((prev, curr) =>
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev,
    )
  }

  pgaToFloat(pga) {
    return 2 * (Math.log(pga) / Math.log(10)) + 0.7
  }

  pgaToIntensity(pga) {
    return this.intensityFloatToInt(this.pgaToFloat(pga))
  }

  intensityFloatToInt(floatValue) {
    if (floatValue < 0) {
      return 0
    }
    if (floatValue < 4.5) {
      return Math.round(floatValue)
    }
    if (floatValue < 5) {
      return 5
    }
    if (floatValue < 5.5) {
      return 6
    }
    if (floatValue < 6) {
      return 7
    }
    if (floatValue < 6.5) {
      return 8
    }
    return 9
  }

  intensityToNumberString(level) {
    switch (level) {
      case 5: return '5-'
      case 6: return '5+'
      case 7: return '6-'
      case 8: return '6+'
      case 9: return '7'
      default: return level.toString()
    }
  }
}

export default EEWCalculator
