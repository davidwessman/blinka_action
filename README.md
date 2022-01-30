<p align="center">
  <a href="https://github.com/davidwessman/blinka_action">
    <img alt="blinka_action status" src="https://github.com/davidwessman/blinka_action/workflows/build-test/badge.svg">
  </a>
</p>

# Reporting test results with Blinka

## What is Blinka?

- A test result format that can be reported to [blinka.app](https://www.blinka.app) or in a more limited form directly in a Github Action.

![Example of Blinka comment on a pull request](./blinka-example.png?raw=true)

## Setup without blinka.app

This is a simpler version running directly in Github Action with no access to external service.

**Limitations**

- No access to test history
- No ability to show screenshots in test reports

### Steps

1. Generate test results by using one of the reporters:

- For Ruby on Rails see [blinka-reporter](https://github.com/davidwessman/blinka-reporter)
- For Jest see [Generate test report for Jest](#generate-test-report-for-jest)

2. Add the action `davidwessman/blinka_action@v1` in a step after the tests run with parameters:

- `github_token: ${{ secrets.GITHUB_TOKEN }}` after tests.
- `filename` - the path of your formatted test results from step 1.

```yaml
  # Rails Github Action seetup

  - name: Run tests
    env:
      BLINKA_JSON: true
    run: bundle exec rails test:system test

  - name: Report to Github PR
    uses: davidwessman/blinka_action@v1
      with:
        filename: ./test/blinka_results.json
        github_token: ${{ secrets.GITHUB_TOKEN }}
```

<details>

  <summary>See full example</summary>

```yaml
name: Main
on: [push]

jobs:
  tests:
    name: Tests
    runs-on: ubuntu-20.04
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_DB: synka_test
          POSTGRES_PASSWORD: 'password'
        ports: ['5432:5432']

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: 14.x
          cache: 'yarn'

      - name: Install packages
        run: |
          yarn install --pure-lockfile

      - name: Setup test database
        env:
          RAILS_ENV: test
          PGHOST: localhost
          PGUSER: myapp
        run: |
          bin/rails db:setup

      - name: Run tests
        env:
          BLINKA_JSON: true
        run: bundle exec rails test:system test

      - name: Report to Github PR
        uses: davidwessman/blinka_action@v1
        with:
          filename: ./test/blinka_results.json
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

</details>

3. Start building your tests and see the results reported!

## Setup with blinka.app

- Add the Github App to your account and give access to repositories [Blinka Bot](https://github.com/apps/blinka-bot).
- Register an account on [Blinka](https://www.blinka.app/user/new)
- When your account is confirmed:
  - Add your repositories in the Blinka UI.
  - Create an access token and store the `token_id` and `token_secret` in your Github Secrets, I use the names `BLINKA_TOKEN_ID` and `BLINKA_TOKEN_SECRET` in the actions below.
- Setup reporting with this action.

## Workflow

1. Generate test results by using one of the reporters:
   - For Ruby on Rails see [blinka-reporter](https://github.com/davidwessman/blinka-reporter)
   - For Jest see [Generate test report for Jest](#generate-test-report-for-jest)
2. If your CI builds are always running with access to Secrets (not from forks or for example Dependabot), continue with [Example 1](#example-1---use-blinkaapp-with-full-access-to-secrets).
3. If you sometimes build without secrets, continue with [Example 2](#example-2---separate-reporting-job)
   - Store `blinka_results.json` as an artifact along with any screenshots.
   - In a reporting job running with access to Secrets, download the report and screenshots.
   - Run the action

## Example 1 - Use blinka.app with full access to secrets

```yaml
  # Rails Github Action seetup

  - name: Run tests
    env:
      BLINKA_JSON: true
    run: bundle exec rails test:system test

  - name: Report to Blinka
    uses: davidwessman/blinka_action@v1
      with:
        token_id: ${{ secrets.BLINKA_TOKEN_ID }}
        token_secret: ${{ secrets.BLINKA_TOKEN_SECRET }}
```

<details>

  <summary>See full example</summary>

```yaml
name: Main
on: [push]

jobs:
  tests:
    name: Tests
    runs-on: ubuntu-20.04
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_DB: synka_test
          POSTGRES_PASSWORD: "password"
        ports: ["5432:5432"]

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: 14.x
          cache: "yarn"

      - name: Install packages
        run: |
          yarn install --pure-lockfile

      - name: Setup test database
        env:
          RAILS_ENV: test
          PGHOST: localhost
          PGUSER: myapp
        run: |
          bin/rails db:setup

      - name: Run tests
        env:
          BLINKA_JSON: true
        run: bundle exec rails test:system test

      - name: Report to Blinka
        uses: davidwessman/blinka_action@v1
          with:
            token_id: ${{ secrets.BLINKA_TOKEN_ID }}
            token_secret: ${{ secrets.BLINKA_TOKEN_SECRET }}
```

</details>

## Example 2 - Separate reporting job

### Running tests

```yaml
  # Rails Github Action seetup

  - name: Run tests
    env:
      BLINKA_JSON: true
    run: bundle exec rails test:system test

    - if: always()
      run: |
        mkdir -p ./report/tmp # -p allows creating multiple folders at once
        [ ! -f ./blinka_results.json ] || mv blinka_results.json ./report
        [ ! -f ./tmp/screenshots ] || mv tmp/screenshots ./report/tmp/screenshots

    - uses: actions/upload-artifact@v2
      if: always()
      with:
        name: report
        path: ./report
```

### Reporting

Inspired by https://securitylab.github.com/research/github-actions-preventing-pwn-requests/

```yaml
name: report-results

on:
  workflow_run:
    workflows: ['build-test']
    types:
      - completed

jobs:
  upload:
    runs-on: ubuntu-latest
    if: >
      ${{ github.event.workflow_run.event == 'pull_request' &&
      github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v2

      - name: 'Download artifact'
        uses: actions/github-script@v3.1.0
        with:
          script: |
            var artifacts = await github.actions.listWorkflowRunArtifacts({
               owner: context.repo.owner,
               repo: context.repo.repo,
               run_id: ${{github.event.workflow_run.id }},
            });
            var matchArtifact = artifacts.data.artifacts.filter((artifact) => {
              return artifact.name == "report"
            })[0];
            var download = await github.actions.downloadArtifact({
               owner: context.repo.owner,
               repo: context.repo.repo,
               artifact_id: matchArtifact.id,
               archive_format: 'zip',
            });
            var fs = require('fs');
            fs.writeFileSync('${{github.workspace}}/report.zip', Buffer.from(download.data));
      - run: unzip report.zip
      - name: 'Upload reports'
        uses: ./
        with:
          token_id: ${{ secrets.BLINKA_TOKEN_ID }}
          token_secret: ${{ secrets.BLINKA_TOKEN_SECRET }}
          filename: './blinka_results.json'
```

## Generate test report for Jest

- Copy the [`blinka-json-reporter.ts`](./src/blinka-json-reporter.ts) to your own project.
- Configure Jest to use the reporter, for example in [`jest.config.js`](./jest.config.js#L10) or using the flag `--reporters` (see [Documentation](https://jestjs.io/docs/configuration#reporters-arraymodulename--modulename-options))
- Make sure to run Jest using `--testLocationInResults` to include reporting of line numbers.
