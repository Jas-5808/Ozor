const fs = require('fs');
const path = require('path');

function removeCommentsFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Удаляем однострочные комментарии //
    content = content.replace(/^\s*\/\/.*$/gm, '');
    
    // Удаляем многострочные комментарии /* */
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Удаляем пустые строки, которые остались после удаления комментариев
    content = content.replace(/^\s*$/gm, '');
    
    fs.writeFileSync(filePath, content);
    console.log(`Обработан файл: ${filePath}`);
  } catch (error) {
    console.error(`Ошибка при обработке файла ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      removeCommentsFromFile(filePath);
    }
  });
}

// Обрабатываем папку src
processDirectory('./src');
console.log('Удаление комментариев завершено!');
