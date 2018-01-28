// JavaScript Document
// Socket 聊天服务器

/* TODO 
	manager.js 这里面可以设置心跳的频率，估计也可以在代码里面修改
	服务器的可打开文件数必须优化
	所有方法添加反灌水
*/

var server = require('http').createServer()
	, io = require('socket.io').listen(server)
	, redis = require('redis')
	, Kado = require('kado').create()
	, fs = require('fs');


//连接
io.sockets.on('connection',function(socket){

	var antiSpam = new Kado.AntiSpam()
		, cache = new Kado.Store()
		, redisSubClient = redis.createClient(6379,'172.16.1.200');

	//redis异常处理
	redisSubClient.on('error',function(error){
		//修改这里的异常处理 TODO
		io.sockets.emit('error','网络异常，稍候试试：（');
		//中止往后的程序执行 TODO
	});
									
	//redis订阅的事件处理 TODO 是否移动到connection事件里面？
	redisSubClient.on('message', function (channel, message) {
		console.log('message:'+JSON.parse(message));
		socket.json.send(JSON.parse(message));
	});
	
	//非登录用户直接订阅公共通道
	redisSubClient.subscribe('publicChannel');
	
	//test 输出用户列表
	var users=['大家','睿之','芝伊','银凤','胖猫猫','巩璞','小歪','包子','守野','康康','肇文','Bruce'];
	socket.emit('online', users);
	redisClient = redis.createClient(6379,'172.16.1.200');
	
	for (key in users){
		redisClient.zadd('dialogueUser:大家',1,users[key]);
	}
	redisClient.quit();

	
	//中断连接
	//	1 修改device的在线状态
	//	3 用户离线
	//	4 清理cache数据
	//	5 取消通道的订阅
	socket.on('disconnect',function(){
		if(!antiSpam.check('disconnect',1000)){
			console.log('AntiSpam blocked: disconnect');
			return;
		}

		var uid = cache.get('uid');
		if(uid==null){
			return;
		}
		
		var redisClientMaster = redis.createClient(6379,'172.16.1.200')
		var commands=[ ['srem', 'onlineUser', uid]
			, ['hset', 'userDevice:'+uid, cache.get('device'), cache.get('os')+'1']
		];
		redisClientMaster.multi(commands).exec();
		redisClientMaster.quit();
		
		redisSubClient.unsubscribe();
		redisSubClient.quit();
		
		cache.del(uid);
	});
	
	//提交身份认证
	//	必须包含的信息
	//	us:用户的session
	//	device:用户的设备token
	//	os:用户的系统
	socket.on('authentication',function(json){
		if(!antiSpam.check('auth',100)){
			console.log('AntiSpam blocked: auth');
			return;
		}
		
		//可以根据其他条件判断出os
		var OSlist={android:'a',iOS:'i',wp:'w'};
		json.os = 'undefined'!=typeof OSlist[json.os]
			? OSlist[json.os]
			: '' ;
		
		//test
		//var uid=json.us;
		var uid=Kado.parseUid(json.us);
		if(uid==0 || 'undefined'==typeof json.device || json.os==''){
			return;
		}
		cache.set('uid',uid);
		cache.set('device',json.device);
		cache.set('os',json.os);
		cache.set('name','undefined'==typeof json.name ? 'USER'+uid : json.name);
		
		//登录用户订阅个人通道
		redisSubClient.subscribe('channel:'+uid);
		
		//更新在线状态 TODO 修改redis主库
		var redisClientMaster = redis.createClient(6379,'172.16.1.200')
		var commands=[ ['sadd', 'onlineUser', uid]
			, ['hset', 'userDevice:'+uid, json.device, json.os+'1']
			// 这里的设备到用户的映射关系，用更慢的存储就行比如mysql
			, ['set', 'device:'+json.device, uid]
		];
		redisClientMaster.multi(commands).exec();
		redisClientMaster.quit();
		
		//读取用户的离线消息直接发给客户端
		var redisClient = redis.createClient(6379,'172.16.1.200')
		redisClient.lrange('userMessage:'+uid, 0, -1, function(error,data){
			if(data){
				var commands=[];
				for (v in data){
					commands.push(['publish','channel:'+uid,v]);
					socket.json.send(JSON.parse(data[v]));
				}
				
				//清理master的用户数据
				var redisClientMaster = redis.createClient(6379,'172.16.1.200');
				redisClientMaster.ltrim('userMessage:'+uid, 0, -(data.length+1));
				redisClientMaster.quit();
			}
		});
		redisClient.quit();
	});
	
	//客户端主动退出登录，但不退出应用 TODO
	//	1 取消device的注册 删除 'device:'+device
	//	2 删除uid和device的关联关系
	//	3 用户离线
	//	4 清理cache数据
	//	5 取消个人通道的订阅
	//		总体上，和authentication相反
	socket.on('logout',function(json){
		if(!antiSpam.check('logout',100)){
			console.log('AntiSpam blocked: message');
			return;
		}

		var uid = cache.get('uid');
		if(uid==null){
			return;
		}
		
		var redisClientMaster = redis.createClient(6379,'172.16.1.200')
		var commands=[ ['srem', 'onlineUser', uid]
			, ['hdel', 'userDevice:'+uid, cache.get('device')]
			// 这里的设备到用户的映射关系，用更慢的存储就行比如mysql
			, ['del', 'device:'+json.device, uid]
		];
		redisClientMaster.multi(commands).exec();
		redisClientMaster.quit();
		
		redisSubClient.unsubscribe('channel:'+uid);
		
		cache.del(uid);
	});
	
	//发送消息
	socket.on('message',function(json){
		if(!antiSpam.check('message',100)){
			console.log('AntiSpam blocked: message');
			return;
		}
		
		//for test
		if('undefined'==typeof json.nosendback){
			socket.json.send(json,function(){
				//console.log('返回数据：'+JSON.stringify(json));
			});
		}
		//console.log('收到消息：'+JSON.stringify(json));

		//添加不同类型聊天信息的数据项验证
		if('undefined'==typeof json.to && 'undefined'==typeof json.dialogue){
			console.log('over');
			return;
		}
		
		var uid = cache.get('uid')
			, name = cache.get('name');
			
		
		if(uid!=null){
			//整理接收的数据 TODO 添加不同类型聊天信息的数据项验证，包括用户昵称fromName
			json.id=uid+':'+Date.now();
			json.from=uid;
			json.fromName=name;
			//发送到队列 保存聊天数据和分发都直接使用队列处理程序处理
			redisClient = redis.createClient(6379,'172.16.1.200');
			redisClient.lpush('queueMsgDstr',JSON.stringify(json));
			redisClient.quit();
			//TODO 修改信息成功的回调功能
			//fn('ok');
		}else{
			//非登录用户只能给意见反馈账号发消息
			if(json.to && json.to==1){
				//发送消息
				json.id='N'+Math.floor(Math.random()*10000)+':'+Date.now();
				json.from=0;
				json.fromName='Kado用户';
				//发送到队列 保存聊天数据和分发都直接使用队列处理程序处理
				redisClient = redis.createClient(6379,'172.16.1.200');
				redisClient.lpush('queueMsgDstr',JSON.stringify(json));
				redisClient.quit();
				//TODO 修改信息成功的回调功能
				//fn('ok');
			}
		}
	});
	
});




//测试，for html5 web client
server.on('request', function (req, res) {
    if ( req.url === '/socket.io/socket.io.js' ) return;
	if ( req.url === '/' ){
		fs.readFile('../client/index.html', function (err, html) {
			res.writeHeader(200, {"Content-Type": "text/html"});
			res.write(html);  
			res.end();  
		});
	}
});

//开始监听端口
server.listen(8080, '172.16.1.188');


console.log('The node news is running on http://172.16.1.188:8080/');