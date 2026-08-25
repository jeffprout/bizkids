# Sending BizKids to playtesters

The game is a static web page. No server, no accounts, no database — so sharing
it is just hosting a folder and sending a link. Saves live in each tester's own
browser.

## Putting it online

Hosted on **Cloudflare Pages**. Its free tier permits commercial use and has no
bandwidth cap, which matters for district pilots. *(Not Vercel — its free tier
prohibits commercial use. Netlify is the fallback.)*

Everything is configured. From the `bizkids` folder:

```bash
npm run deploy
```

That builds the School Edition and pushes it with Wrangler. The first run opens a
browser to authorise your Cloudflare account and creates the project; it then
prints a URL like `https://bizkids.pages.dev`. That URL is what you send people.
Every later deploy is the same one command.

If you would rather it deploy on every push, put the repo on GitHub:

```bash
git remote add origin https://github.com/<you>/bizkids.git && git push -u origin master
```

then in the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect
to Git**, with build command `npm run build:school` and output directory `dist`.
Cache headers come from `public/_headers`, so there is nothing else to set.

**No-account alternative.** Run `npm run build` and drag the `dist` folder onto
https://app.netlify.com/drop. You get a link in about ten seconds. Fine for a
weekend of testing; use Cloudflare for a stable URL you can redeploy to.

## What testers need to know

Paste something like this along with the link:

> It's a web page — no download, no sign-in. Works on a computer, tablet or
> phone. Pick **Pro** unless the player is under about 10.
>
> A week takes a minute or two. Playing 5–10 weeks is plenty; you don't need to
> reach the end.
>
> Your progress saves automatically in your browser. Same device, same browser,
> and it'll be waiting for you.

## Getting their run back

Tell them to tap **💾 Save to file** on the opening screen and email you the
JSON. It contains their whole run — every week's decisions and results, their
badges and their final numbers — plus the build they played. You can load it
into your own copy with **📂 Load a file** and step through exactly what they
did.

That is far more useful than "it was fun", and it costs them one tap.

## What to actually ask

Open questions beat leading ones. Three that tend to pay off:

1. **Where did you get stuck or confused?** Anything they had to re-read.
2. **Was there a week where you didn't know what to do?** That points at a card
   that needs better information, not a balance problem.
3. **Did you ever lose money and not understand why?** The profit-to-cash bridge
   and the "what happened" line exist to answer that; if they still don't, the
   wording is wrong.

Worth watching for specifically:

- Do they ever change **spot**, or just leave it? It is asked every week now.
- Do they notice the forecast is unreliable, or do they trust it and get burned?
- Does anyone try the **treats**, or ignore that card?
- Do they understand why profit and the bank balance differ?

## Redeploying mid-test

Testers keep playing on whatever build their browser last loaded. Cache headers
are set so a reload picks up a new deploy immediately.

**One caveat worth knowing.** If a change alters the shape of a save, the app
bumps `SAVE_VERSION` and in-progress runs cannot be carried across — testers see
a note saying the game was updated and start a new run, keeping their trophies.
So if several people are mid-run, either hold non-urgent changes or warn them
first. Changes to numbers, wording, events and layout are all safe; only changes
to the save's structure force a reset.

Saves are also repaired on load: a missing or nonsense number is rebuilt rather
than allowed to spread through the arithmetic. That matters because a run that
is open *while* you deploy gets the new version stamped onto the old shape at its
next autosave, which no version check can catch.

## The build stamp

The opening screen shows a short build id at the bottom, and it is written into
every exported save. When someone reports something odd, that tells you which
version they were on.
