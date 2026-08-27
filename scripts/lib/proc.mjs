import { spawn } from 'child_process';
import fs from 'fs';

/**
 * Lancement d'un process externe, sans shell : libuv résout déjà PATH/PATHEXT,
 * et un shell exposerait les arguments (dont l'URL de connexion) à une
 * interprétation.
 *
 * `outFile` redirige stdout vers un fichier, `inFile` alimente stdin depuis un
 * fichier. Les flux sont branchés APRÈS le spawn : un stream fraîchement créé
 * n'a pas encore de descripteur ouvert et `stdio` le refuserait.
 */
export function run(command, commandArgs, { outFile, inFile, ...options } = {}) {
  return new Promise((resolve, reject) => {
    const stdio = options.stdio ?? [inFile ? 'pipe' : 'ignore', outFile ? 'pipe' : 'ignore', 'pipe'];
    const child = spawn(command, commandArgs, { ...options, stdio });

    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    if (inFile) {
      const input = fs.createReadStream(inFile);
      input.on('error', reject);
      input.pipe(child.stdin);
    }

    let written = Promise.resolve();
    if (outFile) {
      const out = fs.createWriteStream(outFile);
      written = new Promise((done, fail) => {
        out.on('finish', done);
        out.on('error', fail);
      });
      child.stdout.pipe(out);
    }

    child.on('error', reject);
    child.on('close', (code) => {
      written.then(
        () =>
          code === 0
            ? resolve()
            : reject(new Error(`${command} a échoué (code ${code})\n${stderr.trim()}`)),
        reject,
      );
    });
  });
}

/** Teste la présence d'un binaire dans le PATH. */
export async function hasCommand(command) {
  try {
    await run(command, ['--version']);
    return true;
  } catch {
    return false;
  }
}
