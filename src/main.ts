import * as core from '@actions/core'
import {report} from './report'

async function run(): Promise<void> {
  try {
    const filename: string = core.getInput('filename')
    const repository: string = core.getInput('repository')
    const token_id: string = core.getInput('token_id')
    const token_secret: string = core.getInput('token_secret')

    report(filename, repository, token_id, token_secret)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
