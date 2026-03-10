#!/usr/bin/env node

/*
  Refreshes these fields in graph.md for each function section:
  - Signature: `name(arg1, arg2, ...)`
  - Purpose: derived from immediate JSDoc near the function
  - Usage: definition + invocation sites with context

  Usage:
    node update-graph-md-refs.js
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GRAPH_JS = path.join(ROOT, 'graph.js');
const GRAPH_MD = path.join(ROOT, 'graph.md');

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listFilesRecursive(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === '.git') continue;
    if (ent.name === 'node_modules') continue;

    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      listFilesRecursive(abs, out);
    } else if (ent.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

function parseFunctions(jsText) {
  const out = [];
  const re = /function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{/gms;
  let m;
  while ((m = re.exec(jsText)) !== null) {
    const name = m[1];
    const rawParams = m[2].replace(/\s+/g, ' ').trim();
    const signature = `${name}(${rawParams})`;
    const line = jsText.slice(0, m.index).split('\n').length;

    const purpose = buildPurpose(jsText, m.index, name);

    out.push({ name, line, signature, purpose });
  }
  return out;
}

function immediateJsdocLines(jsText, fnStartIndex) {
  const before = jsText.slice(0, fnStartIndex);
  let i = before.length - 1;

  while (i >= 0 && /\s/.test(before[i])) i--;
  if (i < 1 || before[i] !== '/' || before[i - 1] !== '*') return [];

  const end = i + 1;
  const start = before.lastIndexOf('/**', end - 2);
  if (start === -1) return [];

  const block = before.slice(start + 3, end - 1);
  return block
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter((l) => l && !l.startsWith('@'));
}

function sentenceCount(s) {
  const parts = s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length;
}

function firstNSentences(s, n) {
  const parts = s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';
  return parts.slice(0, n).join(' ');
}

function buildPurpose(jsText, fnStartIndex, fnName) {
  const lines = immediateJsdocLines(jsText, fnStartIndex);

  let base = '';
  if (lines.length === 0) {
    base = 'Local helper / implementation function used by nearby graph algorithms.';
  } else {
    const cleaned = lines
      .map((l) => String(l).replace(/\*+\/?\s*$/, '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    base = firstNSentences(cleaned, 2);

    // Remove long procedural JSDoc sections from short purpose summaries.
    base = base.replace(/\b(Preferred signature|Backward-compatible signature|Invalid\/absent|Strategy:|Algorithm:)\b[\s\S]*$/i, '').trim();
    if (!base) base = firstNSentences(cleaned, 1);
    base = base.replace(/\s+/g, ' ').trim();
  }

  if (sentenceCount(base) <= 1) {
    if (fnName.startsWith('_') || fnName === 'bfsCount' || fnName === 'backtrack') {
      base += ' It is primarily an internal helper rather than a user-facing API entry point.';
    } else {
      base += ' This is used in graph analysis and generation flows throughout the project.';
    }
  }

  return base;
}

function parseDeclaredFunctionsWithRanges(fileText) {
  const out = [];
  const re = /function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{/gms;
  let m;
  while ((m = re.exec(fileText)) !== null) {
    const name = m[1];
    const startIdx = m.index;
    const openBraceIdx = re.lastIndex - 1;

    let depth = 0;
    let endIdx = openBraceIdx;
    for (let i = openBraceIdx; i < fileText.length; i++) {
      const ch = fileText[i];
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    const startLine = fileText.slice(0, startIdx).split('\n').length;
    const endLine = fileText.slice(0, endIdx).split('\n').length;
    out.push({ name, startLine, endLine });
  }
  return out;
}

function lineOfIndex(text, idx) {
  return text.slice(0, idx).split('\n').length;
}

function enclosingFunctionName(functionRanges, line) {
  let best = null;
  for (const f of functionRanges) {
    if (line >= f.startLine && line <= f.endLine) {
      if (!best || (f.endLine - f.startLine) < (best.endLine - best.startLine)) {
        best = f;
      }
    }
  }
  return best ? best.name : null;
}

function buildUsages(fnMeta, files) {
  const usageMap = new Map(fnMeta.map((m) => [m.name, []]));
  const metaByName = new Map(fnMeta.map((m) => [m.name, m]));

  for (const m of fnMeta) {
    usageMap.get(m.name).push({
      file: 'graph.js',
      line: m.line,
      context: 'defined',
    });
  }

  const regexByName = new Map(fnMeta.map((m) => [m.name, new RegExp(`\\b${escapeRegExp(m.name)}\\s*\\(`, 'g')]));

  for (const absFile of files) {
    const rel = path.relative(ROOT, absFile).split(path.sep).join('/');

    // graph.md is generated documentation, not a code usage site.
    if (rel === 'graph.md') continue;

    let txt;
    try {
      txt = fs.readFileSync(absFile, 'utf8');
    } catch {
      continue;
    }

    const functionRanges = parseDeclaredFunctionsWithRanges(txt);

    for (const [name, re] of regexByName.entries()) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(txt)) !== null) {
        const line = lineOfIndex(txt, m.index);
        const lineText = txt.split(/\r?\n/)[line - 1] || '';
        const trimmed = lineText.trim();

        // Skip plain comment/doc lines to avoid false-positive "calls".
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          continue;
        }

        if (rel === 'graph.js' && line === metaByName.get(name).line) {
          continue;
        }

        const inside = enclosingFunctionName(functionRanges, line);
        const context = inside ? `inside ${inside}` : 'top-level';

        usageMap.get(name).push({ file: rel, line, context });
      }
    }
  }

  for (const [name, arr] of usageMap.entries()) {
    const seen = new Set();
    const deduped = [];
    for (const u of arr) {
      const key = `${u.file}:${u.line}:${u.context}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(u);
    }
    deduped.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.line - b.line;
    });
    // Keep definition entries as-is. For invocation entries, keep only the
    // first occurrence per (file, context), so repeated calls inside the same
    // caller function don't bloat the output.
    const collapsed = [];
    const seenCaller = new Set();
    for (const u of deduped) {
      if (u.context === 'defined') {
        collapsed.push(u);
        continue;
      }
      const callerKey = `${u.file}:${u.context}`;
      if (seenCaller.has(callerKey)) continue;
      seenCaller.add(callerKey);
      collapsed.push(u);
    }

    usageMap.set(name, collapsed);
  }

  return usageMap;
}

function updateGraphMd(mdText, fnMeta, usages) {
  const lines = mdText.split(/\r?\n/);
  const fnMap = new Map(fnMeta.map((x) => [x.name, x]));

  for (let i = 0; i < lines.length; i++) {
    const headerMatch = lines[i].match(/^###\s+([A-Za-z0-9_]+)\s*$/);
    if (!headerMatch) continue;

    const fnName = headerMatch[1];
    if (!fnMap.has(fnName)) continue;

    let sectionEnd = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^###\s+/.test(lines[j])) {
        sectionEnd = j;
        break;
      }
    }

    const fn = fnMap.get(fnName);
    const signatureLine = `- Signature: \`${fn.signature}\``;
    const purposeLine = `- Purpose: ${fn.purpose}`;
    const usageEntries = usages.get(fnName) || [{ file: 'graph.js', line: fn.line, context: 'defined' }];
    const usageLine = `- Usage: ${usageEntries.map((u) => `\`${u.file}:${u.line} (${u.context})\``).join(', ')}`;

    let signatureIdx = -1;
    let purposeIdx = -1;
    let usageIdx = -1;
    let definedIdx = -1; // legacy line cleanup
    let appearsIdx = -1; // legacy line cleanup

    for (let j = i + 1; j < sectionEnd; j++) {
      if (lines[j].startsWith('- Signature:')) signatureIdx = j;
      if (lines[j].startsWith('- Purpose:')) purposeIdx = j;
      if (lines[j].startsWith('- Usage:')) usageIdx = j;
      if (lines[j].startsWith('- Defined in:')) definedIdx = j;
      if (lines[j].startsWith('- Appears in codebase:')) appearsIdx = j;
    }

    if (signatureIdx !== -1) {
      lines[signatureIdx] = signatureLine;
    } else {
      lines.splice(i + 1, 0, signatureLine);
      sectionEnd++;
      if (purposeIdx !== -1) purposeIdx++;
      if (definedIdx !== -1) definedIdx++;
      if (appearsIdx !== -1) appearsIdx++;
      signatureIdx = i + 1;
    }

    if (purposeIdx !== -1) {
      lines[purposeIdx] = purposeLine;
    } else {
      const insertAt = signatureIdx + 1;
      lines.splice(insertAt, 0, purposeLine);
      sectionEnd++;
      if (usageIdx >= insertAt) usageIdx++;
      if (definedIdx >= insertAt) definedIdx++;
      if (appearsIdx >= insertAt) appearsIdx++;
    }

    if (usageIdx !== -1) {
      lines[usageIdx] = usageLine;
    } else {
      const insertAt = (purposeIdx !== -1 ? purposeIdx : signatureIdx) + 1;
      lines.splice(insertAt, 0, usageLine);
    }

    // Remove legacy split fields if present.
    const removeIdx = [];
    for (let j = i + 1; j < sectionEnd + 2 && j < lines.length; j++) {
      if (lines[j].startsWith('- Defined in:') || lines[j].startsWith('- Appears in codebase:')) {
        removeIdx.push(j);
      }
    }
    for (let k = removeIdx.length - 1; k >= 0; k--) {
      lines.splice(removeIdx[k], 1);
    }
  }

  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(GRAPH_JS)) {
    throw new Error('graph.js not found in current directory');
  }
  if (!fs.existsSync(GRAPH_MD)) {
    throw new Error('graph.md not found in current directory');
  }

  const jsText = fs.readFileSync(GRAPH_JS, 'utf8');
  const mdText = fs.readFileSync(GRAPH_MD, 'utf8');

  const fnMeta = parseFunctions(jsText);
  const files = listFilesRecursive(ROOT);
  const usages = buildUsages(fnMeta, files);

  const updated = updateGraphMd(mdText, fnMeta, usages);

  if (updated !== mdText) {
    fs.writeFileSync(GRAPH_MD, updated, 'utf8');
    console.log('Updated graph.md signature, purpose, and merged usage entries.');
  } else {
    console.log('No changes needed. graph.md is already up to date.');
  }
}

main();
