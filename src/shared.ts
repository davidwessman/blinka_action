import * as github from '@actions/github'
import {JsonReport, JsonResult, JunitReport, JunitTestSuite} from './types'
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
    return convertJunitToBlinka(await readJunit(filename))
  }
}

export async function readJSON(filename: string): Promise<JsonReport> {
  return JSON.parse(fs.readFileSync(filename, 'utf-8'))
}

function junitIsArray(path: string): boolean {
  const keys = [
    'testsuites.testsuite',
    'testsuites.testsuite.testcase',
    'testsuites.testsuite.testsuite.testcase'
  ]

  return keys.includes(path)
}

export async function readJunit(filename: string): Promise<JunitReport> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      alwaysCreateTextNode: true,
      isArray: (name: string, jpath: string) => {
        return junitIsArray(jpath)
      }
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

  for (const testsuite of data.testsuites.testsuite) {
    if ('testsuite' in testsuite) {
      for (const nested of testsuite.testsuite) {
        testsuites.push(nested)
      }
    } else {
      testsuites.push(testsuite)
    }
  }

  for (const testsuite of testsuites) {
    for (const testcase of testsuite.testcase) {
      const time = Number(testcase.time)
      total_time += time
      let result = 'pass'
      if (testcase.skipped !== undefined) {
        result = 'skip'
      } else if (testcase.failure !== undefined) {
        result = 'fail'
      }

      let name = testcase.name
      if (testcase.classname && testcase.classname !== testcase.name) {
        name = `${testcase.classname} ${testcase.name}`
      }
      let message = ''
      if (
        'failure' in testcase &&
        testcase.failure &&
        '#text' in testcase.failure
      ) {
        message = testcase.failure['#text']
      }
      results.push({
        line: Number(testcase.line || 0),
        name,
        result,
        time,
        message: message,
        path: testcase.path || testcase.file || '',
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
