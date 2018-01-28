// JavaScript Document
// Socket 聊天服务器

// TODO manager.js 这里面可以设置心跳的频率，估计也可以在代码里面修改

var WebSocketServer = require('ws').Server
	,wss = new WebSocketServer({port: 8080,server:'172.16.1.43'})
//	,io = require('socket.io').listen(server)
	,redis=require('redis');



//连接
wss.on('connection',function(socket){
	socket.INFO={};
	socket.INFO.uid=0;
	
	console.log('喵个咪 uid:'+socket.INFO.uid);
	
	//修改为读取配置文件，读取redis从库 TODO 是不是该移动到connection事件里面？
	redisSubClient = redis.createClient(6379,'172.16.1.200');

	//redis异常处理
	redisSubClient.on('error',function(error){
		//修改这里的异常处理 TODO
		socket.emit('error','网络异常，稍候试试：（');
		//中止往后的程序执行 TODO
	});
									
	//redis订阅的事件处理 TODO 是否移动到connection事件里面？
	redisSubClient.on('message', function (channel, message) {
		socket.send(message);
	});
	
	//非登录用户直接订阅公共通道
	redisSubClient.subscribe('publicChannel');
	
	//中断连接
	socket.on('disconnect',function(){
		//更新在线状态
		socket.get('uid',function(error,uid){
			if(uid!=null){
				//更新在线状态 TODO 修改redis主库
				redisClient = redis.createClient(6379,'172.16.1.200');
				redisClient.srem('onlineUser',uid,function(error,data){
					console.log('用户离线: '+uid);
				});
				redisClient.quit();
			}
		});
		//关闭redis连接 TODO 这里是关闭redisSubClient吗？所有人的都会被关闭？
		redisSubClient.unsubscribe();
		redisSubClient.quit();
	});
	
	//提交身份认证
	socket.on('authentication',function(us){
		//测试直接提交uid TODO 读取用户的昵称存储起来，放到消息体里面
		var uid=us;
		socket.set('uid',uid);
		
		//登录用户订阅个人通道
		redisSubClient.subscribe('channel:'+uid);
		
		//更新在线状态 TODO 修改redis主库
		var redisClientMaster = redis.createClient(6379,'172.16.1.200')
		redisClientMaster.sadd('onlineUser',uid,function(error,data){
			console.log('用户上线: '+uid);
		});
		redisClientMaster.quit();
		
		//读取用户的离线消息推送到用户的个人通道
		var redisClient = redis.createClient(6379,'172.16.1.200')
		redisClient.lrange('userMessage:'+uid,0,-1,function(error,data){
			if(data){
				var commands=[];
				for (v in data){
					commands.push(['publish','channel:'+uid,v]);
				}
				//直接发布在slave
				redisClient.multi(commands).exec();
				redisClient.quit();
				
				//清理master的用户数据
				var redisClientMaster = redis.createClient(6379,'172.16.1.200');
				redisClientMaster.ltrim('userMessage:'+uid,-(data.length+1),-1);
				redisClientMaster.quit();
			}else{
				redisClient.quit();
			}
		});
	});
	
	//发送消息
	socket.on('message',function(data){
		console.log('旧 uid:'+socket.INFO.uid);
		uid=socket.INFO.uid;
		socket.send(data,function(){
			console.log('返回数据：'+data);
		});
		socket.INFO.uid=Math.random();
		//if (exports.debug_mode) {
			console.log('收到消息：'+JSON.stringify(data));
		//}
		//fn('halela');
		//添加不同类型聊天信息的数据项验证
		//socket.get('uid',function(error,uid){
			if(uid!=null){
				//整理接收的数据 TODO 添加不同类型聊天信息的数据项验证，包括用户昵称fromName
				/*var json=JSON.parse(data);
				json.id=uid+':'+Date.now();
				json.from=uid;
				//发送到队列 保存聊天数据和分发都直接使用队列处理程序处理
				redisClient = redis.createClient(6379,'172.16.1.200');
				redisClient.lpush('queueMsgDstr',JSON.stringify(json));
				redisClient.quit();*/
				//TODO 修改信息成功的回调功能
				//fn('ok');
			}else{
				var json=JSON.parse(data);
				//非登录用户只能给意见反馈账号发消息
				if(json.to && json.to==1){
					//发送消息
					json.id='N'+Math.floor(Math.random()*10000)+':'+Date.now();
					json.from=0;
					//发送到队列 保存聊天数据和分发都直接使用队列处理程序处理
					redisClient = redis.createClient(6379,'172.16.1.200');
					redisClient.lpush('queueMsgDstr',JSON.stringify(json));
					redisClient.quit();
					//TODO 修改信息成功的回调功能
					//fn('ok');
				}
			}
		//});
	});
	
});




//测试，for html5 web client
//server.on('request', function (req, res) {
//    if (req.url === '/socket.io/socket.io.js') return;
//});

//开始监听端口
//server.listen(80, 'localhost');


console.log('The node news is running on http://172.16.1.43:8080/');