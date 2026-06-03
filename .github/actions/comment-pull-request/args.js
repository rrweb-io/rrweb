import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .number('prNumber')
  .describe('prRequired', 'Flag indicating if action should fail when a pull request is not found')

  .string('githubToken')
  .describe('githubToken', 'Github authentication token')

  .string('comment')
  .describe('comment', 'The comment to place on the pull request')

  .string('commentTag')
  .describe('commentTag', 'The tag to use for updating an existing comment on the pull request')

  .demandOption(['prNumber', 'githubToken'])

  .argv
