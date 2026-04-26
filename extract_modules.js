const fs = require('fs');
const content = fs.readFileSync('client/src/pages/learn.tsx', 'utf-8');
const startIndex = content.indexOf('const initialModules: Module[] = [');
if (startIndex !== -1) {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inMultiComment = false;
  let i = content.indexOf('[', startIndex);
  let endIndex = i;
  for (; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i+1];
    
    if (inString) {
      if (char === '\\\\') i++;
      else if (char === stringChar) inString = false;
    } else if (inComment) {
      if (char === '\\n') inComment = false;
    } else if (inMultiComment) {
      if (char === '*' && nextChar === '/') { inMultiComment = false; i++; }
    } else {
      if (char === '\\'' || char === '"' || char === '`') { inString = true; stringChar = char; }
      else if (char === '/' && nextChar === '/') { inComment = true; i++; }
      else if (char === '/' && nextChar === '*') { inMultiComment = true; i++; }
      else if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }
  
  const arrayStr = content.substring(content.indexOf('[', startIndex), endIndex);
  
  // Transform to evaluatable JS
  // We need to just extract title, description, and lesson titles.
  // Instead of evaluating, let's use a simple regex to match objects.
}

function extractData(text) {
  const modules = [];
  const moduleRegex = /id:\s*["']([^"']+)["'],\s*title:\s*["']([^"']+)["'],\s*description:\s*["']([^"']+)["'],[\s\S]*?lessons:\s*\[([\s\S]*?)\]\s*\n\}/g;
  
  let match;
  while ((match = moduleRegex.exec(text)) !== null) {
    const id = match[1];
    const title = match[2];
    const description = match[3];
    const lessonsStr = match[4];
    
    const lessons = [];
    const lessonRegex = /title:\s*["']([^"']+)["']/g;
    let lessonMatch;
    while ((lessonMatch = lessonRegex.exec(lessonsStr)) !== null) {
      lessons.push({ title: lessonMatch[1] });
    }
    
    modules.push({
      title,
      description,
      lessons
    });
  }
  
  return modules;
}

const data = extractData(content);
console.log(JSON.stringify(data, null, 2));
