const fs = require('fs/promises');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'dist');
const runtimeEntries = ['index.html', 'css', 'data', 'js'];

async function copyRuntimeFiles() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const rootEntries = await fs.readdir(projectRoot, { withFileTypes: true });
  const rootModules = rootEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name);

  for (const entry of [...runtimeEntries, ...rootModules]) {
    await fs.cp(path.join(projectRoot, entry), path.join(outputDir, entry), {
      recursive: true
    });
  }

  console.log(`Cloudflare 静的アセットを ${path.relative(projectRoot, outputDir)}/ に生成しました。`);
}

copyRuntimeFiles().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
