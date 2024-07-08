#!/usr/bin/env nu

# Prompt the user for a commit message
print "Enter commit message: "
let commit_message = (input)

# Run git add .
print "Running git add ."
git add .

# Run git commit with the user's commit message
print "Running git commit -m $commit_message"
git commit -m $commit_message

# Run git push
print "Running git push"
git push
