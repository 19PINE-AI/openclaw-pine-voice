# Releasing openclaw-pine-voice

## Prerequisites (one-time setup)

### npm Trusted Publishing

Publishing uses OIDC-based trusted publishing — no npm tokens needed.

1. Publish the first version manually (trusted publishing requires the package to exist):
   ```bash
   npm login
   npm publish --access public
   ```
2. Go to **npmjs.com** → **openclaw-pine-voice** → **Settings** → **Trusted Publisher**
3. Select **GitHub Actions** and configure:
   - **Organization or user**: `19PINE-AI`
   - **Repository**: `openclaw-pine-voice`
   - **Workflow filename**: `publish.yml`
   - **Environment name**: *(leave blank)*
4. Click **Set up connection**

After this, all future publishes are automatic via CI.

## Publishing a new version

1. **Bump the version** in `package.json`:
   ```bash
   # For a patch release (0.1.0 → 0.1.1)
   npm version patch --no-git-tag-version

   # For a minor release (0.1.1 → 0.2.0)
   npm version minor --no-git-tag-version

   # For a major release (0.2.0 → 1.0.0)
   npm version major --no-git-tag-version
   ```

2. **Commit and tag**:
   ```bash
   git add package.json
   git commit -m "release: v<VERSION>"
   git tag v<VERSION>
   ```

3. **Push with tags**:
   ```bash
   git push origin main --tags
   ```

4. **Monitor** the publish workflow at the repo's **Actions** tab on GitHub.

5. **Verify** the published package:
   ```bash
   npm view openclaw-pine-voice
   ```

## What happens on tag push

1. The CI workflow runs (build across Node 18, 20, 22)
2. If CI passes, the publish job runs
3. npm CLI exchanges a GitHub OIDC token for a short-lived npm publish token
4. Package is published to npm with `--access public`

## Dependency note

This package depends on `pine-voice` (`^0.1.0`). When releasing both packages, always publish `pine-voice` first.

## Notes

- The `RELEASING.md` file is not included in the npm package (not in the `files` field)
- Trusted publishing eliminates the need for stored npm tokens
- Only tag pushes matching `v*` trigger the publish workflow
