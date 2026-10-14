# Auth email templates

Source for the two emails the site sends: `confirmation.html` (new user) and `magic_link.html` (existing user).
They are applied to the hosted project, not read from this repo at runtime.

**Do not run `supabase config push` with this repo's `supabase/config.toml`.** It declares a local `site_url` and
disables Google, so a push would break production sign-in. Apply only the templates from a separate directory whose
`supabase/config.toml` declares nothing but these two blocks (undeclared hosted settings are then left unchanged):

```toml
project_id = "shippabel-mail-templates"

[auth.email.template.confirmation]
subject = "Confirm your Shippabel account"
content_path = "./supabase/templates/confirmation.html"

[auth.email.template.magic_link]
subject = "Your Shippabel login link"
content_path = "./supabase/templates/magic_link.html"
```

Run `supabase config diff --project-ref fpqjxkilatlcihunfxpb --workdir <that dir>` first and check that only these keys
are marked as declared, then `supabase config push` with the same flags.
