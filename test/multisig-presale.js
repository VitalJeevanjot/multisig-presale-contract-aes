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

    let required_approvals = 2
    let extend_expiry_milli = 2592000000 // 30 days

    try {
      await contract.deploy([owners, required_approvals, extend_expiry_milli])
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

    let required_approvals = 2
    let extend_expiry_milli = 2592000000 // 30 days
    await contract.deploy([owners, required_approvals, extend_expiry_milli]);

    const owners_get = await contract.methods.get_owners()
    const pack_price_get = await contract.methods.get_booster_pack_price()
    // console.log("Contract deployed address: ")
    // console.log(contract.deployInfo.result.contractId)

    // console.log("Owners are... ")
    // console.log(owners_get.decodedResult)

    const amount = 79 * 1000000000000000000

    assert.deepEqual(owners_get.decodedResult, owners);
    assert.equal(pack_price_get.decodedResult, amount)

  });

  it("OK___Reserve_Pack", async () => {
    const amount = 79 * 1000000000000000000
    const buyer = wallets[4].publicKey
    const buy_booster_packs = await contract.methods.buy_booster_packs(buyer, { amount: amount })
    assert.equal(buy_booster_packs.decodedEvents[0].name, "Deposit")
    assert.equal(buy_booster_packs.decodedEvents[0].decoded[0], buyer)
    assert.equal(buy_booster_packs.decodedEvents[0].decoded[1], amount)
  })

  it("ERR_GREATER_AMOUNT___Reserve_Pack", async () => {
    const amount = 79 * 5000000000000000000
    const buyer = wallets[4].publicKey
    try {
      const buy_booster_packs = await contract.methods.buy_booster_packs(buyer, { amount: amount })
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Sent less or more AE than the price of booster pack!"')
    }
  })

  it("ERR_LESSER_AMOUNT___Reserve_Pack", async () => {
    const amount = 79 * 5000000000000000000
    const buyer = wallets[4].publicKey
    try {
      const buy_booster_packs = await contract.methods.buy_booster_packs(buyer, { amount: amount })
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Sent less or more AE than the price of booster pack!"')
    }
  })

  it("ERR_AFTER_EXPIRY___Reserve_Pack", async () => {
    const amount = 79 * 1000000000000000000 // ok amount
    const buyer = wallets[4].publicKey
    const extend_expiry_milli = 0
    const required_approvals = 2
    const owners = [
      wallets[0].publicKey,
      wallets[1].publicKey,
      wallets[2].publicKey
    ]

    const temp_contract = await client.getContractInstance({ source, filesystem });
    await temp_contract.deploy([owners, required_approvals, extend_expiry_milli]);
    try {
      const buy_booster_packs = await temp_contract.methods.buy_booster_packs(buyer, { amount: amount })
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "The Presale is expired!"')
    }

  })

  it("ERR_AFTER_EXPIRY___Reserve_Pack", async () => {
    const amount = 79 * 1000000000000000000 // ok amount
    const buyer = wallets[4].publicKey
    const extend_expiry_milli = 0
    const required_approvals = 2
    const owners = [
      wallets[0].publicKey,
      wallets[1].publicKey,
      wallets[2].publicKey
    ]

    const temp_contract = await client.getContractInstance({ source, filesystem });
    await temp_contract.deploy([owners, required_approvals, extend_expiry_milli]);
    try {
      const buy_booster_packs = await temp_contract.methods.buy_booster_packs(buyer, { amount: amount })
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "The Presale is expired!"')
    }

  })

  it("OK___Submit_tx", async () => {
    global.receiver = wallets[4].publicKey
    global.value = 15 * 1000000000000000000
    global.data = 0x2130000000000000000000000000000000000000000000000000000000000000
    // const receiver_balance = await client.getBalance(receiver)
    // console.log(receiver_balance)
    const submit = await contract.methods.submit(receiver, value, data)
    assert.equal(submit.decodedEvents[0].name, "Submit")
    assert.equal(submit.decodedEvents[0].decoded[0], "0")

    // explicitly calling with owners defined
    global._submit = await contract.methods.submit(receiver, value, data, { onAccount: wallets[0].publicKey })
    _submit = await contract.methods.submit(receiver, value, data, { onAccount: wallets[1].publicKey })

    receiver = wallets[5].publicKey
    value = 15 * 123500000000000000000
    data = 0x2130000000000000001000000000000000000000000000000000000000000000
    _submit = await contract.methods.submit(receiver, value, data, { onAccount: wallets[2].publicKey })
    assert.equal(_submit.decodedEvents[0].name, "Submit")
    assert.equal(_submit.decodedEvents[0].decoded[0], "3")

    const transaction_detail = await contract.methods.transaction_detail(_submit.decodedEvents[0].decoded[0])
    assert.equal(transaction_detail.decodedResult.to, receiver)
    assert.equal(transaction_detail.decodedResult.value, value)
    assert.equal("0x" + Buffer.from(transaction_detail.decodedResult.data).toString('hex'), data)
  })

  it("ERR_CALLED_BY_NOT_OWNER___Submit_tx", async () => {
    try {
      await contract.methods.submit(receiver, value, data, { onAccount: wallets[3].publicKey })
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Not an owner to submit!"')
    }

    const transaction_detail = await contract.methods.transaction_detail(_submit.decodedEvents[0].decoded[0])
    assert.equal(transaction_detail.decodedResult.to, receiver)
    assert.equal(transaction_detail.decodedResult.value, value)
    assert.equal("0x" + Buffer.from(transaction_detail.decodedResult.data).toString('hex'), data)
  })

  it("OK___Approve_tx", async () => {
    const tx_id = 2
    const approve = await contract.methods.approve(tx_id, { gasPrice: 1500000000, onAccount: wallets[2].publicKey })
    assert.equal(approve.decodedEvents[0].name, "Approve")
    assert.equal(approve.decodedEvents[0].decoded[0], wallets[2].publicKey)
    assert.equal(approve.decodedEvents[0].decoded[1], tx_id)

    const approval_count = await contract.methods.provide_approval_count(tx_id)
    assert.equal(approval_count.decodedResult, 1)

  })

  it("ERR_CALLED_BY_NOT_OWNER____Approve_tx", async () => {
    const tx_id = 2
    try {
      await contract.methods.approve(tx_id, { gasPrice: 1500000000, onAccount: wallets[5].publicKey })
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "Not an owner to approve!"')
    }
  })
  it("ERR_NON_EXISTENT_TX_ID____Approve_tx", async () => {
    const tx_id = 6
    try {
      await contract.methods.approve(tx_id, { gasPrice: 1500000000, onAccount: wallets[2].publicKey })
    } catch (err) {
      assert.equal(err.message, `Invocation failed: "Tx id doesn't exist!"`)
    }
  })

});
