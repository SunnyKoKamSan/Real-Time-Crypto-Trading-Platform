import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

function runOnce(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function startLongRunning(name, command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    detached: !isWindows,
  });

  child.on('error', (error) => {
    console.error(`[${name}] ${error.message}`);
    shutdown('SIGTERM', 1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const exitCode = typeof code === 'number' ? code : 1;
    console.error(`[${name}] exited with ${signal ?? `code ${exitCode}`}`);
    shutdown('SIGTERM', exitCode);
  });

  return child;
}

function stopChild(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  try {
    if (!isWindows && child.pid) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch (error) {
    if (error.code !== 'ESRCH') {
      throw error;
    }
  }
}

let shuttingDown = false;
const children = [];

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    stopChild(child, signal);
  }

  setTimeout(() => process.exit(exitCode), 1000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('SIGTERM', () => shutdown('SIGTERM', 0));

await runOnce('docker', ['compose', 'up', '-d']);

children.push(startLongRunning('api', 'npm', ['run', 'dev:api']));
children.push(startLongRunning('web', 'npm', ['run', 'dev:web']));
