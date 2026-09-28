const fs = require('fs');
const path = require('path');

const controllersDir = path.join(process.cwd(), 'src', 'controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const searchStr = 'const baseUrl = `${req.protocol}://${req.get(\'host\')}`;';
  const replaceStr = 'const reqHost = req.get(\'host\');\n        const reqProtocol = reqHost.includes(\'localhost\') ? \'http\' : \'https\';\n        const baseUrl = `${reqProtocol}://${reqHost}`;';
  
  if (content.includes(searchStr)) {
    content = content.split(searchStr).join(replaceStr);
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', file);
  }
});
