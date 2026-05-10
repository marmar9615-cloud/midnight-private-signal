# Building Private Signal Board: a Full-Stack Midnight dApp with Compact, Witnesses, React, and Off-Chain Metadata

Repository: https://github.com/marmar9615-cloud/midnight-private-signal

Bounty issue: https://github.com/midnightntwrk/contributor-hub/issues/314

![Private Signal Board UI](https://raw.githubusercontent.com/marmar9615-cloud/midnight-private-signal/main/docs/assets/private-signal-board.png)

## 1. Opening Angle

Most demo applications on a new smart contract platform show the same happy path: deploy a contract, write some state, read it back, and call it done. That is useful for learning syntax, but it misses the part that makes Midnight interesting. Midnight is built for applications where developers need to choose what becomes public, what remains private, and what can be proven without being fully revealed.

For this tutorial I built a small application called Private Signal Board. The concept is intentionally practical: imagine a team wants a public board of approved signals, announcements, or incident reports, but it does not want the full private input path to become public application state. The public chain state should remain compact and auditable. The browser should still feel like a normal dApp. The backend can provide richer metadata and documentation, but that metadata should not become the source of truth for the contract itself.

The final project is a full-stack Midnight application with four moving pieces:

- A Compact contract based on the official bulletin board scaffold.
- TypeScript witnesses and generated API bindings.
- A small metadata API for off-chain context and UI configuration.
- A React UI that displays contract-backed state beside the metadata service status.

That may sound like a lot for a tutorial, but the goal is to show the lifecycle that a developer actually needs: compile the contract, generate bindings, run tests, start a proof server, run the API packages, and build a browser interface that can be expanded into a real app.

I kept the application deliberately small because the boundaries are the lesson. A giant app can hide whether the contract, backend, wallet, and UI are actually working together. A compact board makes the flow easier to inspect. You can follow a single state surface from the Compact source, through the generated TypeScript packages, into the browser, and finally into the metadata panel that explains the surrounding environment.

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

The latest main branch CI and scan workflows are passing.

That passing CI run is important for the bounty because it gives reviewers a quick way to verify that the code compiles and the package boundaries are wired together.

## 12. Screenshot

The repository includes a screenshot in:

`docs/assets/private-signal-board.png`

The screenshot above shows the finished browser state: Private Signal Board on the left, metadata service status on the right, and readable operational context for the Midnight network and proof server. I included it in the repository so reviewers can inspect the visual result alongside the code.

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

## 16. Wallet Provider Setup

The bounty asks for wallet provider setup with Lace or 1AM through the dApp connector, so the browser flow is structured around the same local services a developer needs when moving from compile-time checks into real interaction.

The order I use is:

```bash
docker run --rm -p 6300:6300 midnightntwrk/proof-server:8.0.3
```

Then, in another terminal:

```bash
cd metadata-api
npm run build
npm start
```

Then, in a third terminal:

```bash
cd bboard-ui
npm run dev -- --host 127.0.0.1
```

With those services running, the UI is ready for the wallet connector path. A Midnight-compatible wallet such as Lace or 1AM should be installed in the same browser profile, set to the target test network, and funded with the assets needed for the transaction flow. The important thing is that the wallet should be treated as part of the application architecture, not as an afterthought tacked onto the end.

In this project the UI makes the service boundary visible before the wallet action. The metadata panel shows which network is expected, which proof server URL the app is configured around, and which contract surface the user is interacting with. That reduces confusion during wallet debugging because a developer can tell the difference between a missing proof server, a missing metadata API, and a wallet connector problem.

The connector flow should be explained in terms of what the user is authorizing. The wallet is not just a login button. It is the user's control point for authorizing interactions with the Midnight dApp. The proof server supports proof generation, the Compact contract defines the state transition, and the wallet sits at the boundary where the user approves the interaction.

## 17. Deeper Contract Walkthrough


The contract deserves more attention than it would get in a normal frontend article. Midnight readers will care about how the contract boundary is shaped.

A useful explanation structure:

1. Start with the state variables. Explain which values are public and why they are safe to expose. In this app, the board message is intentionally public. That means the contract can be inspected by anyone and the UI can render the latest message without needing a private decryption path.
2. Explain ownership and authorization. A board update should not be a free-for-all unless the product intentionally wants public posting. The scaffold's ownership pattern is a simple way to show how state transitions can be limited.
3. Explain the sequence value. A sequence number gives clients a lightweight way to reason about state updates and caching. It also makes UI debugging easier because every successful update can be tied to a monotonic state change.
4. Explain what is not in the contract. This is the part many tutorials skip. Do not store metadata, UI labels, backend health information, or deployment hints in the contract just because the UI needs them. Those values belong in configuration or off-chain services.

That framing helps developers understand that privacy is partly a contract design issue and partly a systems design issue. Compact gives the app a private computation and state transition model, but the developer still has to decide which layer should own each piece of information.

For a second version of Private Signal Board, the contract could become more Midnight-specific by adding commitments. Instead of storing the public message directly, the app could store a commitment to a private report and separately publish an approved summary. That would make the public board useful while keeping sensitive source material private. It would also create a stronger tutorial path for nullifiers, commitments, and selective disclosure.

## 18. Deeper Metadata API Walkthrough

The metadata API is deliberately small, but it plays an important role in the tutorial. Many dApps accidentally blur the boundary between contract truth and application convenience. This project keeps the distinction visible.

The contract answers questions like:

- What is the current board state?
- Who is authorized to update it?
- What transition rules must be followed?

The metadata API answers questions like:

- What app is this?
- Which network is the UI targeting?
- Where is the proof server expected to run?
- What explanation should the UI show for this contract?

Those questions are not the same. If the metadata API is down, the contract still exists. If the contract state changes, the metadata API should not pretend otherwise. By separating those responsibilities, the app becomes easier to audit.

The service uses simple HTTP endpoints rather than a database-backed Express application. That was a deliberate choice for a tutorial. A bigger app could store metadata in Postgres, SQLite, or a CMS, but this bounty is about showing the Midnight lifecycle. The smallest useful backend keeps the focus on the contract, witness layer, proof server, and browser flow.

The `GET /health` endpoint is useful for local development and CI-style checks. The `GET /campaign` endpoint is useful for the UI because it returns one structured object with the app title, network, proof server, privacy model, and contract list. The contract-specific route gives a future developer a natural place to add documentation per contract.

If you expand this service later, good next endpoints would be:

- `GET /docs`: links to tutorial pages and network references.
- `GET /status`: richer health information for the proof server, indexer, and API.
- `GET /contracts`: a list of supported contract surfaces.
- `GET /releases`: deployed versions and contract addresses.

The important rule is that those endpoints should explain the app, not secretly replace the contract.

## 19. Testing Strategy

The project uses several layers of verification because a full-stack dApp can fail in several different ways.

Contract verification checks that the Compact code compiles and the generated TypeScript remains usable. This is the most important build step. If the contract does not compile, nothing else matters for the bounty.

API verification checks that the TypeScript packages around the generated contract remain valid. This catches dependency drift and typing problems before they reach the browser.

Metadata API verification checks that the off-chain service behaves predictably. The tests cover the health endpoint, campaign endpoint, known contract endpoint, and unknown contract behavior.

UI verification checks that the React package typechecks, lints, tests, and builds. The production build also revealed the upstream `isomorphic-ws/browser.js` warning. Since the build succeeds and the warning comes from an upstream Midnight dependency, the project documents it rather than hiding it.

The commands I used locally were:

```bash
cd contract
npm run ci
```

```bash
cd api
npm run ci
```

```bash
npm run typecheck -w metadata-api
npm run build -w metadata-api
npm run test -w metadata-api
```

```bash
cd bboard-cli
npm run ci
```

```bash
cd bboard-ui
npm run ci
npm run build
```

The GitHub Actions workflow runs those checks again on push. That matters because the repository is not just a code dump; it compiles under automation.

## 20. Reviewer Mental Model

The strongest way to understand this project is not "I made a bulletin board." A bulletin board by itself is not novel. The stronger framing is:

"I built a small but complete Midnight dApp that shows how to separate public contract state, private witness/proof inputs, browser interaction, and off-chain metadata."

That sentence is closer to what a reviewer is likely to care about. It connects the code to Midnight's reason for existing. It also distinguishes the project from generic React tutorials.

The full lifecycle is the point:

- Start from the product idea.
- Show the contract boundary.
- Show how the witness layer fits.
- Compile the Compact contract.
- Run the proof server.
- Run the metadata backend.
- Run the React UI.
- Connect the wallet.
- Read state in the browser.
- Explain what is public, private, and off-chain.

That order turns the article from a list of files into a working developer story.

## 21. Reference Links

- Bounty issue: https://github.com/midnightntwrk/contributor-hub/issues/314
- Repository: https://github.com/marmar9615-cloud/midnight-private-signal
- Midnight contributor hub terms: https://github.com/midnightntwrk/contributor-hub/blob/main/legal/BOUNTY_TERMS.md
