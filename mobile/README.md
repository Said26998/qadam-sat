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

The simplest path is the website itself: Safari > Share > **Add to Home Screen** (the site's "Get the app" sheet shows
these steps). It opens full screen like an app. A real App Store app needs an Apple Developer account (99 USD per year)
and a Mac with Xcode: run `npm ci && npx cap sync ios`, open `ios/App/App.xcodeproj`, and archive. Apple may reject
apps that only show a website, so the home-screen app is the recommended route for now.

## Working on the shell

```
cd mobile
npm ci
npx cap sync          # after changing capacitor.config.json or plugins
npm run icons         # after changing assets/*.png
npx cap open android  # needs Android Studio
```
