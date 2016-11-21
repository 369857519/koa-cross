var serve = require('koa-static');
var koa = require('koa');
var app = new koa();
var cors = require('koa-cors');
// $ GET /package.json
app.use(serve('./static'));

app.listen(3001);

console.log('listening on port 3001');