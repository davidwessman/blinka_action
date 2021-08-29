import {report_to_github} from '../src/report-github'
import * as _reporter from '../src/blinka-json-reporter'
import * as github from '@actions/github'
import * as fs from 'fs'

beforeAll(async () => {
  // Mock github context
  jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
    return {
      owner: 'some-owner',
      repo: 'some-repo'
    }
  })
  const payload = await JSON.parse(
    fs.readFileSync('./__tests__/payload.json', 'utf-8')
  )
  github.context.ref = 'refs/heads/some-ref'
  github.context.sha = '1234567890123456789012345678901234567890'
  github.context.payload = payload
})

test('report_to_github', async () => {
  let result = await report_to_github(
    './__tests__/blinka_results.json',
    'TOKENTOKEN'
  )
  expect(result).toBeTruthy
})

test.skip('skip failing the tests', async () => {
  expect(1).toBe(2)
})
