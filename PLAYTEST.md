# Sending BizKids to playtesters

The game is a static web page. No server, no accounts, no database — so sharing
it is just hosting a folder and sending a link. Saves live in each tester's own
browser.

## Putting it online

Deployed from **GitHub to Vercel**: push a commit, Vercel builds and publishes it
automatically. `vercel.json` already sets the build command, output directory and
cache headers, so there is nothing to configure in the dashboard.

**One-time setup.** The repo is already on GitHub. In your browser:

1. Go to https://vercel.com/new and sign in **with GitHub**.
2. Pick the `bizkids` repository and press **Import**.
3. Leave every setting alone — `vercel.json` supplies them — and press **Deploy**.

A minute later you get a URL like `https://bizkids.vercel.app`. That is the link
you send people, and it stays the same forever.

**Every change after that** is just:

```bash
git add -A && git commit -m "what changed" && git push
```

Vercel rebuilds within a minute or two. Testers get the new version on their next
reload, because `vercel.json` marks the page itself `no-cache`.

**A licensing note for later, not now.** Vercel's free Hobby plan is for
non-commercial use. A private playtest is fine. Before the game is sold, or runs
a paid district pilot, that needs to become a paid Vercel plan or move to
Cloudflare Pages, whose free tier does permit commercial use. The spec
(Section 15) currently specifies Cloudflare for that reason — worth reconciling
before launch.

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
