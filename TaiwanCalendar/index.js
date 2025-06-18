import fs from 'node:fs/promises'
import express from 'express'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const argv = yargs(hideBin(process.argv)).parse()
const calendarBasePath = argv.cacheBase ? argv.cacheBase: '/tmp'
let port = argv.port ? argv.port : 3000
let calendarYear = null
let calendar = null

const handleServer = () => {
  const app = express()
  app.get('/calendar/:year/:month/:day', async (req, res) => {
    let {year, month, day} = req.params
    if(calendarYear != year) {
      await fetchAllCalendar(year)
    }
    res.json(calendar[`${year}${month}${day}`]).send()
  })

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
}

const convertTaiwanCalendar = (year, rawData) => {
  calendarYear = year
  calendar = {}
  rawData.forEach((element) => {
    calendar[element.date] = {
      isHoliday: element.isHoliday,
      weekDay: element.week,
      description: element.description
    }
  })
}

const fetchTaiwanCalendar = async (year) => {
  let cacheCalendarPath = `${calendarBasePath}/taiwan-calendar-${year}.json`
  let url = `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`
  let rawData = null
  calendar = null
  calendarYear = null
  try {
    const response = await fetch(url)
    rawData = await response.json()
    convertTaiwanCalendar(year, rawData)
    await fs.writeFile(cacheCalendarPath, JSON.stringify(calendar))
  } catch (error) {
    try {
      let data = await fs.readFile(cacheCalendarPath, 'utf8')
      calendar = JSON.parse(data)
      calendarYear = null
    } catch (readError) {
    }
  }
}

const convertPinYiTaiwanCalendar = (year, rawData) => {
  calendarYear = year
  calendar = {}
  rawData.forEach((element) => {
    calendar[element.date] = {
      isHoliday: element.isHoliday,
      weekDay: element.week_chinese,
      description: element.caption
    }
  })
}

const fetchPinYiTaiwanCalendar = async (year) => {
  let cacheCalendarPath = `${calendarBasePath}/taiwan-calendar-${year}.json`
  let url = `https://api.pin-yi.me/taiwan-calendar/${year}`
  let rawData = null
  calendar = null
  calendarYear = null
  try {
    const response = await fetch(url)
    rawData = await response.json()
    convertPinYiTaiwanCalendar(year, rawData)
    await fs.writeFile(cacheCalendarPath, JSON.stringify(calendar))
  } catch (error) {
    try {
      let data = await fs.readFile(cacheCalendarPath, 'utf8')
      calendar = JSON.parse(data)
      calendarYear = null
    } catch (readError) {
    }
  }
}

const fetchAllCalendar = async (year) => {
  await fetchTaiwanCalendar(year)
  if(calendar) {
    return
  }
  await fetchPinYiTaiwanCalendar(year)
}

(async () => {
  await fetchAllCalendar((new Date()).getFullYear())
  handleServer()
})()
