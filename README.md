# Sakhi Samachar — menstrual health diary

A diary app for Android, iPhone and the web. Each member signs in with her **Google account**, and her diary is saved in a **"Sakhi Samachar" folder in her own Google Drive**. She can see and download it there at any time. It syncs to every phone she signs in on and works offline. **The developer never receives anyone's diary**, and there is no server or database to run.

**Terminology: FIGO AUB System 1 only.** Source: Munro MG, Critchley HOD, Fraser IS; FIGO Menstrual Disorders Committee. *Int J Gynecol Obstet* 2018;143:393–408.

## What a member records

**Each day** (all optional):

| Field | Options | Shown when |
|---|---|---|
| Bleeding | None, Menses, Intermenstrual bleeding, Unscheduled bleeding | Unscheduled bleeding only if she is on progestin ± estrogen |
| Flow volume (patient determined) | Light, Normal, Heavy | Menses days |
| HMB button | On / off: tap if the bleeding is excessive and interferes with physical, social, emotional and/or material quality of life (NICE definition adopted by FIGO). Turning it on sets volume to Heavy. | Menses days |
| Sanitary products | Counts for the products she uses: pads/napkins, tampons, menstrual cup (times emptied), cloth, period underwear. Raw counts, no score. | Bleeding days |
| Clots passed | Count (raw, no size grading) | Bleeding days |
| Note | Free text, optional | Always |

**Settings** (optional):
- Sanitary products she uses (also chosen on the day screen and remembered).
- Year of birth: used only for FIGO's age-specific regularity limit (18–25 y ≤9 days; 26–41 y ≤7 days; 42–45 y ≤9 days).
- On progestin ± estrogen (yes/no).

## FIGO AUB System 1 summary (Insights tab, preceding 6 months)

| Parameter | FIGO categories | How it is derived |
|---|---|---|
| Frequency | Absent (amenorrhea) · Infrequent >38 d · Normal ≥24 to ≤38 d · Frequent <24 d | Onset of one menses to onset of the next. Amenorrhea is never auto-ticked because FIGO gives no duration. |
| Duration | Normal ≤8 d · Prolonged >8 d | Each completed menses |
| Regularity | Regular ≤7–9 d · Irregular ≥8–10 d | Shortest to longest cycle, with ≥2 cycles. Age-specific when year of birth is given. |
| Flow volume | Light · Normal · Heavy | Member's own daily choice. Heavy counts as HMB only if quality of life is affected. |
| Intermenstrual bleeding | None · Random · Cyclic (early/mid/late) | Reported as None or Present, with cycle days. Random versus cyclic is left to the clinician (no numeric FIGO rule). |
| Unscheduled bleeding on progestin ± estrogen | Not applicable · None · Present | Settings plus days marked unscheduled |

**App rules that are not FIGO definitions** (each is labelled in the app):
- Menses days with one unrecorded day between them count as one menses.
- The summary covers a 6-month window.
- Age = this year minus year of birth.

The app does not predict future menses.

**Not used** (not in the recommendation): PBAC, clot size, flooding, spotting, pain, ovulation or fertile window, and the abandoned terms (menorrhagia, metrorrhagia, oligomenorrhea, DUB).

All logic is in `src/lib/cycle.ts`, tested by `scripts/test-cycle.ts`.

## Look and feel

- **Colours:** rose (#A63D66) and plum on a blush ground, with a plum night theme.
- **Font:** Inter throughout, with bold for headings and the app name, and no all-capital labels. Inter is the closest open-licence match to Aptos, which can't be embedded in a store app without a paid app licence.
- **Haptics (`expo-haptics`):** selection ticks on options, a light impact on buttons and counters, and a success pulse for "Menses started today" and HMB on.

## Where the data lives

```
Member's phone / browser ──(Google sign-in)──► her own Google Drive
                                               My Drive / Sakhi Samachar /
                                                 Sakhi Samachar diary.json   (the app reads and writes this)
                                                 Sakhi Samachar diary.csv    (same entries as a table; opens in Sheets)
```

- **Permission:** Google's `drive.file`, classed by Google as *non-sensitive*. The app can only see files it created, never the rest of her Drive.
- **Sync:** each phone keeps a working copy, merges day by day with the Drive copy (most recent change wins, deletions included) and writes it back.
- **Accidental deletion:** if she deletes the files in Drive, the app saves them again from the phone copy. Deleting the files *and* signing out everywhere loses the diary; Drive's Bin keeps deleted files for 30 days.
- **Delete my diary and disconnect** (Settings): permanently deletes the folder, the phone copy and the app's access.

## Project layout

```
src/app/                 screens (Expo Router)
  _layout.tsx            fonts, theme, signed-in / signed-out routing
  welcome.tsx            Continue with Google + consent
  (tabs)/index.tsx       status card, reconnect notice, calendar
  (tabs)/insights.tsx    FIGO AUB System 1 summary, menses list, IMB
  (tabs)/settings.tsx    Google account, Drive folder, year of birth, gonadal steroids, export, delete
  day/[date].tsx         record one day
src/lib/cycle.ts         FIGO System 1 logic                 (npm test)
src/lib/drive.ts         Google Drive folder, files and merge (npm run test:drive)
src/lib/data.tsx         offline-first storage and sync
src/lib/google.ts        Google sign-in on Android / iPhone (native)
src/lib/google.web.ts    Google sign-in on the web link (Google Identity Services)
src/lib/demo.ts          demo mode with sample data (EXPO_PUBLIC_DEMO=1)
src/components/UpdateBanner.tsx   "new version" notice for the Android app file
public/                  web manifest, home-screen icons, version.json
docs/privacy-policy.html privacy policy (fill in the [BRACKETS]); published as /privacy.html
.github/workflows/web.yml         checks the code and publishes the web app on every push
.github/workflows/android-apk.yml builds the Android app file and attaches it to a Release
```

## Try it without any setup

```bash
npm install
EXPO_PUBLIC_DEMO=1 npx expo start --web     # sample data only, nothing is sent anywhere
```

---

# Going live for free — step by step

You need a Google account for yourself (use a separate one for the app, e.g. sakhisamachar.app@gmail.com) and a GitHub account (you already have `drnvskrishnareddy`). **Total cost: ₹0. Your time: about 1–1½ hours.**

## Step 1 — Google Cloud: let members sign in and use Drive (about 30 minutes)

All free; skip any billing prompt.

1. **Create a project.** Open console.cloud.google.com/projectcreate, name it `Sakhi Samachar`, then **Create**. Make sure the project picker at the top shows it.
2. **Turn on Google Drive.** Menu → **APIs & Services → Library**, search "Google Drive API", then **Enable**.
3. **Consent screen (what members see when they sign in).** Menu → **Google Auth Platform** (also called *OAuth consent screen*) → **Get started**:
   - App name `Sakhi Samachar`; user support email: the app's Gmail.
   - Audience: **External**.
   - Contact email: the app's Gmail. Agree to the policy, then **Create**.
4. **Branding.**
   - Fill in:
     - Application home page `https://<your-username>.github.io/sakhi-samachar/`
     - Privacy policy `https://<your-username>.github.io/sakhi-samachar/privacy.html`
     - Authorized domain `<your-username>.github.io`
   - Leave the **logo empty** for now: adding a logo makes Google review the branding first, which takes a few days.
   - If Google won't accept the `github.io` domain, leave the home-page, privacy and domain fields empty. They are only needed when you ask Google to verify the app, which these permissions don't require.
5. **Data access.**
   - Click **Add or remove scopes** and tick:
     - `openid`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `.../auth/drive.file`
   - Then **Update** and **Save**. All four are non-sensitive, so no Google verification and no 100-user limit.
6. **Publish.** **Audience → Publish app → Confirm** (status becomes *In production*).
   - While the app is still in *Testing*, only the test users you add can sign in, and their sign-in expires every 7 days. So publish.
7. **Web sign-in ID.** **Clients → Create client → Web application**, name `Sakhi Samachar web`. Under **Authorized JavaScript origins** add:
   - `https://<your-username>.github.io` (no path, no trailing slash)
   - `http://localhost:8081` (for testing on your computer)

   Then **Create** and copy the **Client ID** (ends in `.apps.googleusercontent.com`). It is not a secret. There is no client secret to keep.

## Step 2 — Privacy policy (10 minutes)

Open `docs/privacy-policy.html` and replace every `[BRACKET]`: date, your name, city, contact email. It is published automatically with the app at `https://<your-username>.github.io/sakhi-samachar/privacy.html`.

## Step 3 — GitHub: publish the app (about 20 minutes)

1. On github.com, **New repository** named `sakhi-samachar`, **Public**, then **Create**.
2. Upload this folder. Either:
   - drag the files into the GitHub page (**Add file → Upload files**), skipping `node_modules`; or
   - from a terminal:
     ```bash
     cd sakhi-samachar
     git init && git add . && git commit -m "Sakhi Samachar"
     git branch -M main
     git remote add origin https://github.com/<your-username>/sakhi-samachar.git
     git push -u origin main
     ```
3. Repo **Settings → Pages → Source: GitHub Actions**.
4. Repo **Settings → Secrets and variables → Actions → Variables tab → New repository variable**: name `GOOGLE_WEB_CLIENT_ID`, value the Client ID from Step 1.7.
5. **Actions** tab → *Publish web app* → **Run workflow** (later it runs by itself on every push).
   - It checks the code (lint, types, FIGO tests, Drive tests) and publishes in about 3–5 minutes.
   - The app is then live at **`https://<your-username>.github.io/sakhi-samachar/`**.

## Step 4 — Test it yourself (15 minutes)

1. Open the link on your phone.
2. Tick the agreement, then **Continue with Google**. Choose your account and **allow** "See, edit, create and delete only the specific Google Drive files you use with this app".
3. Record two or three days.
4. Open Google Drive. You should see the folder **Sakhi Samachar** with `Sakhi Samachar diary.json` and `.csv`.
5. Open the link on a second phone or computer, sign in with the same account, and check the same days appear.
6. In Settings, try **Open folder in Google Drive** and **Export diary**.

## Step 5 — Share with members

Send this message (WhatsApp or email):

> Sakhi Samachar — menstrual health diary. Open https://&lt;your-username&gt;.github.io/sakhi-samachar/
> • iPhone: Safari → Share → **Add to Home Screen**
> • Android: Chrome → ⋮ → **Install app** / **Add to Home screen**
> Then tap **Continue with Google**. Your diary is saved only in your own Google Drive.

- **On the web link**, Google asks members to confirm about once an hour of use. The app shows a **Reconnect** button, and entries are kept on the phone until they tap it.
- **The Android app file** (Step 6) stays connected without asking.

## Step 6 (optional) — Android app file, no Play Store

1. On your computer, once:
   ```bash
   npm install
   npx eas-cli@latest login          # free Expo account
   npx eas-cli@latest init           # adds the project ID to app.json; commit and push it
   npx eas-cli@latest credentials -p android   # choose "preview", let Expo create a keystore, note its SHA-1
   ```
2. **Google Cloud → Clients → Create client → Android**:
   - package `com.drnvskrishnareddy.sakhisamachar`
   - SHA-1 from the step above
3. On **expo.dev → your project → Environment variables**, environment **preview**, add:
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the **web** client ID from Step 1.7)
   - `EXPO_PUBLIC_PRIVACY_URL`
   - `EXPO_PUBLIC_UPDATE_URL` (`https://<your-username>.github.io/sakhi-samachar/version.json`)
4. **expo.dev → Account settings → Access tokens → Create**. In GitHub, add it as **secret** `EXPO_TOKEN` (Settings → Secrets and variables → Actions → Secrets).
5. GitHub **Actions → Release Android app → Run workflow**. Expo's free queue takes 15–90+ minutes.
6. Members install from `https://github.com/<your-username>/sakhi-samachar/releases/latest/download/sakhi-samachar.apk`. They allow "Install unknown apps" once; if Play Protect warns, they tap "Install anyway".

## Step 7 — Sending updates

- **Web link:** change the code and push to `main`. Everyone gets it the next time they open the app.
- **Android app file:**
  1. Raise `version` in `app.json` (e.g. 1.0.1) and run *Release Android app*.
  2. Edit `public/version.json` to `{"version":"1.0.1","android_url":"https://github.com/<you>/sakhi-samachar/releases/latest/download/sakhi-samachar.apk","message":"What changed"}` and push.
  3. Older apps show a **Download update** notice. Diaries are untouched; they live in each member's Drive.

---

# Later: Google Play and the App Store (paid)

- **App ID:** `com.drnvskrishnareddy.sakhisamachar` (Android and iOS). It **cannot be changed after the first upload**.
- **Builds (cloud, no Mac):**
  ```bash
  npx eas-cli@latest build --platform android --profile production
  npx eas-cli@latest submit --platform android
  ```
  Add the production environment variables on expo.dev first.
- **Google Play (US$25 once):**
  - New personal accounts must run a closed test with **12 testers for 14 consecutive days**.
  - Play re-signs the app, so add a second **Android** client in Google Cloud with the **App signing key SHA-1** from Play Console → Test and release → App integrity.
  - **App content:**
    - Health apps declaration: **Period Tracking**.
    - Data safety: the diary is stored in the user's own Google Drive and is not sent to the developer. Declare health info and email as processed for app functionality, not shared, encrypted in transit, deletable in-app.
    - Target audience 18+; no ads.
- **Apple App Store (US$99/year):**
  1. Create an **iOS** OAuth client (bundle ID `com.drnvskrishnareddy.sakhisamachar`).
  2. Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `GOOGLE_IOS_URL_SCHEME` (the client's "iOS URL scheme") for the build.
  3. **Uncertain:** Apple usually requires "Sign in with Apple" whenever Google sign-in is offered (guideline 4.8). There is an exception for apps that sign in only to reach the user's own content in that service. Explain in the review notes that Google sign-in is used only to save the diary in the user's own Google Drive; this may still be rejected.
  4. Possible rejection under 5.1.1(ix) for health apps from individual accounts.
- **Before a store release:** consider replacing the text-only "Continue with Google" button with Google's official sign-in button artwork, following Google's branding guidelines.

---

**Sakhi Samachar is a diary, not medical advice. Not validated for contraceptive advice.** It describes symptoms in FIGO AUB System 1 terms and does not diagnose AUB or its causes.

**Reference**

- Munro MG, Critchley HOD, Fraser IS; FIGO Menstrual Disorders Committee. The two FIGO systems for normal and abnormal uterine bleeding symptoms and classification of causes of abnormal uterine bleeding in the reproductive years: 2018 revisions. *Int J Gynecol Obstet* 2018;143:393–408.
