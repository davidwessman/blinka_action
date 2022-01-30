import {readTestResults} from '../src/shared'

test('readTestResults json results', async () => {
  const testResults = await readTestResults('./__tests__/blinka_results.json')

  expect(Object.keys(testResults).sort()).toEqual([
    'commit',
    'nbr_assertions',
    'nbr_tests',
    'results',
    'seed',
    'tag',
    'total_time'
  ])
  expect(testResults.results.length).toEqual(14)

  for (const result of testResults.results) {
    expect(result.name.length > 0).toBe(true)
    expect(result.kind && result.kind.length > 0).toBe(true)
    expect(result.line).toEqual(expect.any(Number))
    if (result.message) {
      if (result.result === 'pass') {
        expect(result.backtrace).toBe(null)
        expect(result.message.length).toEqual(0)
        expect(result.image).toBe(null)
      } else if (result.result === 'fail') {
        expect(result.backtrace && result.backtrace.length > 0).toBe(true)
        expect(result.message.length > 0).toBe(true)
        if (result.kind === 'system') {
          expect(result.image === null).toBe(false)
        }
      }
    }
  }
})

test('readTestResults junit results', async () => {
  const testResults = await readTestResults('./__tests__/junit.xml')

  expect(Object.keys(testResults).sort()).toEqual([
    'commit',
    'nbr_tests',
    'results',
    'seed',
    'tag',
    'total_time'
  ])
  expect(testResults.results.length).toEqual(8)

  for (const result of testResults.results) {
    expect(result.name.length > 0).toBe(true)
    expect(result.image).toBe(null)
    expect(result.kind).toBe(null)
    expect(result.backtrace).toBe(null)
    expect(result.line).toEqual(expect.any(Number))
    if (result.message) {
      if (result.result === 'pass') {
        expect(result.message.length).toEqual(0)
      } else if (result.result === 'fail') {
        expect(result.message.length > 0).toBe(true)
      }
    }
  }
})

test('readTestResults laravel junit results', async () => {
  const testResults = await readTestResults('./__tests__/laravel.xml')

  expect(Object.keys(testResults).sort()).toEqual([
    'commit',
    'nbr_tests',
    'results',
    'seed',
    'tag',
    'total_time'
  ])
  expect(testResults.results.length).toEqual(5)

  for (const result of testResults.results) {
    expect(result.name.length > 0).toBe(true)
    expect(result.image).toBe(null)
    expect(result.kind).toBe(null)
    expect(result.backtrace).toBe(null)
    expect(result.line).toEqual(expect.any(Number))
    if (result.message) {
      if (result.result === 'pass') {
        expect(result.message.length).toEqual(0)
      } else if (result.result === 'fail') {
        expect(result.message.length > 0).toBe(true)
      }
    }
  }
})
