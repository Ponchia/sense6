# 0001. Name and host Sense6 on Cloudflare Pages
<!-- vale Vale.Spelling = NO -->

Status: Accepted

## Context

The perception suite started as the Tetracromia experiment and later used
Sensoria as its umbrella name. The repository, package, container, Kubernetes
workload, and public hostname retained the original Tetracromia identity.

The application is a static Vite site. It has no application server, account
system, upload path, or runtime API. The existing delivery path built a private
container, updated a GitOps repository, ran two Kubernetes pods, passed through
Traefik, and used a Cloudflare Tunnel for public ingress.

The product needs one stable identity and origin. Deployment must retain the
complete unit, browser, responsive, and accessibility gate and the existing
security headers.

## Decision

- Use **Sense6** as the suite and package name. Keep **Tetracromia** as the name
  of the colour-discrimination experiment.
- Rename the GitHub repository to `Ponchia/sense6`.
- Use `https://sense6.net` as the canonical production origin.
- Deploy the static site to the Cloudflare Pages project `sense6` by direct
  upload from GitHub Actions.
- Run `npm run check` before deployment, store its generated `dist/` directory
  as a short-lived workflow artifact, and deploy those exact verified files.
- Keep security and cache policy in `public/_headers` so Vite copies it into the
  deployed bundle.
- Redirect `www.sense6.net` and the former hostname to the canonical origin.
- Remove the former GHCR, Kubernetes, Flux, Traefik, and Cloudflare Tunnel path
  only after the Pages deployment and both canonical hostnames are verified.

## Consequences

- The public site no longer depends on the personal Kubernetes cluster.
- Rollback redeploys a previous verified Pages deployment. The old Kubernetes
  workload remains available until the cutover is verified and its retirement
  change is merged.
- Browser storage is origin-bound. Existing summaries under the former origin
  are not deleted, but they are not visible from `sense6.net`. Returning to the
  former origin before its retirement restores access to them.
- Cloudflare Pages credentials become repository secrets. The API token must be
  limited to the Pages and domain operations required by the workflow.
- Preview deployments remain excluded from search indexing.
