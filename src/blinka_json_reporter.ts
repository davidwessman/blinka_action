import {Reporter, Context} from '@jest/reporters'
import {AggregatedResult, TestResult} from '@jest/test-result'
import * as fs from 'fs'
import * as path from 'path'

interface IResult {
  line: number
  name: string
  path: string
  result: string
  kind: string
  time: number | null
  backtrace: string[] | null
  message: string | null
  image: string | null
}

interface IReport {
  total_time: number
  nbr_tests: number
  nbr_assertions: number
  commit: string
  tag: string
  seed: number | null
  results: IResult[]
}

export default class BlinkaJSONReporter
  implements Pick<Reporter, 'onRunComplete'> {
  async onRunComplete(
    _: Set<Context>,
    results: AggregatedResult
  ): Promise<void> {
    const test_results = await this.convert_results(results.testResults)
    const report: IReport = {
      total_time: 7.54,
      nbr_tests: 5,
      nbr_assertions: 10,
      commit: process.env.COMMIT || 'missing-commit',
      tag: '',
      results: test_results,
      seed: null
    }
    fs.writeFileSync('./blinka_results.json', JSON.stringify(report, null, 2))
  }

  private async convert_results(results: TestResult[]): Promise<IResult[]> {
    return Promise.all(results.flatMap(result => this.convert_result(result)))
  }

  private convert_result(result: TestResult): IResult[] {
    // Returns the lib-folder, link relative to one folder up
    const project_directory = path.dirname(__dirname)
    return result.testResults.map(test_result => {
      return {
        line: test_result.location?.line || 0,
        name: test_result.fullName,
        path: path.relative(project_directory, result.testFilePath),
        result: this.translate_status(test_result.status),
        time: test_result.duration ? test_result.duration / 1000 : 0,
        kind: 'jest',
        backtrace: test_result.failureMessages,
        message: null,
        image: null
      }
    })
  }

  private translate_status(status: string): string {
    switch (status) {
      case 'passed':
        return 'pass'
      case 'skipped':
      case 'pending':
        return 'skip'
      default:
        return 'fail'
    }
  }
}
