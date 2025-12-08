import bus from '../lib/eventBus.js'
import region from '../resources/region.js'
import config from '../config/config.js'
import EEWCalculator from './eewCalculator.js'
import log from '../log/logger.js'
import mqtt from "mqtt";
import gen from '../lib/gen.js';
import fs from 'fs/promises';

const notify = async (intensity, waveTime) => {
  const url = config.notify.url
  const params = {
    username: config.notify.username,
    keepalive: 30,
    reconnectPeriod: 0,
    password: config.notify.password
  }
  const client = mqtt.connect(url, params)
  console.log('connected', url, params)
  await client.publishAsync('warning/earthquake', JSON.stringify({
    level: intensity,
    sec: waveTime
  }))
  await client.endAsync()
  setTimeout(async () => {
    try {
      await fs.unlink(config.audio.target)
    } catch(error){

    }
  }, 5000)
}

export default () => {
  let dstLocation = region[config.region.city][config.region.district]
  const calculator = new EEWCalculator()
  bus.on('warning/cwb', async (cwbNotify) => {
    const distance = calculator.distance(cwbNotify.epicenterLat, cwbNotify.epicenterLon, dstLocation.lat, dstLocation.lon)
    const intensity = calculator.intensityToNumberString(calculator.intensity([cwbNotify.epicenterLat, cwbNotify.epicenterLon], [dstLocation.lat, dstLocation.lon], cwbNotify.depth, cwbNotify.magnitude))
    const waveTime = calculator.calculateWaveTime(cwbNotify.depth, distance)
    log({ label: 'warning/cwb', message: `distance: ${distance}, intensity: ${intensity}, waveTime: ${JSON.stringify(waveTime)}` })
    await gen(intensity, waveTime.s)
    await notify(intensity, waveTime.s)
  })
}

export {notify}
