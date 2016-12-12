var _ = require('koa-route');
var koa = require('koa');
var app = new koa();
var cors = require('koa-cors');
var session = require('koa-session');
var mysql = require('mysql');
var wrapper = require('co-mysql');
var bodyParser = require('koa-body-parser');


//创建数据库连接池
var pool = wrapper(mysql.createPool({
  host     : '10.99.168.141',
  user     : 'root',
  password : 'mysqlpass',
  database : 'pgc'
}));

//session 控制
app.keys = ['dagedage'];

//增加跨域请求头
app.use(cors({
  origin:'http://10.232.56.17:3002',
  credentials:true
}))
//session控制
var CONFIG = {
  key: 'koa:sess', /** (string) cookie key (default is koa:sess) */
  maxAge: 1000*60*60*24*14, /** (number) maxAge in ms (default is 1 days) */
  overwrite: true, /** (boolean) can overwrite or not (default true) */
  httpOnly: true, /** (boolean) httpOnly or not (default true) */
  signed: true, /** (boolean) signed or not (default true) */
};
//如何进行计算
app.use(session(CONFIG, app));
app.use(bodyParser());
/*
	
	获取视频相关接口

*/

//缓存队列，每次取出时，存在这里，保证下一次不会取到，在编辑接口中，缓存被编辑，则删除掉
var queue=[];


//获取所有视频
app.use(_.post('/video/findByCondition.do',function *(){
	//没登录
	if(!this.session.adminName){
		this.response.body=null;
		return;
	}

	//把之前队列中此用户占有的消息干掉
	var opsessedIDs=[];
	queue=queue.filter((ele)=>{
		console.log(ele.adminName,this.session.adminName);
		console.log(ele.adminName!=this.session.adminName);
		return ele.adminName!=this.session.adminName;
	})
	queue.map((value,index)=>{
		opsessedIDs.push(value.id);
	})
	console.log(queue.length);
	var notInQuery=opsessedIDs.length>0?'('+opsessedIDs.join(',')+')':'(0)';
	//同时在取数据的时候，取不到别的用户占有的信息


	//如果登陆，则进行内容查询
	var query=JSON.parse(this.request.body.data);
	//获取总数信息
	console.log('select count(*) from video where state=? and id not in '+notInQuery)
	var totalCount=yield pool.query('select count(*) from video where state=? and video_length<300 and id not in '+notInQuery,[query.state]);


	//分页信息计算pageSize pageNum,然后获取数据
	var pageSize=parseInt(query.pageSize);
	var pageNum=parseInt(query.pageNum?query.pageNum:1);
	if(typeof pageSize!== 'number'){
		pageSize=9;
	}
	if(typeof pageNum!== 'number'||pageNum<1){
		pageNum=1;
	}
	var start=pageSize*(pageNum-1);
	//
	var rows=yield pool.query('select * from video where state=? and id not in '+notInQuery+' and video_length<300 limit ?,?',[query.state,start,pageSize]);
	rows.map((value,index)=>{
		// /[.]data\/(.*)/.exec(value.video_file_url)[1]
		value.videourl='http://10.232.56.11:32771/'+/[.]\/data\/(.*)/.exec(value.video_file_url)[1];
		value.videoId=value.id;
		value.tags=JSON.parse(value.tags);
		value.adminName=this.session.adminName
		//缓存队列处理
		//把取出来的这个用户的占有的数据加上
		queue.push(value);
	})



	console.log(this.session.adminName)
	this.response.body={
		data:{
			total_count:totalCount[0]['count(*)'],
			videoAuditeList:rows
		},
		desc:"Succeeded to getVideoAuditeListByDateRange",
		status:'succ'
	}
}));


//修改视频状态，tags，备注
app.use(_.post('/video/audite.do',function *(){
	//queryJson
	var query=JSON.parse(this.request.body.data);

	var list=query.list;
	for(var i=0;i<list.length;i++){
		if(typeof list[i].tags!=="string"){
			list[i].tags=JSON.stringify(list[i].tags);
		}
		pool.query('update video set state=?,remarks=?,tags=? where id=?',[list[i].state,list[i].remarks,list[i].tags,list[i].id]);
	}
	//分页信息计算pageSize pageNum
	this.response.body={
		data:"succ",
		desc:null,
		status:"succ"
	}
}));




/*
	
	登录相关接口

*/
//登录
var user={
	'huayingjie@xiaomi.com':'huayingjie',
	'zhouqi@xiaomi.com':'zhouqi',
	'lideqiang@xiaomi.com':'lideqiang',
	'liuli6@xiaomi.com':'liuli6',
	'admin':'admin',
	'a':'a'
}
//登录接口
app.use(_.post('/login.do',function *(){
  var logInfo=JSON.parse(this.request.body.data);
  for(var i in user){
  	if(i===logInfo.adminName&&user[i]===logInfo.adminPass){
  		this.session.adminName=logInfo.adminName;
  	}
  	if(this.session.adminName){
  		this.response.body={
  		  status:'succ',
  		  data:this.session.username+'` 你好，欢迎回来'
  		}
  	}else{
  		this.response.body={
  		  status:'fail',
  		  data:'请输入正确的用户名密码'
  		}
  	}
  }
}));

//登出接口
app.use(_.post('/logout.do',function *(){
  console.log(this.request.query);
  this.session.adminName=undefined;
  this.response.body={
    status:'succ',
    data:''
  }
}));

app.listen(3001);
console.log('listening on port 3001');