import { config } from 'dotenv'

export const setup = () => {
  config()
  process.env.TZ = 'UTC'
}
