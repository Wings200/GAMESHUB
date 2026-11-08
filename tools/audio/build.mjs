#!/usr/bin/env node
// Usage: node tools/audio/build.mjs tools/audio/recipes/engine-intro.json [--out path.wav]
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeWav} from './wav.mjs';
import {renderRecipe} from './mixer.mjs';

export async function buildAudio(recipePath, outputOverride) {
  const absoluteRecipe = resolve(recipePath);
  const base = dirname(absoluteRecipe);
  const recipe = JSON.parse(await readFile(absoluteRecipe, 'utf8'));
  const outName = outputOverride || recipe.output;
  if (typeof outName !== 'string' || !outName.toLowerCase().endsWith('.wav')) throw new Error('A .wav output path is required.');
  const recordings = new Map();
  for (const layer of recipe.layers || []) {
    if (typeof layer.source !== 'string' || !layer.source) throw new Error('Every layer needs a local .wav source.');
    if (!layer.source.toLowerCase().endsWith('.wav')) throw new Error(`Only recorded WAV sources are supported by the CLI: ${layer.source}`);
    if (recordings.has(layer.source)) continue;
    const filePath = isAbsolute(layer.source) ? layer.source : resolve(base, layer.source);
    try { recordings.set(layer.source, decodeWav(await readFile(filePath))); }
    catch (error) { throw new Error(`Cannot load ${filePath}: ${error.message}`); }
  }
  const built = renderRecipe(recipe, recordings);
  const output = isAbsolute(outName) ? outName : resolve(base, outName);
  await mkdir(dirname(output), {recursive: true});
  await writeFile(output, built.wav);
  const reportFile = `${output.slice(0, -4)}.report.json`;
  await writeFile(reportFile, JSON.stringify({recipe: absoluteRecipe, output, ...built.stats}, null, 2) + '\n');
  return {output, reportFile, ...built.stats};
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const out = outIndex >= 0 ? args[outIndex + 1] : undefined;
  if (outIndex >= 0) args.splice(outIndex, 2);
  if (args.length !== 1 || (outIndex >= 0 && !out)) {
    process.stderr.write('Usage: node tools/audio/build.mjs recipe.json [--out file.wav]\n');
    process.exitCode = 2;
  } else {
    buildAudio(args[0], out).then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
      .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
  }
}
