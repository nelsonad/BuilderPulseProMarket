# Contributing to BuilderPulsePro

Thanks for contributing. This document describes project standards, coding style, and the review checklist used by the team.

## Guidelines

- Keep Program.cs minimal: DI, middleware, and endpoint mapping only. Endpoint handlers live in modular files under `Endpoints/`.
- Use Minimal APIs (no MVC controllers). Group endpoints logically by feature.
- Keep endpoints short and projection-only for EF Core queries where possible.
- Preserve privacy-first decisions (do not expose emails in API responses).
- Publish domain events from endpoints using the in-process event bus for side-effects (logging, email).

## Coding standards

- Follow the rules in `.editorconfig` (root of the repo). Key points:
  - UTF-8, LF line endings, 4-space indentation.
  - Max line length: 120 characters.
  - Prefer explicit types for local variables.
  - No enforced `this.` qualifier.
  - Interface names prefixed with `I`.
  - Private fields use `_camelCase`.

- Keep files small and focused. One endpoint group per file (e.g., `JobsEndpoints.cs`).
- Favor projection-only EF Core queries (select anonymous or DTO types) to keep translations clear and avoid client evaluation.

## Naming conventions

- Types, methods, properties: PascalCase.
- Parameters and locals: camelCase.
- Private fields: `_camelCase`.
- DTO/contract records: PascalCase and placed in `Contracts/`.

## Tests

- Add unit tests for non-DB logic.
- For EF-heavy flows, prefer integration tests using a disposable Postgres instance or test container.

## Pull Request checklist

- [ ] Branch from `main` with descriptive name.
- [ ] Include a short PR description and motivation.
- [ ] Ensure code builds and unit tests pass.
- [ ] Run `dotnet format` or rely on IDE settings per `.editorconfig`.
- [ ] Add/update contract types in `Contracts/` for any new request/response shapes.
- [ ] Update event handlers or email triggers when domain events change.

## Adding or modifying endpoints

- Add routes to the appropriate `Endpoints/*.cs` file following existing patterns.
- Keep authorization attributes explicit on route mappings (`RequireAuthorization()` when needed).
- Retrieve the calling user's id with `CurrentUser.GetUserId(ClaimsPrincipal)`.
- Use `AsNoTracking()` for read-only queries returned to clients.
- When adding EF Core queries that use spatial features, ensure `UseNetTopologySuite()` is configured in `Program.cs`.

## Database and migrations

- Use EF Core migrations for schema changes.
- For PostGIS geometry/geometry types, set SRID to `4326` when creating `Point` values.

## Events and notifications

- Publish domain events for important actions (job posted, bid placed, bid accepted, job completed).
- Handlers should be registered via DI in `Program.cs` and implement `IEventHandler<T>`.
- Email sending is abstracted through `IEmailSender`.

## Communication

- For breaking changes, include migration notes in the PR description.
- Tag relevant reviewers and include screenshots/data when applicable.

---

These standards should help keep the codebase consistent and maintainable. If a new team-wide preference is agreed, update `.editorconfig` and this file accordingly.