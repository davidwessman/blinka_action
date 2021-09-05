import * as auth from '@actions/http-client/auth'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as httpm from '@actions/http-client'
import {BlinkaError, readJSON} from './shared'
import {
  JsonReport,
  JsonResult,
  TestReportBody,
  TestReportResult,
  UploadedImage
} from './types'
import formData from 'form-data'
import fs from 'fs'
import mime from 'mime'
import path from 'path'

function initialize_client(token: string | null = null): httpm.HttpClient {
  const bearers: auth.BearerCredentialHandler[] = []
  if (token) {
    bearers.push(new auth.BearerCredentialHandler(token))
  }
  return new httpm.HttpClient('blinka', bearers, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  })
}

export class BlinkaClient {
  client: httpm.HttpClient
  host: string
  token_id: string
  token_secret: string

  authenticated = false

  constructor(host: string, token_id: string, token_secret: string) {
    this.host = host
    this.client = initialize_client()
    this.token_id = token_id
    this.token_secret = token_secret
  }

  async setup(): Promise<void> {
    try {
      const result: httpm.HttpClientResponse = await this.client.post(
        `${this.host}/authentication`,
        JSON.stringify({
          token_id: this.token_id,
          token_secret: this.token_secret
        })
      )
      if (result.message.statusCode !== 200) {
        throw new BlinkaError(`Could not authenticate to ${this.host}`)
      }

      this.client = initialize_client(
        JSON.parse(await result.readBody())['auth_token']
      )
      this.authenticated = true
    } catch (error) {
      throw new BlinkaError(`Could not authenticate to ${this.host}`)
    }
  }

  async prepare_results(results: JsonResult[]): Promise<TestReportResult[]> {
    return Promise.all(results.map(async result => this.convert_result(result)))
  }

  async report(report_body: TestReportBody): Promise<void> {
    const body = JSON.stringify(report_body)
    core.debug(body)
    const response = await this.client.post(`${this.host}/report`, body)

    if (response.message.statusCode !== 200) {
      throw new BlinkaError(`Could not report test results to ${this.host}`)
    }
  }

  async convert_result(result: JsonResult): Promise<TestReportResult> {
    const image = await this.handle_image(result.image)
    if (image) {
      core.debug(image.toString())
    }
    return {
      ...result,
      image
    }
  }

  async handle_image(image: string | null): Promise<UploadedImage | null> {
    if (image == null) return null
    if (!fs.existsSync(image)) return null
    const filename = path.basename(image)
    const content_type = mime.getType(image)
    const size = (await fs.promises.stat(image)).size

    const response = await this.client.get(
      `${this.host}/presign?filename=${filename}&content_type=${content_type}`
    )

    if (response.message.statusCode !== 200) {
      throw new BlinkaError(`Could not presign image ${this.host}`)
    }

    const {url, fields} = JSON.parse(await response.readBody())

    const form = new formData()
    for (const key of Object.keys(fields)) {
      form.append(key, fields[key])
    }
    form.append('file', fs.createReadStream(image))

    form.submit(url, function (err, res) {
      if (err || res.statusCode !== 204) {
        throw new BlinkaError('Failed to upload image to presigned url')
      }
    })

    const [storage, id] = fields.key.split('/')
    return {
      id,
      storage,
      metadata: {
        size,
        filename,
        mime_type: content_type
      }
    }
  }
}

export async function report_to_blinka(
  filename: string,
  token_id: string,
  token_secret: string,
  blinka_host = 'https://www.blinka.app/api/v1'
): Promise<Boolean> {
  const data: JsonReport = await readJSON(filename)
  const client = new BlinkaClient(blinka_host, token_id, token_secret)
  const repo = github.context.repo
  try {
    await client.setup()

    const results = await client.prepare_results(data.results)

    const body: TestReportBody = {
      report: {
        repository: `${repo.owner}/${repo.repo}`,
        tag: data.tag,
        commit: data.commit,
        metadata: {
          total_time: data.total_time,
          nbr_tests: data.nbr_tests,
          nbr_assertions: data.nbr_assertions,
          seed: data.seed
        },
        results
      }
    }

    await client.report(body)
  } catch (error) {
    if (error instanceof Error) {
      core.warning(error.message)
    }
    return false
  }

  return true
}
