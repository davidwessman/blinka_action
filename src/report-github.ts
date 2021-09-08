import * as core from '@actions/core'
import * as github from '@actions/github'
import {BlinkaError, readJSON} from './shared'
import {GitHub} from '@actions/github/lib/utils'
import {JsonReport} from './types'

export class GithubClient {
  octokit: InstanceType<typeof GitHub>
  pull_request_number: number

  constructor(token: string) {
    this.octokit = github.getOctokit(token)
    if (github.context.payload.pull_request == null) {
      throw new BlinkaError(`Only works for pull requests`)
    }
    this.pull_request_number = github.context.payload.pull_request.number
  }

  async report(data: JsonReport): Promise<void> {
    const context = github.context
    let total_duration = 0
    const counts = {
      pass: 0,
      skip: 0,
      fail: 0
    }
    const failures = []
    for (const result of data.results) {
      if (result.time) {
        total_duration += result.time
      }
      switch (result.result) {
        case 'pass':
          counts.pass += 1
          break
        case 'skip':
          counts.skip += 1
          break
        case 'fail':
          counts.fail += 1
          failures.push(result)
          break
        default:
          break
      }
    }

    const tag = 'Blinka results!'
    let body = `${tag}\nTest results: ${counts.pass} pass, ${counts.skip} skipped and ${counts.fail} failed\n`
    body += `It took ${total_duration.toFixed(2)} seconds to run.\n`
    if (failures.length > 0) {
      body += '\n### Failures\n'
    }
    for (const failure of failures) {
      body += `\n- ${failure.path}:${failure.line} - ${failure.name}`
      body += `\n\`\`\`\n${failure.message}\n\`\`\`\n`
    }
    const comments = await this.octokit.rest.issues.listComments({
      ...context.repo,
      issue_number: this.pull_request_number
    })

    let existingComment = null
    for (const comment of comments.data) {
      if (
        comment.body?.startsWith(tag) &&
        comment.user?.login === 'github-actions[bot]'
      ) {
        existingComment = comment
        break
      }
    }

    if (existingComment) {
      this.octokit.rest.issues.updateComment({
        ...context.repo,
        comment_id: existingComment.id,
        body
      })
    } else {
      this.octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: this.pull_request_number,
        body
      })
    }
  }
}

export async function report_to_github(
  filename: string,
  github_token: string
): Promise<Boolean> {
  try {
    const data: JsonReport = await readJSON(filename)
    const client = new GithubClient(github_token)
    await client.report(data)
  } catch (error) {
    if (error instanceof Error) {
      core.warning(error.message)
    }
    return false
  }

  return true
}
