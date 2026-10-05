=== Flexa FormFlow ===
Contributors: flexatech
Tags: forms, form builder, email builder, contact form, form entries
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Build forms, collect entries, and design the emails they trigger. Every field becomes data you can drop into a visual email with one click.

== Description ==

Flexa FormFlow joins two tools that usually live in separate plugins: a form builder and a visual email builder. A field you add to a form becomes a token you can drop into the notification email, so the message people receive matches the data they sent.

**Form builder**

Drag fields from the palette onto the canvas, reorder them, and edit each one in the inspector. Field types: text, email, paragraph, dropdown, radio, checkbox, number, date, and hidden. Every field carries a per-breakpoint width, so you can lay fields out in columns on desktop and let them stack on mobile without touching CSS.

Place a form with the `[flexa_formflow id="123"]` shortcode or the Flexa FormFlow block. Submissions are protected by a honeypot and a submit-time trap, so common spam bots never reach your inbox.

**Entries**

Every submission is stored. Browse them in a list with a quick peek panel, open the full detail view, and mark entries read or unread. Nothing is locked behind an external service.

**Visual email builder**

Design the notification email with a block editor: headings, text, buttons, images, dividers, spacers, columns, and a fields table that renders the whole submission. Insert form data visually with `{field:ID}` tokens and headers like `{form_title}`, no shortcode syntax to memorize. Save designs to a template library, set global styles once, preview in desktop and mobile widths, and send yourself a test before going live.

Each form can send an admin notification and an optional confirmation to the person who filled it in. When no custom design is chosen, a clean default layout is used.

**Delivery**

FormFlow does not send mail in any special way; it hands the finished message to WordPress with `wp_mail()`. Pair it with a delivery plugin such as Flexa MailBridge (or any SMTP plugin) for routing, logs, and tracking.

**Does not require WooCommerce.** FormFlow runs on any WordPress site.

**Source code and build tools**

The admin screens are a React app compiled with Vite. The compiled, minified files in `assets/dist/` are built from the human-readable source that ships in this plugin:

* `apps/admin/src/`: the React and TypeScript source (entry point `apps/admin/src/main.tsx`).
* `apps/admin/vite.config.ts` and `apps/admin/tsconfig.json`: the build and TypeScript config.
* `package.json` and `pnpm-lock.yaml` in the plugin root: the dependency list and exact versions.

The same source is also public on GitHub: https://github.com/flexatech/flexa-formflow

To rebuild the bundle you need Node.js 20+ and pnpm 9+. From the plugin folder (or a clone of the repository):

1. Run `pnpm install`.
2. Run `pnpm build`. The output goes to `assets/dist/`.

The frontend form script (`assets/frontend/form.js`) and the block editor script (`assets/blocks/form/editor.js`) are plain, unminified JavaScript with no build step. Third-party libraries bundled into `assets/dist/` (React, TanStack Query, dnd-kit, Radix UI, Zustand, Lucide icons, Tailwind CSS) are listed in the repository's `package.json` and their source is available from npm.

== Installation ==

1. Upload the `flexa-formflow` folder to `/wp-content/plugins/`, or install the zip from Plugins > Add New > Upload Plugin.
2. Activate the plugin through the Plugins screen.
3. Open Flexa FormFlow in the admin menu, create a form, and copy its shortcode.
4. Paste the shortcode into any post or page, or add the Flexa FormFlow block.

== External services ==

FormFlow stores your forms, entries, and templates in your own database and does not send them anywhere. Two optional features can send data off your site, described below. Neither is on by default.

**AI assistant (optional).** This only works after you add an AI provider API key in Settings, and a request is sent only when an admin clicks one of the AI tools in the builder. Nothing is sent automatically or on the front end. What each tool sends to the provider you selected:

* Generate a form: the form description you typed.
* Writing assistant (rewrite, shorten, change tone, subject ideas): the text you asked it to work on, the chosen tone, and your site name (so the copy can mention it).

Each request also carries your API key and the model name, which the provider needs to authenticate and answer. No visitor data, entries, or submitted field values are sent. You choose the provider:

* Anthropic (Claude): sent to `https://api.anthropic.com`. See the [Anthropic Commercial Terms](https://www.anthropic.com/legal/commercial-terms) and [Privacy Policy](https://www.anthropic.com/legal/privacy).
* OpenAI: sent to `https://api.openai.com`. See the [OpenAI Business Terms](https://openai.com/policies/business-terms/) and [Privacy Policy](https://openai.com/policies/privacy-policy/).
* Google Gemini: sent to `https://generativelanguage.googleapis.com`. See the [Gemini API Terms](https://ai.google.dev/gemini-api/terms) and [Google Privacy Policy](https://policies.google.com/privacy).

Your API key is stored encrypted and is never shown in the browser after you save it.

FormFlow calls these providers directly with `wp_remote_post()` instead of the WordPress AI Client (`wp_ai_client_prompt()`). The AI Client only exists in WordPress 7.0 and later, and FormFlow supports WordPress 6.5 and later, so a direct request is the only way to offer the same AI tools on every supported version. The request goes from your server straight to the provider you picked, using your own API key; there is no FormFlow server or proxy in between.

**Workflow webhooks (optional).** A workflow can include a "Send webhook" action. It only runs if you add it to a workflow yourself and enter a URL. Each time that workflow runs (for example, when a form is submitted), FormFlow sends a POST request to the URL you entered with the form ID, form title, entry ID, submission time, and the submitted field values as JSON. There is no fixed third-party service: the data goes only to the address you choose, and the terms and privacy policy of that endpoint apply. Local and private-network addresses are refused.

== Frequently Asked Questions ==

= Does it require WooCommerce? =

No. FormFlow works on any WordPress site.

= How do I add a form to a page? =

Create a form, then use its `[flexa_formflow id="123"]` shortcode, or add the Flexa FormFlow block in the editor.

= Does FormFlow send email through its own server? =

No. It builds the message and passes it to WordPress `wp_mail()`. Delivery follows whatever your site already uses. For SMTP, logs, and open tracking, add a delivery plugin such as Flexa MailBridge.

= Where are submissions stored? =

In your own database, in the plugin's tables. You can view, read, and delete entries from the Entries screen. Nothing is sent to a third party.

= What happens to my data when I uninstall? =

Nothing is removed unless you turn on "Delete data on uninstall" in Settings first. With it off, your forms, entries, and templates survive a reinstall.

= How is the admin interface built, and where is the source? =

The admin app is written in React and TypeScript and compiled to the files in `assets/dist/`. The unminified source ships with the plugin in `apps/admin/src/`, next to its build config, and is also public at https://github.com/flexatech/flexa-formflow. To build it yourself: install Node 20+ and pnpm 9+, run `pnpm install`, then `pnpm build`. The `README.md` in the repository has the full developer setup.

== Screenshots ==

1. The form builder: field palette, canvas, and the field inspector with responsive column widths.
2. The entries list with the quick peek panel open.
3. The visual email builder with the block layer list, live preview, and inspector.
4. Inserting a form field token into an email block.
5. Plugin settings.

== Changelog ==

= 1.1.0 =
* Pack restore: a pack's detail page now reports any of its installed items that were deleted and lets you put back only those, without losing the rest of the pack.
* Fixed: a pack could get stuck reporting "already installed" after any of its content was deleted, with no way to reinstall it.
* Fixed: resetting site data, or removing the plugin with "Delete data on uninstall" turned on, could leave packs marked as installed on an otherwise empty site.

= 1.0.0 =
* Form builder: drag-and-drop canvas, nine field types, per-field responsive column widths, required and placeholder options.
* Frontend rendering via shortcode and block, with honeypot and submit-time spam traps.
* Entries: storage, list with peek panel, detail view, read/unread status.
* Visual email builder: block-based editor, field tokens, a fields table, template library, global styles, desktop and mobile preview, and test send.
* Notification email to the admin and optional confirmation to the submitter, sent through `wp_mail()`.
* Settings and onboarding; optional delete-data-on-uninstall.
