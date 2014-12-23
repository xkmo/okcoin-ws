require('should');
var OKCoin = require('../index.js');

describe('general', function() {
	it('should check if callback is valid on message', function() {
		var okcoin = new OKCoin('cn');
		okcoin.subscribe({
			'ok_btcusd_depth': null
		});
	});

	it('should return error with code 10015: Channel subscription temporally not available', function(done) {
		var okcoin = new OKCoin('cn');
		okcoin.subscribe({'foo_channel': function(data, error) {
			error.should.have.property('errorcode', '10015');
			done();
		}});
	});
});

describe('cn', function() {
	it('should return btccny depth', function(done) {
		var okcoin = new OKCoin('cn');
		okcoin.subscribe({
			'ok_btccny_depth': function cb(data, err) {
				if (cb.counter) return;
				cb.counter = 1;

				if (err) return done(err);
				data.should.have.property('bids');
				done();
			}
		});
	});

	it.skip('should return spot cny trade order then cancel the order and listen trades', function(done) {
		var okcoin = new OKCoin('cn', process.env.API_KEY_CN, process.env.API_SECRET_CN);
		okcoin.subscribe({
			'ok_cny_realtrades': function cb(data, err) {
				if (cb.counter) return;
				cb.counter = 1;

				if (err) return done(err);
				data.should.have.property('orderId'); // realtrades's response format is very different from other APIs
				data.should.have.property('status');
			},
			'ok_spotcny_trade': function(data, err) {
				if (err) return done(err);
				data.should.have.property('order_id');
				okcoin.cancelOrder('ltc_cny', data['order_id']);
			},
			'ok_spotcny_cancel_order': function(data, err) {
				if (err) return done(err);
				data.should.have.property('order_id');
				done();
			}
		});

		okcoin.ws.on('open', function() {
			okcoin.trade('ltc_cny', 'sell', '300', '0.1');
		});
	});
});

describe('com', function() {
	this.timeout(12000);

	describe('spot', function() {
		it('should return btcusd depth', function(done) {
			var okcoin = new OKCoin('com');
			okcoin.subscribe({
				'ok_btcusd_depth': function cb(data, err) {
					if (cb.counter) return;
					cb.counter = 1;

					if (err) return done(err);
					data.should.have.property('bids');
					done();
				}
			});
		});

		it.skip('should return spot usd trade order then cancel the order and listen trades', function(done) {
			var okcoin = new OKCoin('com', process.env.API_KEY, process.env.API_SECRET);
			okcoin.subscribe({
				'ok_usd_realtrades': function cb(data, err) {
					if (cb.counter) return;
					cb.counter = 1;

					if (err) return done(err);
					data.should.have.property('orderId'); // realtrades's response format is very different from other APIs
					data.should.have.property('status');
				},
				'ok_spotusd_trade': function(data, err) {
					if (err) return done(err);
					data.should.have.property('order_id');
					okcoin.cancelOrder('ltc_usd', data['order_id']);
				},
				'ok_spotusd_cancel_order': function(data, err) {
					if (err) return done(err);
					data.should.have.property('order_id');
					done();
				}
			});

			okcoin.ws.on('open', function() {
				okcoin.trade('ltc_usd', 'buy', '0.1', '0.1');
			});
		});
	});

	describe('future', function() {
		it('should return btcusd future depth this week', function(done) {
			var okcoin = new OKCoin('com');
			okcoin.subscribe({
				'ok_btcusd_future_depth_this_week': function cb(data, err) {
					if (cb.counter) return;
					cb.counter = 1;

					if (err) return done(err);
					data.should.have.property('bids');
					done();
				}
			});
		});

		it.skip('should return future usd trade order then cancel the order and listen trades', function(done) {
			var okcoin = new OKCoin('com', process.env.API_KEY, process.env.API_SECRET);
			okcoin.subscribe({
				// Currently (as of 12.23.2014) this API doesn't work, so its callback not called.
				// The test will timeout.
				'ok_usd_future_realtrades': function cb(data, err) {
					if (cb.counter) return;
					cb.counter = 1;

					if (err) return done(err);
					data.should.have.property('orderid');
					data.should.have.property('contract_id');
					console.log('ok_usd_future_realtrades:', data);
				},
				'ok_futuresusd_trade': function(data, err) {
					if (err) return done(err);
					data.should.have.property('order_id');
					okcoin.futureCancelOrder({
						'symbol': 'btc_usd',
						'order_id': data['order_id'],
						'contract_type': 'quarter'
					});
					console.log('ok_futuresusd_trade:', data);
				},
				'ok_futuresusd_cancel_order': function(data, err) {
					if (err) return done(err);
					data.should.have.property('order_id');
					done();
					console.log('ok_futuresusd_cancel_order:', data);
				}
			});

			okcoin.ws.on('open', function() {
				okcoin.futureTrade({
					'symbol': 'btc_usd',
					'contract_type': 'quarter',
					'price': '3000',
					'amount': '10',
					'type': '2',
					'match_price': '0',
					'lever_rate': '20'
				});
			});
		});
	});
});
