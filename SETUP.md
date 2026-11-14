# Qadam SAT website: one-time setup

The site is plain files (no build step). Students sign in with Google or email; each student's progress is saved in Firebase; the teacher's Google account sees the Class dashboard.

## 1. Firebase (free "Spark" plan)
1. Go to https://console.firebase.google.com and click **Create a project**. Name it `qadam-sat`. Google Analytics can be off.
2. **Build > Authentication > Get started**. Under *Sign-in method*, enable **Google** (pick your support email) and **Email/Password**.
3. **Build > Firestore Database > Create database**. Choose a location (for Tashkent, `eur3 (europe-west)` is a good choice) and **production mode**.
4. In Firestore, open the **Rules** tab, replace everything with the contents of `firestore.rules`, put the teacher's Google email in place of `teacher-email@gmail.com` (lower case), and click **Publish**. The teacher is whoever these rules allow to read all students, so the email never appears in the website's code.
5. Click the gear icon > **Project settings** > *Your apps* > the **Web** icon (`</>`). Register an app called `Qadam` (no Firebase Hosting needed). Copy the `firebaseConfig` values into `config.js`,.
6. **Authentication > Settings > Authorized domains > Add domain**: add the site's address, e.g. `said26998.github.io`.

## 2. Hosting on GitHub Pages
1. Put these files in a **public** GitHub repository (Pages on a private repo needs a paid plan).
2. Repository **Settings > Pages**: Source = *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site appears at `https://<username>.github.io/<repo>/` within a minute or two.

## 3. Students
- Send them the link (or a QR code). They tap **Continue with Google**, or create an account with their name, email and a password.
- On a phone: Chrome menu **Add to Home screen** / **Install app**; iPhone Safari **Share > Add to Home Screen**. It then opens full screen like an app, and works offline (progress syncs when back online).

## Notes
- None of the values in `config.js` are secret; access is controlled by `firestore.rules`.
- Students can only read and write their own progress. Only the teacher email in the rules can read everyone's.
- To change questions, edit `content.js` in the source folder and run `python3 build.py`, then upload the new `site/index.html`.
- The free plan easily covers a class: 50,000 reads and 20,000 writes a day.
