export interface Result {
  line: number
  name: string
  path: string
  result: string
  kind: string | null
  time: number | null
  backtrace: string[] | null
  message: string | null
}

export interface JsonResult extends Result {
  image: string | null
}

export interface JsonReport {
  total_time: number
  nbr_tests: number
  nbr_assertions: number
  commit: string
  tag: string
  seed: number
  results: JsonResult[]
}

export interface ReportMetadata {
  total_time: number
  nbr_tests: number
  nbr_assertions: number
  seed: number
}

export interface UploadedImageMetadata {
  size: number | null
  filename: string
  mime_type: string | null
}

export interface UploadedImage {
  id: string
  storage: string
  metadata: UploadedImageMetadata
}

export interface TestReportResult extends Result {
  image: UploadedImage | null
}

export interface TestReport {
  repository: string
  tag: string
  commit: string
  metadata: ReportMetadata
  results: TestReportResult[]
}

export interface TestReportBody {
  report: TestReport
}
