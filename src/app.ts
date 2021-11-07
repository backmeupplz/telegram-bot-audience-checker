import 'reflect-metadata'
// Setup @/ aliases for modules
import 'module-alias/register'
// Config dotenv
import * as dotenv from 'dotenv'
import { Bot } from 'grammy'
import { readFileSync } from 'fs'
import ProgressBar = require('progress')
import TTY = require('tty')

dotenv.config({ path: `${__dirname}/../.env` })

const bot = new Bot(process.env.TOKEN)

const step = 30

function delay(s: number) {
  return new Promise((res) => setTimeout(res, s * 1000))
}

function forceTTY() {
  const tty = TTY.WriteStream.prototype
  Object.getOwnPropertyNames(tty).forEach(function (key) {
    process.stderr[key] = tty[key]
  })
  process.stderr.columns = 80 // columns
}

async function runApp() {
  forceTTY()
  console.info('Getting the list of Telegram IDs...')
  const ids = readFileSync(`${__dirname}/../ids.txt`, 'utf8')
    .split('\n')
    .map((v) => +v)
  console.info(`Got ${ids.length} Telegram IDs, starting to check them...`)
  console.info()
  let alive = 0
  const bar = new ProgressBar(
    'Checking [:bar] :current/:total, alive: :alive, eta :etas',
    {
      total: ids.length,
      alive,
    }
  )
  while (ids.length) {
    const idsToCheck = ids.splice(0, step)
    const promises = idsToCheck.map(
      (id) =>
        // eslint-disable-next-line no-async-promise-executor
        new Promise<number>(async (res) => {
          if (id > 0) {
            try {
              await bot.api.getChat(id)
              res(1)
            } catch {
              res(0)
            }
          } else {
            try {
              const count = await bot.api.getChatMemberCount(id)
              res(count)
            } catch {
              res(0)
            }
          }
          bar.tick()
        })
    )
    alive += (await Promise.all(promises)).reduce((acc, v) => acc + v, 0)
    bar.tick(bar.current, { alive: `${alive}` })
    await delay(1)
  }
}

void runApp()
