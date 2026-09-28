'use strict';
// Export only browser runtime files; native projects, reports and credentials stay local.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '.local', 'web-dist');
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
for (const file of ['index.html', 'style.css', 'manifest.json', 'sw.js']) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
for (const [directory, extension] of [['js', '.js'], ['icons', '.png']]) {
  fs.mkdirSync(path.join(out, directory), {recursive: true});
  for (const file of fs.readdirSync(path.join(root, directory))) {
    if (file.endsWith(extension)) fs.copyFileSync(path.join(root, directory, file), path.join(out, directory, file));
  }
}
console.log('Static web export: ' + out);
