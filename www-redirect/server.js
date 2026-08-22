const http = require('node:http');

const port = Number(process.env.PORT || 3000);
const target = 'https://hng1.com';

http.createServer((req, res) => {
  const path = req.url || '/';
  res.writeHead(301, {
    Location: `${target}${path}`,
    'Cache-Control': 'public, max-age=3600'
  });
  res.end();
}).listen(port, () => {
  console.log(`Redirecting www.hng1.com traffic to ${target}`);
});
