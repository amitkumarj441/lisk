'use strict';

var node = require('../../../../node');
var shared = require('../../../shared');
var localShared = require('./shared');

var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../../common/apiHelpers').waitForConfirmations;

describe('POST /api/transactions (validate type 6 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = node.randomAccount();

	localShared.beforeValidationPhase(account);

	describe('registering dapp', function () {

		it('using second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = node.lisk.dapp.createDapp(account.password, account.secondPassword, node.blockDataDapp);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
					node.blockDataDapp.transactionId = transaction.id;

					return waitForConfirmations([node.blockDataDapp.transactionId]);
				});
		});
	});

	describe('inTransfer', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = node.lisk.transfer.createInTransfer(node.blockDataDapp.transactionId, 10 * node.normalizer, account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase not matching registered secondPublicKey should fail', function () {
			transaction = node.lisk.transfer.createInTransfer(node.blockDataDapp.transactionId, 10 * node.normalizer, account.password, 'wrong second password');

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Failed to verify second signature');
				badTransactions.push(transaction);
			});
		});

		it('using correct second passphrase should be ok', function () {
			transaction = node.lisk.transfer.createInTransfer(node.blockDataDapp.transactionId, 10 * node.normalizer, account.password, account.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
