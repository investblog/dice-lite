# Releasing dice-lite

No npm token ever enters this repository's code, its CI secrets beyond one day, or any agent's
hands. Releases publish via **OIDC Trusted Publishing** with provenance
(`.github/workflows/release.yml`). Every outward step below is taken on the maintainer's explicit
go — creating the repository, the token, the publish.

## One-time bootstrap (v0.1.0)

npm cannot attach a trusted publisher to a package that does not exist yet, so the first version
goes out over a token and every later one over OIDC. The family's long form, with its traps, is
[slots-lite's RELEASING.md](https://github.com/investblog/slots-lite/blob/main/RELEASING.md); the
short form:

1. **The account is publish-ready**: no recovery-code sign-in in the last 72 hours (npm freezes
   the account for 72 hours after one), and a working passkey or security key for the second
   factor.
2. **The name is free**: `npm view @spintax/dice-lite` answers E404. The scope is reserved for
   this family (ADR 001: scoped from the start, after npm's similarity guard cost slots-lite its
   unscoped name).
3. npmjs.com → Access Tokens → **Granular**: **All packages**, **Read and write (publish and
   stage)**, **Bypass 2FA**, the shortest expiry.
4. GitHub → Settings → Secrets and variables → Actions → `NPM_TOKEN`, pasted by hand. It passes
   through no chat, file or agent.
5. `package.json` already says `0.1.0`. Actions → **Bootstrap publish (one-time)** → Run workflow
   from `main`. It checks the token's shape, re-runs every gate, verifies the tarball, publishes
   with `--provenance`.
6. **The same day:** npmjs.com → package → Settings → **Trusted Publisher** → GitHub Actions:
   `investblog` / `dice-lite` / `release.yml` / no environment. Then push the `v0.1.0` tag (its
   run exits green on the duplicate check), delete the `NPM_TOKEN` secret, revoke the token on
   npmjs.com, delete `bootstrap-publish.yml`.

## Every later release

```sh
npm version minor          # any change to the output bytes is a minor (ADR 001)
# update CHANGELOG.md — say what changed in the output
git push && git push --tags
```

`release.yml` on the tag re-runs lint, build, tests and the size gate, checks the tag matches
`package.json`, checks the tarball carries `dice.js`, `dice.min.js` and `dice.d.ts`, and
publishes with provenance. A version already on the registry exits green.

## The five npm failure modes, in the order they appear

Each one reports something other than its cause. Inherited from octagons, roulette-lite and
slots-lite; none of them was diagnosable from its own message.

| What the log says | What it actually is |
|---|---|
| `npm_*** is not a legal HTTP header value` | whitespace or a line break inside the token secret — npm sends the token as an HTTP header |
| `EOTP` / one-time password required | a token *setting*, not a type: classic Automation tokens are gone, and a granular token without **Bypass 2FA** stops here against an account with 2FA |
| `404 Not Found - PUT` | not a missing package: npm masks 403 as 404. The credential has no publish rights, or there is no trusted publisher for the OIDC path |
| `403 Forbidden - PUT … account has been temporarily suspended due to a recent security-sensitive action` | npm's 72-hour account hold, started by a recovery-code sign-in. It clears itself — no support ticket, and no new credential helps |
| `403 Forbidden - PUT … Package name too similar to existing package …` | npm's typosquatting guard, applied only at the publish itself — `npm view` answering E404 says nothing about it. The scoped name cannot collide. Nothing is published |

The first two cannot occur on the OIDC path. The name check is a first-publish problem only.
After a successful first publish the registry may answer 404 for several minutes before the new
package appears; that is not a failure. The two 403/404 rows print a provenance success line
immediately before failing, so a log that looks like a success up to its final line is the
normal shape of both.
