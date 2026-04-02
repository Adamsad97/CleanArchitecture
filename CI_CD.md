# CI/CD setup

## Workflows

- `.github/workflows/ci.yml`
  - Runs on each push and pull request
  - Backend: install, test, build
  - Frontend: install, build

- `.github/workflows/cd.yml`
  - Runs after `CI` finishes successfully on the `develop` branch
  - Builds backend and frontend
  - Uploads build artifacts (`backend-dist`, `frontend-dist`)

## How to use artifacts

- Open the finished `CD` run in GitHub Actions
- Download `backend-dist` and `frontend-dist`
- Deploy each artifact to your hosting platform

## Notes

- Node version used in workflows: `20`
- Dependency install command: `npm ci`
- Build output expected in `backend/dist` and `frontend/dist`
