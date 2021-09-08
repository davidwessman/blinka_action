import {report_to_github} from '../src/report-github'
import * as _reporter from '../src/blinka-json-reporter'
import * as github from '@actions/github'
import * as fs from 'fs'
import nock from 'nock'
const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_OWNER = 'some-owner'
const GITHUB_REPO = 'some-repo'
const GITHUB_COMMENT = {
  body: 'Blinka results!\nThe comment',
  user: {
    login: 'github-actions[bot]'
  },
  id: 888
}

beforeAll(async () => {
  jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
    // Mock github context
    return {
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    }
  })
  const payload = await JSON.parse(
    fs.readFileSync('./__tests__/pull_request.json', 'utf-8')
  )
  github.context.ref = 'refs/heads/some-ref'
  github.context.sha = '1234567890123456789012345678901234567890'
  github.context.payload = payload
  nock(GITHUB_API_URL)
    .get(/issues\/\d+\/comments/)
    .reply(200, [GITHUB_COMMENT])
  nock(GITHUB_API_URL)
    .post(/issues\/\d+\/comments/)
    .reply(200)
  nock(GITHUB_API_URL)
    .patch(/issues\/comments\/\d+/)
    .reply(200)
})

test('report_to_github - pull_request', async () => {
  stubGithubApi(false)
  let result = await report_to_github(
    './__tests__/blinka_results.json',
    'main',
    'TOKENTOKEN'
  )
  expect(result).toBe(true)
})

test('report_to_github - junit - pull_request', async () => {
  stubGithubApi(false)
  let result = await report_to_github(
    './__tests__/junit.xml',
    'main',
    'TOKENTOKEN'
  )
  expect(result).toBe(true)
})

test('report_to_github - pull_request existing comment', async () => {
  stubGithubApi(true)
  let result = await report_to_github(
    './__tests__/blinka_results.json',
    'main',
    'TOKENTOKEN'
  )
  expect(result).toBe(true)
})

function stubGithubApi(with_comments: boolean = false): void {
  const comments = with_comments ? [GITHUB_COMMENT] : []
  nock(GITHUB_API_URL)
    .get(/issues\/\d+\/comments/)
    .reply(200, comments)
  nock(GITHUB_API_URL)
    .post(/issues\/\d+\/comments/)
    .reply(200)
  nock(GITHUB_API_URL)
    .patch(/issues\/comments\/\d+/)
    .reply(200)
}
