function normalizeCode(code, lang = 'python') {
  if (!code) return '';
  let clean = code;
  
  if (lang && lang.toLowerCase() === 'python') {
    clean = clean.replace(/#.*$/gm, '');
  } else {
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
    clean = clean.replace(/\/\/.*$/gm, '');
  }
  

  clean = clean
    .replace(/\+\+([a-zA-Z0-9_]+)/g, '$1+=1')
    .replace(/([a-zA-Z0-9_]+)\+\+/g, '$1+=1')
    .replace(/([a-zA-Z0-9_]+)\s?=\s?\1\s?\+\s?([a-zA-Z0-9_]+)/g, '$1+=$2')
    .replace(/([a-zA-Z0-9_]+)\s?=\s?\1\s?-\s?([a-zA-Z0-9_]+)/g, '$1-=$2')
    .replace(/([a-zA-Z0-9_]+)\s?=\s?\1\s?\*\s?([a-zA-Z0-9_]+)/g, '$1*=$2')
    .replace(/([a-zA-Z0-9_]+)\s?=\s?\1\s?\/\s?([a-zA-Z0-9_]+)/g, '$1/=$2');

  const result = clean
    .replace(/\\n/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\x21-\x7E]/g, '')
    .toLowerCase();
  
  return result;
}

const tests = [
  { a: 'total = total + n', b: 'total += n', label: 'Python addition' },
  { a: 'fact = fact * i', b: 'fact *= i', label: 'Python multiplication' },
  { a: 'i = i + 1', b: 'i++', label: 'Increment v1' },
  { a: 'i += 1', b: 'i++', label: 'Increment v2' },
  { a: 'total=total+n', b: 'total += n', label: 'Whitespace diff' },
  { a: 'if x == 10:\n  pass', b: 'if x==10:pass', label: 'Newline/indent diff' }
];

tests.forEach(t => {
  const normA = normalizeCode(t.a);
  const normB = normalizeCode(t.b);
  const pass = normA === normB;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.label}`);
  if (!pass) {
    console.log(`  A: ${normA}`);
    console.log(`  B: ${normB}`);
  }
});
