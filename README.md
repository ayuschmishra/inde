# inde — GitHub Pages version

Static site. Visitor allows camera, photo is auto-taken once, they review and press Send. Photo uploads straight to **your Firebase Storage** bucket. No server to run.

## 1. Firebase setup (once)

1. Firebase console -> your project -> **Build -> Storage -> Get started** (if not already on).
2. **Project settings -> General -> Your apps -> Web app** -> copy the config object.
3. Paste it into `firebase-config.js`, replacing every `PASTE_...` value.

### Storage rules — lets the page write, nobody read

Firebase console -> Storage -> **Rules**. Paste, then Publish:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{file} {
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow read: if false;   // only you, via the Firebase console
    }
  }
}
```

## 2. Put it on GitHub Pages

```
# inside the inde-pages folder
git init
git add .
git commit -m "inde camera page"
git branch -M main
git remote add origin https://github.com/ayuschmishra/inde.git
git push -u origin main
```

Then: repo -> **Settings -> Pages -> Build from branch -> main / (root) -> Save**. Your link appears in a minute:

`https://ayuschmishra.github.io/inde/`

Send that link to the person.

## 3. See the photos

Firebase console -> **Storage -> photos/** folder. Each file has the sender's name and time in its metadata.

## Security note — read this

`allow write: if ...` above lets **anyone** who opens the page upload image files to your bucket. That is what makes a no-server page possible, but it also means a stranger could script uploads and run up storage/bandwidth cost. The rule caps each file at 5 MB and images only. For real protection add Firebase **App Check**, or keep the link private and delete the files after you collect them. `allow read: if false` means no one but you (through the console) can see the photos.
