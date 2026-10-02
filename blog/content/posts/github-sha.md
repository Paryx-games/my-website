---
title: 'Verifying commits on GitHub with SSH'
description: 'I started verifying commits with GitHub SSH signing'
date: '2026-10-02'
authors:
  - paryx
tags:
  - GitHub
  - Security
  - Git
draft: true
---

I recently started signing my Git commits with a dedicated SSH signing key.

This means GitHub can verify that a commit was signed using a key linked to my account and show the **Verified** badge next to it.

I use a separate Ed25519 key just for signing commits, rather than reusing my normal SSH authentication key.

My Git config is basically:

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519_signing.pub
git config --global commit.gpgsign true
git config --global tag.gpgSign true
```

Even though the config still says `gpg`, `gpg.format ssh` tells Git to use SSH signatures instead.

The private key is passphrase-protected and loaded into `ssh-agent`, so Git can sign commits without asking for the passphrase every single time.

## Why bother?

For open-source software, signing commits gives people another way to verify the repository history.

It does not mean the code is automatically safe or reviewed, but it does prove that the commit has not been changed since it was signed and that GitHub recognises the signing key as mine.

For projects where I publish executables, I like having a clearer chain between:

**source code.. signed commit.. release.. downloaded build**

It is a small thing, but it makes the project a bit more transparent and trustworthy.
