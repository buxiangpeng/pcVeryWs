var pcvery = {};
//ping code
pcvery.PING = '0';
//pong code
pcvery.PONG = '1';
//记录pong到ping之间的时间
pcvery.PinglongTime = 0;
//ping-pong延迟超过当前值，会调用重连
pcvery.PingErrorlongTime = 3000;
//是否能正常
pcvery.IsOpen = false;
//心跳间隔
pcvery.PingPongLongTime = 20000;
//心跳定时器
pcvery.timeout = null;
//重连间隔
pcvery.ReconnectLongTime = 2000;

//初始化----可以外部调用
pcvery.ws = function(url,param,success,message,close,pingSuccess){
	//赋值给对象，进行初始化，
	pcvery.url = url;
	pcvery.param = param;
	pcvery.success = success;
	pcvery.message = message;
	pcvery.close = close;
	pcvery.pingSuccess = pingSuccess;
}

//开始----可以外部调用
pcvery.start = function(){
	//组装url
	var newUrl = "";
	if(pcvery.param){
		newUrl =pcvery.url + "?" + pcvery.param;
	}else{
		newUrl = pcvery.url;
	}
	//连接
	pcvery.socket = new WebSocket(newUrl);
	//获取到消息
	pcvery.socket.onmessage = function (msg) {
		if(!pcvery.IsOpen){
			return false;
		}
		//是否为pong消息
		if(msg.data == pcvery.PONG){
			//计算ping-pong延迟
			var pinglongTime = new Date().getTime()-pcvery.PinglongTime;
			//还原连接初始值
			pcvery.PinglongTime = 0;
			//延迟大于临界值，关闭连接，
			if(pinglongTime > pcvery.PingErrorlongTime){
				pcvery.socket.close();
				//延迟太高，重新连接
				pcvery.IsOpen = false;
				pcvery.reconnect();
				return false;
			}else{
				//调用ping-pong成功，并传入延迟值
				if(pcvery.pingSuccess != null){
					pcvery.pingSuccess(pinglongTime);
				}
			}
			pcvery.timeout = setTimeout(pcvery.heartbeat,pcvery.PingPongLongTime);
			return false;
		}
		if(pcvery.message != null){
			pcvery.message(msg);
		}
	};
	//打开了
	pcvery.socket.onopen = function (event) {
		pcvery.IsOpen = true;
		if(pcvery.success != null){
			pcvery.success(event);
		}
		//调用心跳
		pcvery.heartbeat();
	};
	//关闭了
	pcvery.socket.onclose = function (event) {
		pcvery.IsOpen = false;
		if(pcvery.close != null){
			pcvery.close(event);
		}
		pcvery.PinglongTime = 0;
		 //调用重连
		setTimeout( pcvery.reconnect,pcvery.ReconnectLongTime);
	   
	};
	//异常，自动关闭并开始重连
	pcvery.socket.onerror = function (event) {
		pcvery.IsOpen = false;
		pcvery.PinglongTime = 0;
	}
}
//结束----可以外部调用
pcvery.stop = function(){
	pcvery.socket.close();
	pcvery.socket = null;
	pcvery.IsOpen = false;
}

//结束----可以外部调用
pcvery.send = function(msg){
	if(!pcvery.IsOpen){
		return false;
	}
	pcvery.socket.send(msg);
	return true;
}

//心跳检测----禁止外部调用
pcvery.heartbeat = function(){
	if(!pcvery.IsOpen){
		return false;
	}
	if(pcvery.PinglongTime != 0){
		//执行重连
		pcvery.socket.close();
		pcvery.reconnect();
		return false;
	}
	//执行心跳
	if(pcvery.timeout != null){
		window.clearTimeout(pcvery.timeout);
	}
	pcvery.PinglongTime = new Date().getTime();
	pcvery.socket.send(pcvery.PING);
}
//重连----禁止外部调用
pcvery.reconnect = function(){
	if(pcvery.socket != null){
		pcvery.start();
	}
}
//监听窗口关闭事件，当窗口关闭时，主动去关闭websocket连接，防止连接还没断开就关闭窗口，server端会抛异常。
window.onbeforeunload = function () {
	pcvery.socket.close();
}