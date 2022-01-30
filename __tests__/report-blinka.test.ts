import * as net from 'net'
import * as http from 'http'
import * as github from '@actions/github'
import {BlinkaError} from '../src/shared'
import {BlinkaClient, report_to_blinka} from '../src/report-blinka'
import {HttpClient, HttpClientResponse} from '@actions/http-client'
import * as core from '@actions/core'
import * as _reporter from '../src/blinka-json-reporter'
import nock from 'nock'

const VALID_TOKEN_ID = 'VALID_FAKE_TOKEN_ID'
const VALID_AUTH_TOKEN = 'VALID_FAKE_TOKEN_SECRET'
// Use http here to be able to stub it
const S3_URL = 'http://blinka.s3storage.fake'
const TEST_HOST = 'https://blinka.testing.fake/api/v1'

beforeAll(async () => {
  // Mock github context
  jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
    return {
      owner: 'davidwessman',
      repo: 'blinka_action'
    }
  })
})

test('setup client with authentication', async () => {
  setupHttpClientMock()

  const client = new BlinkaClient(TEST_HOST, VALID_TOKEN_ID, 'FAKE SECRET')
  await client.setup()
  expect(client.authenticated).toBe(true)
})

test('setup client with invalid authentication', async () => {
  setupHttpClientMock()

  const client = new BlinkaClient(TEST_HOST, 'INVALID TOKEN', 'FAKE SECRET')
  await expect(client.setup()).rejects.toBeInstanceOf(BlinkaError)
})

test('report_to_blinka - json', async () => {
  setupHttpClientMock()
  let result = await report_to_blinka(
    './__tests__/blinka_results.json',
    'main',
    VALID_TOKEN_ID,
    'FAKE SECRET',
    TEST_HOST
  )
  expect(result).toBe(true)
})

test('report_to_blinka - junit', async () => {
  setupHttpClientMock()
  let result = await report_to_blinka(
    './__tests__/junit.xml',
    'main',
    VALID_TOKEN_ID,
    'FAKE SECRET',
    TEST_HOST
  )
  expect(result).toBe(true)
})

test('report_to_blinka - laravel junit', async () => {
  setupHttpClientMock()
  let result = await report_to_blinka(
    './__tests__/laravel_results.xml',
    'main',
    VALID_TOKEN_ID,
    'FAKE SECRET',
    TEST_HOST
  )
  expect(result).toBe(true)
})

test('handle_image', async () => {
  setupHttpClientMock()
  const client = new BlinkaClient(TEST_HOST, VALID_TOKEN_ID, 'FAKE SECRET')
  const result = await client.handle_image('./__tests__/image.png')
  expect(result).not.toBeUndefined
})

test.skip('skip failing the tests', async () => {
  expect(1).toBe(2)
})

async function emptyMockReadBody(): Promise<string> {
  return new Promise(resolve => {
    resolve('')
  })
}

function setupHttpClientMock(): void {
  jest.spyOn(core, 'warning').mockImplementation((message: string | Error) => {
    console.log('::core::warning ' + message.toString())
  })
  jest
    .spyOn(HttpClient.prototype, 'get')
    .mockImplementation(async request_url => {
      const mockMessage = new http.IncomingMessage(new net.Socket())
      let mockReadBody = emptyMockReadBody

      if (request_url.startsWith(`${TEST_HOST}/presign`)) {
        mockMessage.statusCode = 200
        mockReadBody = async function (): Promise<string> {
          return new Promise(resolve => {
            resolve(
              JSON.stringify({
                fields: {
                  key: 'cache/123912y39bsakdiashd1.png',
                  'Content-Disposition':
                    'inline; filename="image.png"; filename*=UTF-8\'\'image.png',
                  'Content-Type': 'image/png',
                  policy: 'asdiasdai',
                  'x-amz-credential': 'blabla',
                  'x-amz-algorithm': 'AWS4-HMAC-SHA256',
                  'x-amz-date': '20210325T074232Z',
                  'x-amz-signature': 'baosdoahsdoas'
                },
                headers: {},
                method: 'post',
                url: S3_URL
              })
            )
          })
        }
      }
      return new Promise<HttpClientResponse>(resolve => {
        resolve({
          message: mockMessage,
          readBody: mockReadBody
        })
      })
    })

  jest
    .spyOn(HttpClient.prototype, 'post')
    .mockImplementation(async (request_data, data) => {
      const inputData = JSON.parse(data)
      const mockMessage = new http.IncomingMessage(new net.Socket())
      let mockReadBody = emptyMockReadBody

      if (request_data.endsWith('v1/authentication')) {
        if (inputData.token_id == VALID_TOKEN_ID) {
          mockMessage.statusCode = 200
          mockReadBody = async function (): Promise<string> {
            return new Promise(resolve => {
              resolve(
                JSON.stringify({
                  auth_token: VALID_AUTH_TOKEN
                })
              )
            })
          }
        } else {
          mockMessage.statusCode = 401
        }
      } else if (request_data.endsWith('v1/report')) {
        mockMessage.statusCode = 200
        mockReadBody = async function (): Promise<string> {
          return new Promise(resolve => {
            resolve(
              JSON.stringify({
                auth_token: VALID_AUTH_TOKEN
              })
            )
          })
        }
      }
      return new Promise<HttpClientResponse>(resolve => {
        resolve({
          message: mockMessage,
          readBody: mockReadBody
        })
      })
    })

  nock(S3_URL).post(/./).reply(204)
}
