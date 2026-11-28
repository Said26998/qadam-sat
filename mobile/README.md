# Qadam SAT mobile app

A thin Android (and iOS) shell made with [Capacitor](https://capacitorjs.com). It opens the live site,
https://said26998.github.io/qadam-sat/, so **every change merged to `main` reaches the app right away**.
You only build a new app when this `mobile/` folder changes.

- Sign-in: email or username and password. Google blocks its sign-in page inside apps, so the app hides
  "Continue with Google". Google users open the website once, go to **My stats > Set a password for the app**,
  then sign in to the app with their Gmail address and that password (same account, same progress).
- Android back button: closes a sheet, then the lesson, then the open topic, then goes to Learn, then leaves the app.
- No internet on first launch shows `www/offline.html` with a Try again button. After that the site's offline cache works.

## Getting the Android app (no Play Store needed)

The **Android app** GitHub Action builds the APK on every change to `mobile/` and publishes it as a release:

- Download link for students: https://github.com/Said26998/qadam-sat/releases/latest/download/qadam-sat.apk
- The site's "Get the Qadam app" card and **My stats > Get the Qadam app** point there.
- To rebuild by hand: repository **Actions > Android app > Run workflow**.

## Signing key (do this once, before giving the APK to students)

Android only installs an update over an existing app if both are signed with the same key. Without the secrets below
the build is signed with a throwaway test key, so every rebuild would need students to uninstall first.

A key was generated for you and saved in the project files at `apps/qadam-sat/private/android-signing/`
(never put it in the repository). In GitHub: **Settings > Secrets and variables > Actions > New repository secret**:

| Name | Value |
| --- | --- |
| `QADAM_KEYSTORE_BASE64` | the whole contents of `qadam-upload.jks.base64.txt` |
| `QADAM_KEYSTORE_PASSWORD` | the contents of `password.txt` |

Then run the workflow again. Keep `qadam-upload.jks` and its password somewhere safe (for example a password manager).

## Google Play (optional)

1. Create a Google Play developer account (one-time 25 USD) at https://play.google.com/console.
2. Create an app named "Qadam SAT", fill in the store listing, content rating and privacy policy (the app stores the
   student's name, email and practice progress in Firebase).
3. Upload `qadam-sat-play-store.aab` from the workflow run's artifacts (it is built once the signing secrets exist).
   Let Google manage the app signing key; the key above is your upload key.
4. New personal developer accounts must run a closed test with at least 12 testers for 14 days before going public,
   which a class of students covers.

## iPhone

There are two ways to put Qadam on an iPhone.

**1. Home-screen app (free, works today).** Safari > Share > **Add to Home Screen**. It opens full screen like an app.
The site's "Get the Qadam app" sheet shows students these steps.

**2. Real iPhone app via TestFlight or the App Store (needs an Apple Developer account, 99 USD per year).**
No Mac is needed: the **iOS app** GitHub Action builds on GitHub's Macs. It always checks that the app compiles; once the
secrets below exist, every change to `mobile/` on `main` (or **Actions > iOS app > Run workflow**) signs the app and uploads it to TestFlight.

One-time setup:
1. Enroll at https://developer.apple.com/programs/ (individual is fine; approval can take 1 to 2 days).
2. https://developer.apple.com/account/resources/identifiers: **+ > App IDs > App**, Bundle ID (explicit)
   `io.github.said26998.qadamsat`, description "Qadam SAT".
3. https://appstoreconnect.apple.com > **Apps > + > New App**: iOS, name "Qadam SAT", that bundle ID, SKU `qadam-sat`.
4. App Store Connect > **Users and Access > Integrations > App Store Connect API > Team Keys > +**: name "GitHub",
   access **Admin** (needed so the build can create its own signing certificate). Download the `.p8` file (only once!),
   and note the **Key ID** and the **Issuer ID** shown above the list.
5. Your **Team ID**: https://developer.apple.com/account > Membership details.
6. GitHub repository **Settings > Secrets and variables > Actions**, add:

| Name | Value |
| --- | --- |
| `APPLE_TEAM_ID` | Team ID, e.g. `AB12CD34EF` |
| `ASC_KEY_ID` | the key's Key ID |
| `ASC_ISSUER_ID` | the Issuer ID |
| `ASC_KEY_P8_BASE64` | the `.p8` file as base64 (Mac: `base64 -i AuthKey_XXXX.p8 \| pbcopy`; Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_XXXX.p8")) \| Set-Clipboard`) |

7. Run **Actions > iOS app > Run workflow**. After 10 to 30 minutes the build shows in App Store Connect > **TestFlight**.

Giving it to students:
- **TestFlight (recommended to start):** TestFlight > **External Testing > +** a group "Students", add the build, fill in
  the test info, and turn on **Public Link**. The first build gets a short Apple beta review (about a day). Students install
  Apple's free **TestFlight** app, open your link, and tap Install. Up to 10,000 testers; each build lasts 90 days, and
  any new build (any run of the workflow) renews it.
- **App Store:** in App Store Connect add screenshots, a description, a privacy policy URL and the privacy answers
  (name, email, practice progress, linked to the user, not used for tracking), choose the build and **Submit for Review**.
  Apple sometimes rejects apps that mostly show a website (guideline 4.2). If that happens, TestFlight and the home-screen
  app still work, and I can add more native features before resubmitting.

## Working on the shell

```
cd mobile
npm ci
npx cap sync          # after changing capacitor.config.json or plugins
npm run icons         # after changing assets/*.png
npx cap open android  # needs Android Studio
```
