import bus from '../lib/eventBus.js'
import region from '../resources/region.js'
import config from '../config/config.js'
import EEWCalculator from './eewCalculator.js'
import log from '../log/logger.js'
import mqtt from "mqtt";
import gen from '../lib/gen.js';
import fs from 'fs/promises';

const dstLocation = region[config.region.city][config.region.district]
const calculator = new EEWCalculator()

let cdIntensity = 0
let cdWaveTime = 0
let lock = 0

const connectMqtt = async () => {
  const url = config.notify.url
  const params = {
    username: config.notify.username,
    keepalive: 30,
    reconnectPeriod: 0,
    password: config.notify.password
  }
  const client = await mqtt.connectAsync(url, params)
  log({ label: 'mqtt/connect', message: `mqtt connect: ${url}, ${JSON.stringify(params)}` })
  return client
}

const notify = async (intensity, waveTime) => {
  const client = await connectMqtt()
  await client.publishAsync('warning/earthquake', JSON.stringify({
    level: intensity,
    sec: waveTime
  }))
  setTimeout(async () => {
    try {
      await fs.unlink(config.audio.target)
    } catch(error){

    }
  }, 5000)
  await client.endAsync()
}

const notifyReport = async (reportDescription) => {
  const regx = /^(\d+)\/(\d+)-(\d+):(\d+)(.*)/i
  const match = reportDescription.match(regx)
  const parsedString = `${match[1]}月${parseInt(match[2])}號${parseInt(match[3])}點${parseInt(match[4])}分${match[5]}`
  log({ label: 'report/cwb', message: parsedString })
  const client = await connectMqtt()
  await client.publishAsync('report/earthquake', JSON.stringify({
    report: parsedString
  }))
  await client.endAsync()
}

const lockAndWait = (lockTimeout) => {
  return new Promise((resolve, reject) => {
    const checkLock = () => {
      log({ label: 'warning/cwb', message: `check lock: ${Date.now()}` })
      if(lock <= Date.now()) {
        lock = Date.now() + lockTimeout * 1000
        resolve()
        return
      }
      setTimeout(checkLock, 100)
    }
    checkLock()
  })
}


const lockRelease = () => {
  lock = Date.now()
  log({ label: 'warning/cwb', message: `lock release` })
}

const genAndNotify = async (intensity, waveTime) => {
  const intensityString = calculator.intensityToNumberString(intensity)
  const nowTime = Date.now() / 1000

  if(nowTime < cdWaveTime && intensity <= cdIntensity) {
    return
  }

  cdWaveTime = nowTime + 20
  cdIntensity = intensity
  await lockAndWait(3)
  waveTime -= (Date.now() / 1000 - nowTime)
  await gen(intensityString, waveTime)
  lockRelease()
  await notify(intensityString, waveTime)
}

export default () => {
  bus.on('warning/cwb', async (cwbNotify) => {
    const transmitTime = (Date.now() - cwbNotify.originTime) / 1000
    const distance = calculator.distance(cwbNotify.epicenterLat, cwbNotify.epicenterLon, dstLocation.lat, dstLocation.lon)
    const intensity = calculator.intensity([cwbNotify.epicenterLat, cwbNotify.epicenterLon], [dstLocation.lat, dstLocation.lon], cwbNotify.depth, cwbNotify.magnitude)
    const intensityString = calculator.intensityToNumberString(intensity)
    const waveTime = calculator.calculateWaveTime(cwbNotify.depth, distance)
    log({ label: 'warning/cwb', message: `distance: ${distance}, intensity: ${intensityString}, waveTime: ${JSON.stringify(waveTime)}, transmitTime: ${transmitTime}, real: ${waveTime.s - transmitTime}` })
    if(intensity < 2) {
      log({ label: 'warning/cwb', message: `ignore intensity: ${intensityString}` })
      return
    }
    await genAndNotify(intensity, waveTime.s - transmitTime)
  })
  bus.on('report/cwb', async (cwbNotify) => {
    const intensity = calculator.intensity([cwbNotify.epicenterLat, cwbNotify.epicenterLon], [dstLocation.lat, dstLocation.lon], cwbNotify.depth, cwbNotify.magnitude)
    log({ label: 'report/cwb', message: JSON.stringify(cwbNotify) })

    if(intensity < 2) {
      log({ label: 'report/cwb', message: `ignore` })
      return
    }
    await notifyReport(cwbNotify.description)
  })
}

export {notifyReport, notify, genAndNotify}
