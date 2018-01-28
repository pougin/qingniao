// JavaScript Document
// 推送分发服务器，根据需要修改推送的payload

var redis=require('redis')
	, redisClient=redis.createClient(6379,'172.16.1.200')
	, EventProxy= require('eventproxy')
	, checkInterval=100 ;

//TODO 添加redisClient的错误处理，比如断了后重连(自动重连)

//启动工作循环
distribute();

//推送分发主循环 TODO 测试一次获取多个消息然后分发的性能
function distribute() {
	var eventProxy=EventProxy.create();

/*	redisClient.brpop('queuePushDstr',0,function(error,data){
		if(data==null){
			setTimeout(distribute,checkInterval);
		}else{*/
			var data = [];
			data[1] = '{"alert":"222222222","title":"发给andorid的信息","body":"信息的内容","to":4}';
			//console.log('data:'+data[1]);
			//"{\"alert\":\"\xe5\xba\xb7\xe5\xba\xb7\xef\xbc\x9aasdfasdf\",\"title\":\"\xe5\xba\xb7\xe5\xba\xb7\",\"body\":\"asdfasdf\",\"to\":5}"
			var json = jsonForSave =JSON.parse(data[1])
			//ios android 分别推送完成后，开始新的工作循环
			eventProxy.all('ios','android',function(ios,android){
				distribute();
			});
			
			
			//ios的入列操作
			eventProxy.all('iosPush',function(iosPush){
				if(iosPush.length>0){
					//TODO 添加badge数据
					var commands=[];
					for (c in iosPush){
						commands.push(['lpush','queueApplePush',JSON.stringify(iosPush[c])]);
					}
					redisClient.multi(commands).exec();
				}
				eventProxy.emit('ios',null);
			});			
			
			//android的入列操作
			eventProxy.all('andriodPush',function(andriodPush){
				if(andriodPush.length>0){
					var commands=[];
					for (c in andriodPush){
						commands.push(['lpush','queueAndroidPush',JSON.stringify(andriodPush[c])]);
					}
					redisClient.multi(commands).exec();
				}
				eventProxy.emit('android',null);
			});			
			
			//console.log('userDevice:'+json.to);
			//读取用户的device token TODO 这个存储的结构变了，修改代码
			redisClient.hgetall('userDevice:'+json.to, function(error,data){
				//console.log(data);
					var iosQueue=[];
					var androidQueue=[];
					//console.log(iosQueue.length); return;
					for (key in data){
						//console.log('key:'+data[key].substr(0,1));
						if(data[key].substr(0,1)=='i'){
							iosQueue.push({aps:{alert:json.alert},token:data[key]});
						}else{
							androidQueue.push({payload:{title:json.title, content:json.body},token:key});
						}
					}
					if(iosQueue.length>0){
						eventProxy.emit('iosPush',iosQueue);
					}
					if(androidQueue.length>0){
						eventProxy.emit('andriodPush',androidQueue);
					}
	
			});
/*		}
	});*/
};