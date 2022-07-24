const { assert, expect } = require('chai');
const { utils, wallets } = require('@aeternity/aeproject');

const MULTISIG_PRESALE_CONTRACT_SOURCE = './contracts/multisig-presale.aes';

describe('MULTISIG_PRESALE', () => {
  let client;
  let contract;

  before(async () => {
    client = await utils.getClient();

    // a filesystem object must be passed to the compiler if the contract uses custom includes
    global.filesystem = utils.getFilesystem(MULTISIG_PRESALE_CONTRACT_SOURCE);

    // get content of contract
    global.source = utils.getContractContent(MULTISIG_PRESALE_CONTRACT_SOURCE);

    // initialize the contract instance
    contract = await client.getContractInstance({ source, filesystem });

  });

  it('ERR_SAME_ADDRESSES___Deploy: Twice Owners Inserted at deploy', async () => {
    const owners = [
      wallets[0].publicKey,
      wallets[1].publicKey,
      wallets[1].publicKey
    ]

    const required_approvals = 2
    const extend_expiry_milli = 2592000000 // 30 days
    const max_available = 200
    const per_user_available = 5

    const ratio = [15, 50, 100]

    try {
      const _o = await contract.deploy([owners, ratio, required_approvals, extend_expiry_milli, max_available, per_user_available])
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "all addresses should be different."')
    }
  })

  it('OK___Deploy: deploy & get owners', async () => {
    const owners = [
      wallets[0].publicKey,
      wallets[1].publicKey,
      wallets[2].publicKey
    ]

    const required_approvals = 2
    const extend_expiry_milli = 2592000000 // 30 days
    const max_available = 200

    const amount = 79 * 1000000000000000
    const per_user_available = 5

    const ratio = [15, 50, 100]


    await contract.deploy([owners, ratio, required_approvals, extend_expiry_milli, max_available, per_user_available])

    const owners_get = await contract.methods.get_owners()
    const pack_price_get = await contract.methods.get_booster_pack_price()


    assert.deepEqual(owners_get.decodedResult, owners);
    assert.equal(pack_price_get.decodedResult, amount)

  });

  it("OK___Reserve_Pack", async () => {
    const amount = 79 * 1000000000000000
    const buyer = wallets[4].publicKey

    let balance = (amount / 100) * 15
    let balance_2 = ((amount - balance) / 100) * 50
    let balance_3 = balance_2


    let wallet_1_old = await client.getBalance(wallets[0].publicKey)
    let wallet_2_old = await client.getBalance(wallets[1].publicKey)
    let wallet_3_old = await client.getBalance(wallets[2].publicKey)


    // buy booster pack
    const buy_booster_packs = await contract.methods.buy_booster_packs(buyer, { amount: amount, gas: 100000, onAccount: wallets[4].publicKey })


    assert.equal(buy_booster_packs.decodedEvents[0].name, "Deposit")
    assert.equal(buy_booster_packs.decodedEvents[0].decoded[0], buyer)
    assert.equal(buy_booster_packs.decodedEvents[0].decoded[1], amount)

    let wallet_1_new = await client.getBalance(wallets[0].publicKey)
    let wallet_2_new = await client.getBalance(wallets[1].publicKey)
    let wallet_3_new = await client.getBalance(wallets[2].publicKey)


    assert.equal(BigInt(wallet_1_old) + BigInt(balance), wallet_1_new)
    assert.equal(BigInt(wallet_2_old) + BigInt(balance_2), wallet_2_new)
    assert.equal(BigInt(wallet_3_old) + BigInt(balance_3), wallet_3_new)

  })

  it("ERR_GREATER_AMOUNT___Reserve_Pack", async () => {
    const amount = 79 * 5000000000000000000
    const buyer = wallets[4].publicKey
    try {
      const _o = await contract.methods.buy_booster_packs(buyer, { amount: amount, gas: 100000 })
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Sent less or more AE than the price of booster pack!"')
    }
  })

  it("ERR_LESSER_AMOUNT___Reserve_Pack", async () => {
    const amount = 79 * 5000000000000000000
    const buyer = wallets[4].publicKey
    try {
      const _o = await contract.methods.buy_booster_packs(buyer, { amount: amount, gas: 100000 })
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Sent less or more AE than the price of booster pack!"')
    }
  })

  it("ERR_AFTER_EXPIRY___Reserve_Pack", async () => {
    const amount = 79 * 1000000000000000 // ok amount
    const buyer = wallets[4].publicKey
    const extend_expiry_milli = 0
    const required_approvals = 2
    const owners = [
      wallets[0].publicKey,
      wallets[1].publicKey,
      wallets[2].publicKey
    ]

    const max_available = 200
    const per_user_available = 5 * amount

    const ratio = [15, 50, 100]

    const temp_contract = await client.getContractInstance({ source, filesystem });
    await temp_contract.deploy([owners, ratio, required_approvals, extend_expiry_milli, max_available, per_user_available]);
    try {
      const _o = await temp_contract.methods.buy_booster_packs(buyer, { amount: amount, gas: 100000 })
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "The Presale is expired!"')
    }

  })


  it("ERR_AFTER_ALL_ARE_RESERVERED___Reserve_Pack", async () => {
    const amount = 79 * 1000000000000000 // ok amount
    const buyer = wallets[4].publicKey
    const extend_expiry_milli = 2592000000 // ok extend time
    const required_approvals = 2
    const owners = [
      wallets[0].publicKey,
      wallets[1].publicKey,
      wallets[2].publicKey
    ]

    const max_available = 1
    const per_user_available = 5 * amount

    const ratio = [15, 50, 100]

    const temp_contract = await client.getContractInstance({ source, filesystem });
    await temp_contract.deploy([owners, ratio, required_approvals, extend_expiry_milli, max_available, per_user_available]);

    const o = await temp_contract.methods.total_bought()
    const o_ = await temp_contract.methods.total_available_packs()
    assert.equal(o.decodedResult, parseInt(o_.decodedResult) - 1)

    const _o_ = await temp_contract.methods.buy_booster_packs(buyer, { amount: amount, gas: 100000 })
    const __o_ = await temp_contract.methods.total_available_packs()
    const __o__ = await temp_contract.methods.total_bought()
    assert.equal(_o_.decodedEvents[0].name, "Deposit")
    assert.equal(_o_.decodedEvents[0].decoded[0], buyer)
    assert.equal(_o_.decodedEvents[0].decoded[1], amount)
    assert.equal(__o_.decodedResult, __o__.decodedResult)
    try {
      const _o = await temp_contract.methods.buy_booster_packs(buyer, { amount: amount, gas: 100000 })
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Out of reservation period packs!"')
    }

  })

  it("ERR_BUYING_MORE_THAN_AVAILABLE_PER_USER___Reserve_Pack", async () => {
    const amount = 79 * 1000000000000000
    const buyer = wallets[6].publicKey
    let index = null
    for (index = 0; index < 5; index++) {
      const _o = await contract.methods.buy_booster_packs(buyer, { amount: amount, onAccount: buyer, gas: 100000 })
      assert.equal(_o.decodedEvents[0].name, "Deposit")
      assert.equal(_o.decodedEvents[0].decoded[0], buyer)
      assert.equal(_o.decodedEvents[0].decoded[1], amount)
    }
    assert.equal(index, 5)

    const _o_ = await contract.methods.how_many_user_bought(buyer)
    assert.equal(_o_.decodedResult, 5)
    try {
      const _o = await contract.methods.buy_booster_packs(buyer, { amount: amount, onAccount: buyer, gas: 100000 })
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "You cannot perform more reservations!"')
    }
  })

  it("OK___Submit_tx", async () => {
    global.receiver = wallets[4].publicKey
    global.value = 15 * 1000000000000000
    global.data = 0x2130000000000000000000000000000000000000000000000000000000000000
    global.before_receiver_balance = await client.getBalance(receiver)
    // console.log(before_receiver_balance)
    const submit = await contract.methods.submit(receiver, value, data)
    assert.equal(submit.decodedEvents[0].name, "Submit")
    assert.equal(submit.decodedEvents[0].decoded[0], "0")

    // explicitly calling with owners defined
    global._submit = await contract.methods.submit(receiver, value, data, { onAccount: wallets[0].publicKey })
    _submit = await contract.methods.submit(receiver, value, data, { onAccount: wallets[1].publicKey })

    data = 0x213000000000000000100000000000000000000000000000000000000000000
    _submit = await contract.methods.submit(receiver, value, data, { onAccount: wallets[2].publicKey })
    assert.equal(_submit.decodedEvents[0].name, "Submit")
    assert.equal(_submit.decodedEvents[0].decoded[0], "3")

    const transaction_detail = await contract.methods.transaction_detail(_submit.decodedEvents[0].decoded[0])
    assert.equal(transaction_detail.decodedResult.to, receiver)
    assert.equal(transaction_detail.decodedResult.value, value)
    assert.equal("0x" + Buffer.from(transaction_detail.decodedResult.data).toString('hex'), data)

    const tx_detail = await contract.methods.transaction_detail(_submit.decodedEvents[0].decoded[0])
    assert.equal(tx_detail.decodedResult.executed, false)
  })

  it("ERR_CALLED_BY_NOT_OWNER___Submit_tx", async () => {
    try {
      const _o = await contract.methods.submit(receiver, value, data, { onAccount: wallets[3].publicKey })
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Not an owner to submit!"')
    }

    const transaction_detail = await contract.methods.transaction_detail(_submit.decodedEvents[0].decoded[0])
    assert.equal(transaction_detail.decodedResult.to, receiver)
    assert.equal(transaction_detail.decodedResult.value, value)
    assert.equal("0x" + Buffer.from(transaction_detail.decodedResult.data).toString('hex'), data)
  })

  it("OK___Approve_tx", async () => {
    const tx_id = 3
    const approve = await contract.methods.approve(tx_id, { gas: 100000, onAccount: wallets[1].publicKey })
    // approve one more time from another wallet....
    await contract.methods.approve(tx_id, { gas: 1000000, onAccount: wallets[0].publicKey })

    assert.equal(approve.decodedEvents[0].name, "Approve")
    assert.equal(approve.decodedEvents[0].decoded[0], wallets[1].publicKey)
    assert.equal(approve.decodedEvents[0].decoded[1], tx_id)

    const approval_count = await contract.methods.provide_approval_count(tx_id)
    assert.equal(approval_count.decodedResult, 2)

    const tx_detail = await contract.methods.transaction_detail(tx_id)
    assert.equal(tx_detail.decodedResult.executed, false)

  })

  it("ERR_CALLED_BY_NOT_OWNER____Approve_tx", async () => {
    const tx_id = 3
    try {
      const _o = await contract.methods.approve(tx_id, { gasPrice: 1500000000, onAccount: wallets[5].publicKey })
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Not an owner to approve!"')
    }
  })

  it("ERR_NON_EXISTENT_TX_ID____Approve_tx", async () => {
    const tx_id = 6
    try {
      const _o = await contract.methods.approve(tx_id, { gasPrice: 1500000000, onAccount: wallets[2].publicKey })
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, `Invocation failed: "Tx id doesn't exist!"`)
    }
  })

  it("ERR_ALREADY_APPROVED_TX_ID____Approve_tx", async () => {

    const tx_id = 3
    try {
      const _o = await contract.methods.approve(tx_id, { gasPrice: 1500000000, onAccount: wallets[1].publicKey })
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, `Invocation failed: "Already approved tx id!"`)
    }
  })

  // before execution send dummy amount because the amount is already transfered before when one bought the packet.
  it('OK___Send_test_value', async () => {
    const val = 15 * 1000000000000000
    const execute = await contract.methods.sendTestValue({ amount: val })
    assert.equal(execute.decodedResult, val)
  })


  it("OK___Execute_tx", async () => {
    const tx_id = 3
    const execute = await contract.methods.execute(tx_id, { gas: 200000 })
    assert.equal(execute.decodedEvents[0].name, "Execute")
    assert.equal(execute.decodedEvents[0].decoded[0], tx_id)

    global.executed_receiver_balance = await client.getBalance(receiver)
    const now_value = BigInt(before_receiver_balance) + BigInt(value)
    assert.equal(executed_receiver_balance, now_value)

    const tx_detail = await contract.methods.transaction_detail(tx_id)
    assert.equal(tx_detail.decodedResult.executed, true)

  })

  it("ERR_NON_EXISTENT_TX_ID___Execute_tx", async () => {
    const tx_id = 8
    try {
      const _o = await contract.methods.execute(tx_id)
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, `Invocation failed: "Tx id doesn't exist!"`)
    }
  })

  it("ERR_ALREADY_EXECUTED_TX_ID___Execute_tx", async () => {
    const tx_id = 3
    try {
      const _o = await contract.methods.execute(tx_id)
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, `Invocation failed: "Already executed tx id!"`)
    }
  })

  it("ERR_LESS_APPROVALS_ON_TX_ID___Execute_tx", async () => {
    const tx_id = 2 // tx 2 is not approved by anyone above!
    try {
      let _o = await contract.methods.approve(tx_id, { gas: 100000, onAccount: wallets[0].publicKey })
      _o = await contract.methods.execute(tx_id)
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, `Invocation failed: "approvals < required"`)
    }
  })

  it("ERR_ALREADY_EXECUTED_TX_TO_APPROVE___approve_tx", async () => {
    const executed_tx_id = 3
    try {
      const _o = await contract.methods.approve(executed_tx_id, { gas: 100000, onAccount: wallets[2].publicKey })
      console.log(_o)
    }
    catch (err) {
      assert.equal(err.message, `Invocation failed: "Already executed tx id!"`)
    }
  })

  it("OK___revoke_tx", async () => {
    const tx_id = 2 // already approved once in "ERR_LESS_APPROVALS_ON_TX_ID___Execute_tx" test
    const approve = await contract.methods.approve(tx_id, { gas: 100000, onAccount: wallets[1].publicKey })
    const _approve = await contract.methods.approve(tx_id, { gas: 100000, onAccount: wallets[2].publicKey })

    assert.equal(approve.decodedEvents[0].name, "Approve")
    assert.equal(approve.decodedEvents[0].decoded[0], wallets[1].publicKey)
    assert.equal(approve.decodedEvents[0].decoded[1], tx_id)

    assert.equal(_approve.decodedEvents[0].name, "Approve")
    assert.equal(_approve.decodedEvents[0].decoded[0], wallets[2].publicKey)
    assert.equal(_approve.decodedEvents[0].decoded[1], tx_id)

    const approval_count = await contract.methods.provide_approval_count(tx_id)
    assert.equal(approval_count.decodedResult, 3)


    const revoke = await contract.methods.revoke(tx_id, { onAccount: wallets[0].publicKey })
    assert.equal(revoke.decodedEvents[0].name, "Revoke")
    assert.equal(revoke.decodedEvents[0].decoded[0], wallets[0].publicKey)
    assert.equal(revoke.decodedEvents[0].decoded[1], tx_id)

    const _revoke = await contract.methods.revoke(tx_id, { onAccount: wallets[1].publicKey })
    assert.equal(_revoke.decodedEvents[0].name, "Revoke")
    assert.equal(_revoke.decodedEvents[0].decoded[0], wallets[1].publicKey)
    assert.equal(_revoke.decodedEvents[0].decoded[1], tx_id)

    const approval_count_now = await contract.methods.provide_approval_count(tx_id)
    assert.equal(approval_count_now.decodedResult, 1)

  })

  it("ERR_APPROVAL_REVOKED_ON_TX_ID___Execute_tx", async () => {
    const tx_id = 2 // tx 2 is revoked by wallet 0 & 1 above in "OK___revoke_tx" test (total 1 approval now)!
    try {
      const _o = await contract.methods.execute(tx_id)
      console.log(_o)
    } catch (err) {
      assert.equal(err.message, `Invocation failed: "approvals < required"`)
    }
  })

  // before execution send dummy amount because the amount is already transfered before when one bought the packet.
  it('OK___Send_test_value', async () => {
    const val = 15 * 1000000000000000
    const execute = await contract.methods.sendTestValue({ amount: val })
    assert.equal(execute.decodedResult, val)
  })

  it("OK_APPROVED_EXECUTE_AGAIN___Approve_Execute_tx", async () => {
    const tx_id = 2 // Approved by wallet 1 (to be here again) & 2. Now to perform & test both operations...
    const _approval_status_now = await contract.methods.approval_status(tx_id, { gas: 150000 })
    assert.equal(_approval_status_now.decodedResult.get(wallets[0].publicKey), false)
    assert.equal(_approval_status_now.decodedResult.get(wallets[1].publicKey), false)
    assert.equal(_approval_status_now.decodedResult.get(wallets[2].publicKey), true)

    const approve = await contract.methods.approve(tx_id, { gas: 150000, gasPrice: 3500000000, onAccount: wallets[1].publicKey })

    assert.equal(approve.decodedEvents[0].name, "Approve")
    assert.equal(approve.decodedEvents[0].decoded[0], wallets[1].publicKey)
    assert.equal(approve.decodedEvents[0].decoded[1], tx_id)

    const approval_count_now = await contract.methods.provide_approval_count(tx_id, { gas: 150000 })
    assert.equal(approval_count_now.decodedResult, 2)

    const approval_status_now = await contract.methods.approval_status(tx_id, { gas: 150000 })
    assert.equal(approval_status_now.decodedResult.get(wallets[0].publicKey), false)
    assert.equal(approval_status_now.decodedResult.get(wallets[1].publicKey), true)
    assert.equal(approval_status_now.decodedResult.get(wallets[2].publicKey), true)


    global.before_receiver_balance = await client.getBalance(receiver)

    const execute = await contract.methods.execute(tx_id, { gas: 150000 })
    assert.equal(execute.decodedEvents[0].name, "Execute")
    assert.equal(execute.decodedEvents[0].decoded[0], tx_id)

    executed_receiver_balance = await client.getBalance(receiver)
    const now_value = BigInt(before_receiver_balance) + BigInt(value)
    assert.equal(executed_receiver_balance, now_value)

    const tx_detail = await contract.methods.transaction_detail(tx_id, { gas: 150000 })
    assert.equal(tx_detail.decodedResult.executed, true)

  })

});

// Owners at testnet
// [ak_KhTZobdWMhs22uJeEpFomdyjvcxuggiJuPxCQsbt1t7BpuFas, ak_5gqPA5Ax5L3F6keczJH3ghp8N1fLAAZgacgyFvJGnPXwazUPE, ak_bZi6o6RuMvj2JnweDAQRvnKMrJaz3BTJAVBMayBu9iijcgrhR]
// [["ak_KhTZobdWMhs22uJeEpFomdyjvcxuggiJuPxCQsbt1t7BpuFas"], ["ak_5gqPA5Ax5L3F6keczJH3ghp8N1fLAAZgacgyFvJGnPXwazUPE"], ["ak_bZi6o6RuMvj2JnweDAQRvnKMrJaz3BTJAVBMayBu9iijcgrhR"]]
