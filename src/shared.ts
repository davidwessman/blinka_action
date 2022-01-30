import * as github from '@actions/github'
import {JsonReport, JsonResult, JunitReport, JunitTestSuite, JunitTestCase} from './types'
import {XMLParser} from 'fast-xml-parser'
import fs from 'fs'

export class BlinkaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlinkaError'
  }
}

export async function readTestResults(filename: string): Promise<JsonReport> {
  if (filename.endsWith('.json')) {
    return readJSON(filename)
  } else {
    const data = await readJunit(filename)
    fs.writeFileSync('./junit.json', JSON.stringify(data, null, 2))

    const blinkaData = convertJunitToBlinka(data)
    fs.writeFileSync('./junit2blinka.json', JSON.stringify(blinkaData, null, 2))

    return blinkaData
  }
}

export async function readJSON(filename: string): Promise<JsonReport> {
  return JSON.parse(fs.readFileSync(filename, 'utf-8'))
}

export async function readJunit(filename: string): Promise<JunitReport> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      isArray: () => true
    })
    return parser.parse(fs.readFileSync(filename, 'utf-8'))
  } catch (error) {
    if (error instanceof Error) {
      throw new BlinkaError(
        `Failed to parse junit-file ${filename}: ${error.message}`
      )
    }
    throw new BlinkaError(`Failed to parse junit-file ${filename}`)
  }
}

function convertJunitToBlinka(data: JunitReport): JsonReport {
  const results: JsonResult[] = []
  let total_time = 0
  const testsuites: JunitTestSuite[] = []

  if (Array.isArray(data.testsuites.testsuite)) {
    testsuites.concat(data.testsuites.testsuite)
  } else if (data.testsuites.testsuite) {
    testsuites.push(data.testsuites.testsuite)
  }

  for (const testsuite of testsuites) {
    const testcases: JunitTestCase[] = []

    if (Array.isArray(testsuite.testcase)) {
      testcases.concat(testsuite.testcase)
    } else if (testsuite.testcase) {
      testcases.push(testsuite.testcase)
    }

    for (const testcase of testcases) {
      const time = Number(testcase.time)
      total_time += time
      let result = 'pass'
      if (testcase.skipped !== undefined) {
        result = 'skip'
      } else if (testcase.failure !== undefined) {
        result = 'fail'
      }
      results.push({
        line: 0,
        name: testcase.name,
        result,
        time,
        message: testcase.failure || '',
        path: '',
        backtrace: null,
        kind: null,
        image: null
      })
    }
  }
  const report: JsonReport = {
    commit: github.context?.sha || 'unknown',
    total_time,
    nbr_tests: results.length,
    tag: '',
    seed: 0,
    results
  }

  return report
}
