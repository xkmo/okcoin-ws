var WebSocket = require('ws');
var md5 = require('MD5');

function OKCoin(site, key, secret, channels) {
	this.site = site;
	this.key = key;
	this.secret = secret;

	if (channels) {
		this.subscribe(channels);
	}
}

/* Private methods */
OKCoin.prototype._send = function(channel, params) {
	params = params ? params : {};
	params['api_key'] = this.key;
	params['sign'] = sign(params, this.secret);

	var data = {'event':'addChannel','channel':channel,'parameters':params};
	this.ws.send(JSON.stringify(data));
}

OKCoin.prototype.subscribe = function(channels) {
	var that = this;

	var socketURL = this.site === 'com' ? 'wss://real.okcoin.com:10440/websocket/okcoinapi' : 'wss://real.okcoin.cn:10440/websocket/okcoinapi';
	var ws = new WebSocket(socketURL);
	this.ws = ws;

	ws.on('open', function() {
		var data = [];
		Object.keys(channels).forEach(function(name) {
			switch (name) {
			case 'ok_spotusd_trade':
			case 'ok_spotusd_cancel_order':
			case 'ok_spotcny_trade':
			case 'ok_spotcny_cancel_order':
				// no need to subscribe one-time action channel, but need provide callback.
				break;
			case 'ok_usd_realtrades':
			case 'ok_cny_realtrades':
				that._send(name);
				break;
			default:
				data.push({'event': 'addChannel','channel': name});
			}
		});

		ws.send(JSON.stringify(data));
	});

	ws.on('message', function(data) {
		var messages = JSON.parse(data);
		messages.forEach(function(message) {
			var callback = channels[message['channel']];
			if (message['errorcode']) {
				message['errormessage'] = errorMessage(message['errorcode']);
				callback(null, message);
			}
			else if (message['data']) {
				callback(message['data']);
			}
		});
	});
}

/* Authorized methods */
OKCoin.prototype.trade = function(symbol, type, price, amount) {
	var params = {'symbol': symbol, 'type': type, 'price': price, 'amount': amount};
	var channel = this.site === 'com' ? 'ok_spotusd_trade' : 'ok_spotcny_trade';
	this._send(channel, params);
}

OKCoin.prototype.cancelOrder = function(symbol, orderId) {
	var params = {'symbol': symbol, 'order_id': orderId};
	var channel = this.site === 'com' ? 'ok_spotusd_cancel_order' : 'ok_spotcny_cancel_order';
	this._send(channel, params);
}

function sign(params, secret) {
	return md5(stringifyToOKCoinFormat(params) + '&secret_key='+ secret).toUpperCase();
}

/* snippet from OKCoin-API project */
function stringifyToOKCoinFormat(obj) {
	var arr = [],
	i,
	formattedObject = '';

	for (i in obj) {
		if (obj.hasOwnProperty(i)) {
			arr.push(i);
		}
	}
	arr.sort();
	for (i = 0; i < arr.length; i++) {
		if (i != 0) {
			formattedObject += '&';
		}
		formattedObject += arr[i] + '=' + obj[arr[i]];
	}
	return formattedObject;
}

function errorMessage(code) {
	var codes = {
		10001: 'Illegal parameters',
		10002: 'Authentication failure',
		10003: 'This connection has requested other user data',
		10004: 'This connection did not request this user data',
		10005: 'System error',
		10009: 'Order does not exist',
		10010: 'Insufficient funds',
		10011: 'Order quantity too low',
		10012: 'Only support btc_usd ltc_usd',
		10014: 'Order price must be between 0 - 1,000,000',
		10015: 'Channel subscription temporally not available',
		10016: 'Insufficient coins',
		10017: 'WebSocket authorization error',
		10100: 'user frozen',
		10216: 'non-public API',
		20001: 'user does not exist',
		20002: 'user frozen',
		20003: 'frozen due to force liquidation',
		20004: 'future account frozen',
		20005: 'user future account does not exist',
		20006: 'required field can not be null',
		20007: 'illegal parameter',
		20008: 'future account fund balance is zero',
		20009: 'future contract status error',
		20010: 'risk rate information does not exist',
		20011: 'risk rate bigger than 90% before opening position',
		20012: 'risk rate bigger than 90% after opening position',
		20013: 'temporally no counter party price',
		20014: 'system error',
		20015: 'order does not exist',
		20016: 'liquidation quantity bigger than holding',
		20017: 'not authorized/illegal order ID',
		20018: 'order price higher than 105% or lower than 95% of the price of last minute',
		20019: 'IP restrained to access the resource',
		20020: 'secret key does not exist',
		20021: 'index information does not exist',
		20022: 'wrong API interface',
		20023: 'fixed margin user',
		20024: 'signature does not match',
		20025: 'leverage rate error'
	}
	if (!codes[code]) {
		return 'OKCoin error code: ' + code + 'is not supported';
	}

	return codes[code];
}

module.exports = OKCoin;
