import bus from '../lib/eventBus.js'
import region from '../resources/region.js'
import config from '../config/config.js'
import EEWCalculator from './eewCalculator.js'
import log from '../log/logger.js'

export default () => {
  let dstLocation = region[config.region.city][config.region.district]
  const calculator = new EEWCalculator()
  bus.on('warning/cwb', (cwbNotify) => {
    const distance = calculator.distance(cwbNotify.epicenterLat, cwbNotify.epicenterLon, dstLocation.lat, dstLocation.lon)
    const intensity = calculator.intensity([cwbNotify.epicenterLat, cwbNotify.epicenterLon], [dstLocation.lat, dstLocation.lon], cwbNotify.depth, cwbNotify.magnitude)
    const waveTime = calculator.calculateWaveTime(cwbNotify.depth, distance)
    log({ label: 'warning/cwb', message: `distance: ${distance}, intensity: ${intensity}, waveTime: ${JSON.stringify(waveTime)}` })
  })
}
