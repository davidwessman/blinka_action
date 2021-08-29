import {JsonReport} from './types'
import fs from 'fs'

export class BlinkaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlinkaError'
  }
}
export async function readJSON(filename: string): Promise<JsonReport> {
  return JSON.parse(fs.readFileSync(filename, 'utf-8'))
}
