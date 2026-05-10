# Article Workbook: Building Private Signal Board on Midnight

Important: do not submit this file verbatim. Midnight issue #314 says substantially AI-generated content can be disqualified. Treat this as a working packet: rewrite it in your own voice, add screenshots from your own run, and only publish the version you personally stand behind.

Target bounty: https://github.com/midnightntwrk/contributor-hub/issues/314

Repository: https://github.com/marmar9615-cloud/midnight-private-signal

Suggested title: Building Private Signal Board: a Full-Stack Midnight dApp with Compact, Witnesses, React, and Off-Chain Metadata

## 1. Opening Angle

Most demo applications on a new smart contract platform show the same happy path: deploy a contract, write some state, read it back, and call it done. That is useful for learning syntax, but it misses the part that makes Midnight interesting. Midnight is built for applications where developers need to choose what becomes public, what remains private, and what can be proven without being fully revealed.

For this tutorial I built a small application called Private Signal Board. The concept is intentionally practical: imagine a team wants a public board of approved signals, announcements, or incident reports, but it does not want the full private input path to become public application state. The public chain state should remain compact and auditable. The browser should still feel like a normal dApp. The backend can provide richer metadata and documentation, but that metadata should not become the source of truth for the contract itself.

The final project is a full-stack Midnight application with four moving pieces:

- A Compact contract based on the official bulletin board scaffold.
- TypeScript witnesses and generated API bindings.
- A small metadata API for off-chain context and UI configuration.
- A React UI that displays contract-backed state beside the metadata service status.

That may sound like a lot for a tutorial, but the goal is to show the lifecycle that a developer actually needs: compile the contract, generate bindings, run tests, start a proof server, run the API packages, and build a browser interface that can be expanded into a real app.

## 2. What the App Does

Private Signal Board exposes a simple board experience. The user can see the current board message and submit a replacement message through the Midnight app flow. The contract remains the source of truth for the public message, while local witness logic handles private values that should not be treated as ordinary public UI data.

The app also includes a metadata API. That service does not control the contract. It serves operational context: the campaign name, network, proof server endpoint, privacy model, and the list of contracts or surfaces the UI should explain. In production, this kind of metadata service could become the place for documentation links, moderation labels, support links, or chain explorer references.

For this tutorial, the metadata API matters because it demonstrates a common full-stack pattern:

- Public contract state stays on Midnight.
- Private inputs and secrets stay in the Midnight witness layer or wallet flow.
- Human-readable context can live off-chain.
- The UI makes the boundary visible instead of pretending every piece of data has the same trust model.

That separation is the main design idea behind the project.

## 3. Repository Structure

The repository is a monorepo generated from the Midnight application scaffold and then extended with the metadata service and UI panel.

Key folders:

- `contract/`: Compact source, witness implementation, generated managed files, and contract tests.
- `api/`: TypeScript API package that wraps the generated contract interface.
- `bboard-cli/`: CLI package from the scaffold.
- `bboard-ui/`: React browser UI.
- `metadata-api/`: Small Node HTTP service added for this tutorial.
- `.github/workflows/ci.yaml`: GitHub Actions workflow that compiles and tests the contract, API, CLI, UI, and metadata API.

The important point is that this is not just a static example. CI compiles the contract with Compact, typechecks the packages, builds the UI, and runs the metadata API tests.

## 4. Toolchain

The local toolchain used for this project:

- Node.js v26.0.0
- npm 11.14.1
- Docker 29.4.2
- Midnight Compact compiler 0.31.0 through the official compiler setup flow
- Midnight proof server image `midnightntwrk/proof-server:8.0.3`

The project originally surfaced a version mismatch between the Compact compiler used in CI and the Compact runtime dependency used by the generated code. The fix was to align the GitHub Actions workflow with Compact 0.31.0 and use `@midnight-ntwrk/compact-runtime` `^0.16.0`.

That detail is worth mentioning because it is one of the most realistic parts of building with early ecosystem tooling. If the generated contract code, compiler, and runtime drift apart, the UI may compile but fail at runtime. The finished repo keeps those versions aligned and verifies them in CI.

## 5. Contract Layer

The contract source lives in:

`contract/src/bboard.compact`

The scaffold contract models a board message with an owner and a sequence number. The owner matters because updates should be authorized. The sequence number matters because the frontend and API need a stable way to reason about state changes over time.

In a privacy-focused application, the interesting question is not only "what data exists?" It is "who learns the data, when, and through which channel?" For this app, the public message is intentionally public. The private pieces live around the update path and the witness layer. A more advanced version of this application could replace the public message with a commitment, a nullifier, an encrypted payload reference, or a selective disclosure proof.

This first version keeps the contract understandable and focuses the tutorial on the full dApp lifecycle. That makes it easier to inspect each layer and see where the privacy boundary sits.

The useful mental model:

- Compact defines the state transition rules.
- Witness code supplies private or local values needed by the circuit.
- Generated TypeScript exposes the contract to the rest of the app.
- The UI and metadata API should not bypass the contract as the source of truth.

## 6. Witness Layer

The witness implementation lives in:

`contract/src/witnesses.ts`

Witnesses are one of the places where Midnight feels different from a conventional web app. In a normal full-stack app, a developer might pass every value through API requests, server logs, or browser state. In a Midnight app, some values are intentionally local, private, or proof-related.

The witness layer gives the application a place to provide those values without turning them into ordinary public contract state.

For this project, the witness layer remains close to the generated scaffold, which is a strength for a tutorial. The goal is to show where developers should look and how the pieces compile together. Once you understand that shape, it becomes much easier to extend the app into cases like private incident reporting, anonymous team feedback, private voting, or credential-gated submissions.

## 7. API Layer

The scaffold API package lives in:

`api/`

This package wraps the generated contract interface and gives the rest of the project a typed way to interact with the contract. The important lesson is that developers should resist treating the browser UI as the only integration layer. A good dApp has a stable API boundary so tests, scripts, CLI flows, and UI components can reuse the same contract understanding.

The API package is checked by CI with:

```bash
cd api
npm run ci
```

That command passed locally and in GitHub Actions after the compiler/runtime alignment.

## 8. Metadata API

The added metadata service lives in:

`metadata-api/`

It exposes:

- `GET /health`
- `GET /campaign`
- `GET /contracts/bboard`
- `GET /contracts/:name`

The service is intentionally small. It uses Node's built-in HTTP server rather than bringing in a framework, because the point is the integration pattern rather than server framework complexity.

The `GET /campaign` response gives the UI a single place to read:

- The app name.
- The target Midnight network.
- The proof server URL.
- The privacy model.
- The known contract surfaces.

The UI uses that response to render an operational panel beside the board. This makes the tutorial more concrete: when a developer opens the browser, they can see not just the board, but the supporting services that make the application run.

The metadata API is tested with Node's built-in test runner:

```bash
npm run typecheck -w metadata-api
npm run build -w metadata-api
npm run test -w metadata-api
```

The test suite passed locally with 4 tests.

## 9. React UI

The browser UI lives in:

`bboard-ui/`

The main integration points are:

- `bboard-ui/src/App.tsx`
- `bboard-ui/src/components/MetadataPanel.tsx`
- `bboard-ui/.env.preprod`
- `bboard-ui/.env.preview`

The UI now shows a Private Signal Board layout. It keeps the core board interaction from the scaffold, but adds a metadata panel that fetches from the metadata API. The panel is designed to answer the question a developer usually has when opening a new dApp:

"What services am I connected to, and what data boundary am I looking at?"

The panel displays:

- Metadata API status.
- Network label.
- Proof server URL.
- Privacy model.
- Contract description.

The UI build was verified with:

```bash
cd bboard-ui
npm run ci
npm run build
```

The production build completed successfully. There were warnings from an upstream Midnight package related to `isomorphic-ws/browser.js`, but the build passed and the app rendered correctly in local browser verification.

## 10. Running the Project Locally

Install dependencies from the repository root:

```bash
npm install
```

Compile and test the contract:

```bash
cd contract
npm run ci
```

Run the metadata API:

```bash
cd metadata-api
npm run build
npm start
```

By default the metadata API listens on port `4001`.

Start the proof server with Docker:

```bash
docker run --rm -p 6300:6300 midnightntwrk/proof-server:8.0.3
```

Then run the UI:

```bash
cd bboard-ui
npm run dev -- --host 127.0.0.1
```

The UI reads the metadata API URL from:

```bash
VITE_METADATA_API_URL=http://127.0.0.1:4001
```

That value is included in the preprod and preview env files in the repo.

## 11. CI Evidence

The project includes a GitHub Actions workflow:

`.github/workflows/ci.yaml`

The workflow checks:

- Compact compiler setup.
- Root dependency installation.
- Contract compile and tests.
- API package CI.
- Metadata API typecheck, build, and tests.
- CLI package CI.
- UI package CI.

The main branch CI run for commit `e95c34b` passed.

That passing CI run is important for the bounty because it gives reviewers a quick way to verify that the code compiles and the package boundaries are wired together.

## 12. Screenshot

The repository includes a screenshot in:

`docs/assets/private-signal-board.png`

Use your own screenshot in the final article if you rerun the app locally. The included screenshot is useful for showing the finished browser state: Private Signal Board on the left, metadata service status on the right, and readable operational context for the Midnight network and proof server.

## 13. Why This Pattern Fits Midnight

Private Signal Board is intentionally modest, but it points toward bigger application designs.

A public bulletin board is easy to build anywhere. The Midnight-specific value appears when the board becomes an interface for controlled disclosure. The app can show public state while keeping submission inputs, eligibility checks, or author identity outside ordinary public state.

Possible extensions:

- Anonymous incident reporting with moderator approval.
- Private team feedback with public aggregate summaries.
- Credential-gated posting where eligibility is proven but identity is not exposed.
- Encrypted payload references where the public contract stores commitments.
- Selective disclosure workflows for audits or compliance reviews.

Those extensions follow the same architecture shown here:

- Compact contract for the rules.
- Witness layer for private proof inputs.
- Generated TypeScript API for app integration.
- Metadata service for human-readable context.
- React UI for the user workflow.

## 14. Troubleshooting Notes

The biggest issue I hit was version alignment. The UI initially reached a runtime failure because the generated code expected a different Compact runtime than the package installed in the workspace. The fix was to align the compiler and runtime versions:

- Compact compiler setup in CI: `0.31.0`
- `@midnight-ntwrk/compact-runtime`: `^0.16.0`

After that change, the contract compiled, tests passed, the UI built, and the browser page rendered correctly.

The other practical note is that local proof-server setup should be treated as part of the app, not an optional afterthought. If the proof server is not running, the browser flow may look like a frontend problem even though the missing piece is the local proving service.

## 15. What I Would Improve Next

The next version of Private Signal Board should move from a public message board toward a stronger private submission model. The most interesting upgrade would be replacing the public message update with a commitment-based workflow:

- Users submit private messages or incident reports locally.
- The contract stores a commitment or approved public summary.
- Moderators can prove authorization without exposing extra private inputs.
- The UI can show public summaries while preserving private source material.

Another useful upgrade would be a richer wallet walkthrough. The current repo proves the scaffold compiles and the browser UI renders, but the final tutorial should include the author's own wallet screenshots and transaction notes from Lace or 1AM on the target Midnight network.

## 16. Final Submission Checklist

Before publishing the final article:

- Rewrite this workbook in your own voice.
- Run the repo locally on your machine.
- Capture your own screenshots.
- Add wallet-specific notes from your own Lace or 1AM flow.
- Confirm the GitHub Actions main branch CI is still passing.
- Publish the article to Dev.to, Medium, Hashnode, Substack, or another public platform.
- Share the article link on social with `#MidnightforDevs` and tag `@midnightntwrk`.
- Comment on Midnight issue #314 with the article link, repo link, and the exact phrase `Ready for review`.

Do not skip the last phrase. The issue text asks for that exact review signal.

## 17. Reference Links

- Bounty issue: https://github.com/midnightntwrk/contributor-hub/issues/314
- Repository: https://github.com/marmar9615-cloud/midnight-private-signal
- Midnight contributor hub terms: https://github.com/midnightntwrk/contributor-hub/blob/main/legal/BOUNTY_TERMS.md
