// JavaScript Document
// 消息分发服务器

//! error:Redis connection gone from end event.
//	长连接的redis 添加这个ping 什么的,看如何解决上面的问题

var redis=require('redis')
	, redisClient=redis.createClient(6379,'172.16.1.200')
	, redisPubClient=redis.createClient(6379,'172.16.1.200')
	, EventProxy= require('eventproxy');

//redis异常处理
redisClient.on('error',function(error){
	console.log('redis错误：'+error);
});
redisPubClient.on('error',function(error){
	console.log('redis错误：'+error);
});


//启动工作循环
distribute();

//消息分发主循环 TODO 测试一次获取多个消息然后分发的性能
function distribute() {
	//rpop 用brpop代替，不用settimeout
	redisClient.brpop('queueMsgDstr', 0, function(error,data){
		if(error){
			console.log('! error:'+error);
			
			redisClient=redis.createClient(6379,'172.16.1.200');
			redisPubClient=redis.createClient(6379,'172.16.1.200');

			distribute();
			return;
		}
		console.log('Original Message\t'+data[1]);
		
		
		

		var eventProxy = new EventProxy();
		var json = JSON.parse(data[1])
			, jsonForSave = JSON.parse(data[1]);

		//完成一个工作循环，启动下一个
		eventProxy.all('save','msgDstr','pushDstr',function(save, msgDstr, pushDstr){
			console.log('end \n\n');
			distribute();
		});
		
		
		
		//save 消息放入持久存储
		delete jsonForSave.fromName;
		redisClient.hmset('message:'+json.id, jsonForSave, function(error,data){
			console.log('#save');
			eventProxy.emit('save', null);
		});
		
		//msgDstr 读取被推送人，并根据他们的状态推送数据
		eventProxy.tail('userList' ,function(userList){
			console.log('userList:'+userList);
			var msg=json;
			//TODO 可以删除id，根据客户端的最小需求返回数据
			delete msg.to;
			//delete msg.fromName, msg.to;
			msg=JSON.stringify(msg);
			
			if(typeof(userList)!='object'){
				messageDistribute(userList,msg);
			}else{
				for (key in userList){
					messageDistribute(userList[key],msg);
				}
			}
			
			console.log('2 #msgDstr');
			eventProxy.emit('msgDstr', null);
		});
		
		
		//pushDstr 准备推送json数据，读取被推送的人
		eventProxy.tail('userList', 'pushMsg' ,function(userList,pushMsg){
			if(typeof(userList)!='object'){
				pushMsg.to=userList;
				redisClient.lpush('queuePushDstr',JSON.stringify(pushMsg));
			}else if(userList.length>0){
				var commands=[];
				for (user in userList){
					pushMsg.to=userList[user];
					commands.push(['lpush','queuePushDstr',JSON.stringify(pushMsg)]);
				}
				redisClient.multi(commands).exec();
			}
			
			console.log('4 #pushDstr');
			eventProxy.emit('pushDstr', null);
		});
		

		//userList 读取分发对象列表
		if(json.to){
			console.log('1 #userList to\t\t'+json.to);
			eventProxy.emit('userList',json.to);
		}else if('undefined'!=typeof json.dialogue){
			redisClient.zrange('dialogueUser:'+json.dialogue, 0, -1, function(error,data){
				if(error){
					console.log('# 2 userList\t\tempty');
					eventProxy.emit('userList', []);
				}else{
					console.log('dialogueUser result\t'+JSON.stringify(data));
					for (key in data){
						if(data[key]==json.from){
							data.splice(key,1);
						}
					}
					console.log('# 3 userList\t\t'+JSON.stringify(data));
					//eventProxy.emit('userList', '胖猫猫');
					eventProxy.emit('userList', data);
				}
			});
		} else{
			console.log('# 4 userList\t\tempty');
			eventProxy.emit('userList', []);
		}
		//eventProxy.emit('userList', '胖猫猫');
		
		//pushMsg 准备推送消息
		var pushMsg={alert:'', title:json.fromName, body:''};
		switch (json.type){
			case 'voice':
				pushMsg.alert=json.fromName+'：[声音]';
				pushMsg.body='[声音]';
				break;
			case 'image':
				pushMsg.alert=json.fromName+'：[图片]';
				pushMsg.body='[图片]';
				break;
			default:
				console.log('pushMsg json\t\t'+JSON.stringify(json));
				pushMsg.alert=(json.fromName+'：'+json.text).substr(0,20);
				pushMsg.body=json.text
					? json.text.substr(0,20)
					: '[新消息]';
				break;
		}
		console.log('3 #pushMsg\t\t'+JSON.stringify(pushMsg));
		eventProxy.emit('pushMsg', pushMsg);
	});
};

//消息分发执行函数
function messageDistribute(uid,msg){
	redisClient.sismember('onlineUser', uid, function(error,data){
		if(data==true){
			console.log('channel:'+uid+msg);
			redisPubClient.publish('channel:'+uid, msg);
		}else{
			console.log('userMessage1:'+uid+msg);
			redisClient.lpush('userMessage:'+uid,msg);
		}
	});
}