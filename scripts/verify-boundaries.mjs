import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const fixtures = [
  {
    file: 'packages/domain/src/__boundary_violation__.ts',
    source: "import express from 'express';\n\nexport const leakedTransport = express;\n",
    expectedMessage: 'Domain code must not depend on API transport frameworks',
  },
  {
    file: 'apps/web/src/__boundary_violation__.ts',
    source: "import { createApp } from '../../api/src/app.js';\n\nexport const leakedApi = createApp;\n",
    expectedMessage: 'Web code may use @rtctp/domain public exports',
  },
  {
    file: 'apps/api/src/__boundary_violation__.ts',
    source: "import { App } from '../../web/src/App.js';\n\nexport const leakedView = App;\n",
    expectedMessage: 'API code may use @rtctp/domain public exports',
  },
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      resolve({ code, output: `${stdout}\n${stderr}` });
    });
  });
}

async function verifyFixture(fixture) {
  await mkdir(dirname(fixture.file), { recursive: true });
  await writeFile(fixture.file, fixture.source, 'utf8');

  const result = await run('npx', ['eslint', fixture.file, '--no-ignore']);

  if (result.code === 0) {
    throw new Error(`Boundary fixture unexpectedly passed lint: ${fixture.file}`);
  }

  if (!result.output.includes(fixture.expectedMessage)) {
    throw new Error(
      `Boundary fixture failed for the wrong reason: ${fixture.file}\n${result.output}`,
    );
  }
}

try {
  for (const fixture of fixtures) {
    await verifyFixture(fixture);
  }

  console.log('Boundary lint fixtures were blocked as expected.');
} finally {
  await Promise.all(fixtures.map((fixture) => rm(fixture.file, { force: true })));
}
