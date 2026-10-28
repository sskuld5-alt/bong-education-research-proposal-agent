import { readFile, writeFile, mkdir, realpath, stat, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const expectedVersion = '4.24.13';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

function argumentsFrom(argv) {
  const options = { ocr: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') return { help: true };
    if (argv[i] === '--pdf' && argv[i + 1] && !options.pdf) options.pdf = argv[++i];
    else if (argv[i] === '--ocr' && ['on', 'off'].includes(argv[i + 1])) options.ocr = argv[++i] === 'on';
    else throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
  }
  if (!options.pdf) throw new Error('Use --pdf <path>.');
  return options;
}

async function main() {
  const args = argumentsFrom(process.argv.slice(2));
  if (args.help) {
    console.log('node agents/parsing/scripts/parse-pdf.mjs --pdf <literature/pdf/L001_*.pdf> [--ocr on|off]');
    return;
  }
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node.js 20+ is required.');
  const root = await realpath(projectRoot);
  const pdf = await realpath(path.resolve(root, args.pdf));
  if (!inside(root, pdf)) throw new Error('Input must be inside this project.');
  if (path.extname(pdf).toLowerCase() !== '.pdf' || !(await stat(pdf)).isFile()) throw new Error('Input is not a PDF file.');
  const pdfDir = path.dirname(pdf);
  const literatureDir = path.dirname(pdfDir);
  if (path.basename(pdfDir) !== 'pdf' || path.basename(literatureDir) !== 'literature') {
    throw new Error('Input must be stored in literature/pdf/.');
  }
  const id = path.basename(pdf).match(/^(L\d{3,})(?:_|\.)/)?.[1];
  if (!id) throw new Error('PDF filename must start with a literature ID, for example L001_.');
  const bytes = await readFile(pdf);
  if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('PDF header was not found.');
  const originalHash = sha256(bytes);
  const engineRoot = path.join(root, '.tools', 'kordoc', 'node_modules', 'kordoc');
  let manifest;
  try { manifest = JSON.parse(await readFile(path.join(engineRoot, 'package.json'), 'utf8')); }
  catch { throw new Error('Kordoc is missing. Follow agents/parsing/references/kordoc-runtime.md.'); }
  if (manifest.version !== expectedVersion) throw new Error(`Expected Kordoc ${expectedVersion}, found ${manifest.version}.`);
  const { parsePdf } = await import(pathToFileURL(path.join(engineRoot, 'dist', 'index.js')).href);
  if (typeof parsePdf !== 'function') throw new Error('Installed Kordoc does not export parsePdf().');
  const parent = path.join(literatureDir, 'parsed', id);
  await mkdir(parent, { recursive: true });
  const canonicalParent = await realpath(parent);
  if (!inside(root, canonicalParent) || !inside(literatureDir, canonicalParent)) throw new Error('Output path escapes the literature directory.');
  const runDirectory = await mkdtemp(path.join(canonicalParent, `${new Date().toISOString().replace(/[:.]/g, '-')}-`));
  const parseOptions = { ocr: args.ocr, ocrLines: true, images: false, scriptTags: true };
  const record = {
    schemaVersion: 1,
    literatureId: id,
    engine: { name: 'kordoc', version: manifest.version, repository: 'https://github.com/chrisryugj/kordoc' },
    input: { path: path.relative(root, pdf), sha256: originalHash, bytes: bytes.length },
    options: parseOptions,
    startedAt: new Date().toISOString(),
    reviewStatus: 'pending',
    reviewNote: 'One original-PDF comparison review is required. Parsing success is not review approval.',
    signals: [],
  };
  let result;
  try { result = await parsePdf(bytes, parseOptions); }
  catch (error) { result = { success: false, fileType: 'pdf', code: error.code ?? 'PARSE_ERROR', error: error.message }; }
  await writeFile(path.join(runDirectory, '01_원시파싱.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  if (result.success === true) {
    if (typeof result.markdown !== 'string' || !Array.isArray(result.blocks)) throw new Error('Unexpected Kordoc result schema; raw output was preserved.');
    await writeFile(path.join(runDirectory, '02_파싱본문.md'), result.markdown, { flag: 'wx' });
    const pages = result.pages ?? [];
    record.metrics = {
      sourcePageCountReportedByParser: result.metadata?.pageCount ?? null,
      pageEntries: pages.length,
      characters: result.markdown.length,
      emptyPages: pages.filter(page => !page.markdown?.trim()).map(page => page.pageNumber),
      ocrCandidatePages: result.qualitySummary?.ocrCandidatePages ?? [],
    };
    record.warnings = result.warnings ?? [];
    if (!result.markdown.trim()) record.signals.push('EMPTY_MARKDOWN');
    if (!pages.length) record.signals.push('PAGE_MAP_MISSING');
    if (record.metrics.emptyPages.length) record.signals.push('EMPTY_PAGES_REQUIRE_ORIGINAL_COMPARISON');
    if (result.qualitySummary?.needsOcr) record.signals.push('OCR_QUALITY_REQUIRES_REVIEW');
    if (record.warnings.length) record.signals.push('KORDOC_WARNINGS_REQUIRE_REVIEW');
  } else {
    record.error = { code: result.code ?? 'PARSE_ERROR', message: result.error ?? 'Unknown parsing failure' };
    record.signals.push('PARSING_FAILED');
  }
  record.input.sha256After = sha256(await readFile(pdf));
  record.input.unchanged = record.input.sha256After === originalHash;
  if (!record.input.unchanged) record.signals.push('INPUT_CHANGED');
  record.parseStatus = result.success === true && !record.signals.includes('EMPTY_MARKDOWN') && record.input.unchanged ? 'success' : 'failed';
  record.finishedAt = new Date().toISOString();
  await writeFile(path.join(runDirectory, '03_파싱기록.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({
    literatureId: id,
    runDirectory,
    parseStatus: record.parseStatus,
    reviewStatus: record.reviewStatus,
    signals: record.signals,
  }, null, 2));
  if (record.parseStatus !== 'success') process.exitCode = 2;
}

main().catch(error => {
  console.error(JSON.stringify({ error: error.message, reviewStatus: 'not_completed' }));
  process.exitCode = 1;
});
