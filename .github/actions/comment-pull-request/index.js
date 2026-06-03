import * as github from '@actions/github'
import { args } from './args.js'

const octokit = github.getOctokit(args.githubToken)

let commentBody = args.comment.split('\n')
commentBody = commentBody.concat(args.commentTag.split('\n'))

while (commentBody.length > 0 && commentBody[0].trim() === '') {
  // Do not start the comment with an empty line
  commentBody.shift()
}

while (commentBody.length > 0 && commentBody[commentBody.length - 1].trim() === '') {
  // Do not end the comment with an empty line
  commentBody.splice(-1)
}

// Trim surrounding whitespace
commentBody = commentBody.map(c => c.trim())

let comment
if (args.commentTag && args.commentTag.toString().trim() !== '') {
  for await (const { data: comments} of octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: args.prNumber
    }
  )) {
    comment = comments.find(c => c?.body?.includes(args.commentTag.trim()))
    if (comment) {
      break
    }
  }
}

if (comment) {
  await octokit.rest.issues.updateComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: args.prNumber,
    comment_id: comment.id,
    body: commentBody.join('\n')
  })
} else {
  await octokit.rest.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: args.prNumber,
    body: commentBody.join('\n')
  })
}
