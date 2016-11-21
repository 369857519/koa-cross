var serve = require('koa-static');
var koa = require('koa');
var app = new koa();

// $ GET /package.json
app.use(serve('./static'));

app.listen(3001);

console.log('listening on port 3001');