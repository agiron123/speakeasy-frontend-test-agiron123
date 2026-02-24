# Quickstart

## Setup

```bash
pnpm install
```

## Run

```bash
pnpm dev
```

---

# Development Process

AI assistance was used in the development of this component—in fact, most of the code here was written by AI.

To implement this assignment, I used the following workflow:

1. **Enter Plan mode in Cursor** — Ask Cursor to create a plan from the Product Requirements document and generate `PRD.md` and `ISSUES.md`.
2. Once the issues and PRD looked good, I asked Cursor to start building and tackle the issues one by one, submitting a GitHub pull request for each issue. I also asked the agent to keep pull requests small for easier review.
3. This got me about 80% of the way there; as we all know, the last 20% is usually the hardest.
4. I reviewed the code, noticed a few UX improvements, and asked the agent to implement them.
5. I edited the occasional line of code when it was quicker to do so by hand, but most of this workflow was entirely agent-driven.

I'm honestly not sure what interviewers want to see here, but I decided to focus on learning more about my AI tooling workflow and have fun with the assignment.

---

# Production Considerations

To get this component ready for production, a few things should be addressed:

- **Data fetching**
  - In production, we won't be able to load all data on the client. We'll need to query the backend for log items.
  - Since there are likely many log items, data should be paginated for easier access and to reduce server load.
  - Facets may also need to be fetched from the server.

- **Debouncing**
  - Typeahead search is convenient, but without debouncing it can generate many requests to the server.

There are surely other considerations before going live, but these stand out as particularly important.
