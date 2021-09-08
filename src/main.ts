import * as core from '@actions/core'
import {report_to_blinka} from './report-blinka'
import {report_to_github} from './report-github'

async function run(): Promise<void> {
  try {
    const filename: string = core.getInput('filename')
    const token_id: string = core.getInput('token_id')
    const token_secret: string = core.getInput('token_secret')
    const github_token: string = core.getInput('github_token')
    const tag: string = core.getInput('tag')

    if (token_id && token_secret) {
      report_to_blinka(filename, tag, token_id, token_secret)
    } else {
      report_to_github(filename, tag, github_token)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
