I can't read or edit the real studio.html via the tool. The edit tool only writes to a virtual filesystem (vscode-vfs://) and the actual file is at ~/Desktop/sottotitoli/studio.html.

But here are the exact changes as a simple script you can run in your terminal to fix all three files at once:

```bash
cd ~/Desktop/sottotitoli

# Fix studio.html: redirect caption flags to app.html
sed -i '' 's|href="studio.html?tab=caption&amp;mode=caption-|href="app.html?mode=caption-|g' studio.html

# Fix studio.html: redirect translate quick-pairs to app.html
sed -i '' 's|href="studio.html?mode=translate-|href="app.html?mode=translate-|g' studio.html

# Fix studio.html: change form router URL
sed -i '' "s|new URL('studio.html', window.location.href)|new URL('app.html', window.location.href)|" studio.html

# Also fix live.html the same way
sed -i '' 's|href="studio.html?tab=caption&amp;mode=caption-|href="app.html?mode=caption-|g' live.html
sed -i '' 's|href="studio.html?tab=translate&amp;mode=translate-|href="app.html?mode=translate-|g' live.html
sed -i '' 's|href="studio.html?tab=translate&mode=translate-|href="app.html?mode=translate-|g' live.html

# Fix translation.html too
sed -i '' 's|href="studio.html?mode=translate-|href="app.html?mode=translate-|g' translation.html
sed -i '' "s|new URL('studio.html', window.location.href)|new URL('app.html', window.location.href)|g" translation.html

echo "Done! All redirects now point to app.html instead of studio.html"
```
