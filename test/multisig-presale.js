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

  // it('ERR_SAME_ADDRESSES___Deploy: Twice Owners Inserted at deploy', async () => {
  //   const owners = [
  //     wallets[0].publicKey,
  //     wallets[1].publicKey,
  //     wallets[1].publicKey
  //   ]

  //   let required_approvals = 2
  //   let extend_expiry_milli = 2592000000 // 30 days

  //   try {
  //     await contract.deploy([owners, required_approvals, extend_expiry_milli])
  //   } catch (err) {
  //     assert.equal(err.message, 'Invocation failed: "all addresses should be different."')
  //   }
  // })

  it('OK_DIFFERENT_ADDRESSES___Deploy: deploy & get owners', async () => {
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
    // console.log("Contract deployed as: ")
    // console.log(contract.deployInfo.result.contractId)

    // console.log("Owners are... ")
    // console.log(owners_get.decodedResult)

    const amount = 79 * 1000000000000000000

    assert.deepEqual(owners_get.decodedResult, owners);
    assert.equal(pack_price_get.decodedResult, amount)

  });

  it("OK_AMOUNT___Reserve_Pack", async () => {
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
});
