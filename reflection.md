<!--
  DRAFT written by Claude from the session history, in first person, for me to review and edit.
  Check every point matches my own experience and rewrite it in my own words before submitting.
  Remove this comment when done.
-->

# Reflection

## 1. How did you break down the problem before prompting?

I split the project into what the app must do and how I wanted it built, and put both in the first prompt ([prompt.md](prompt.md)):

- **Functional scope:** the three core requirements (add/edit/delete, mark complete, persistence). I kept the list short so the AI wouldn't pad it with features I hadn't asked for.
- **Tech stack:** I proposed React, Node.js and SQLite, but asked for advice instead of locking it in. The AI recommended TypeScript, Vite, Express 5 and `better-sqlite3`, and I picked from those options.
- **Security:** I asked for shift-left security, and a human-in-the-loop rule: tell me before anything sensitive is pushed to GitHub.
- **Testing:** useful tests only, not redundant ones, written red-green-refactor.
- **Design:** instead of describing the look, I attached a Notion screenshot as the reference and said I didn't want a generic "AI slop" UI.
- **Process:** build iteratively in stages and ask me when unsure, instead of generating everything in one shot.

During the build I kept making decisions at each checkpoint:

- **Backend and scope:** Express 5, TypeScript, single user with no login.
- **Task fields:** due date, notes and priority.
- **Extra features:** filters, overdue highlighting, keyboard editing and drag-to-reorder.
- **UI:** a light/dark toggle, and a sidebar with the filter behind a small icon.

Each stage (scaffold → API → UI shell → interactions → security) ended with a commit, so I could review it before the next one began.

## 2. What did the AI get wrong, and how did you fix it?

- **Dev mode was completely broken, and the tests didn't catch it.**
  - The Stage 5 CSRF protection compared the request's `Origin` and `Host` headers, but Vite's dev proxy rewrites `Host`. Every add, edit and delete in `npm run dev` was rejected as "cross-site".
  - All the unit tests passed because they never went through the proxy.
  - I only found it when I asked the AI to test the running app for bugs. The fix was one line of proxy config, plus an integration test that starts the real Vite server in front of the real API, so this setup is now tested.
- **Smaller bugs from the same testing round:**
  - The "Created" date showed the previous day in Singapore because it used the UTC date.
  - A "ghost" side panel reappeared after changing the filter.
  - A failed save wiped the task title I had typed.
  - Keyboard focus was lost after deleting.
  - Clicking the sidebar reloaded the page.

  Each one got a failing regression test first, then the fix.
- **It said something that wasn't true.** After I had merged PR #2, it pushed the bug fixes to the same branch and told me they were "on the PR". I couldn't find them, said so, and it checked and admitted the PR was already merged. It then opened a new PR (#3) with only the fixes.
- **The design skill I asked for wasn't available.** The `frontend-design` skill I mentioned wasn't installed in the cloud session. The AI told me at the start and built the design by hand from the Notion screenshot, checking it with real browser screenshots. It caught layout problems that way (hover buttons pushing content sideways, a shadow leaking on mobile, a delete button squeezed out on phones).
- **It added things I didn't need.**
  - Hourly PR check-ins would have kept using my credits, so I told it to stop and unsubscribe from everything.
  - It added Dependabot, which I removed because this small project doesn't need it (`npm audit` in CI already covers vulnerable dependencies).

## 3. What did you deliberately not delegate to AI, and why?

- **Product and design decisions.** The stack, the feature scope, the "no login" decision, what deleting a list does, and the Notion reference were my calls. The AI offered options and recommendations, but I chose, so the app is what I actually wanted.
- **Anything touching GitHub access or sensitive data.** I made the human-in-the-loop rule for secrets part of the prompt. I connected GitHub and installed the GitHub App myself, instead of handing over credentials.
- **Merging.** The AI opened pull requests, but I reviewed and merged them myself (#2, #3). Merging decides what goes into `main`, so I wanted that to stay a human decision.
- **Cost control.** I decided how much ongoing work (PR monitoring, scheduled check-ins) was worth my credits, and turned it off.
- **Judging "done".** I didn't accept "all tests pass" as proof the app worked. I asked for a separate bug hunt on the running app, which is what exposed the dev-mode bug.

## 4. What would you do differently one more time?

- **Ask for end-to-end testing of the real app at every stage, not just unit tests.** The worst bug came in during Stage 5 and wasn't found until later, because only unit tests had run against that change.
- **Put all the requirements in the first prompt.** Adding multiple lists at the end meant a database migration and changing the API routes. Knowing about it earlier would have shaped the data model from day one. The same goes for things like my timezone (Singapore) and mobile support.
- **Set a budget and limits up front.** For example: "don't schedule background monitoring or add extra tooling without asking", so I don't have to undo it later.
- **Check the tooling before starting.** For example, confirm the `frontend-design` skill is installed in the environment the AI runs in, if I want it used.
- **Keep one branch per pull request.** Reusing the same branch after merging caused the "where is the PR?" confusion.
