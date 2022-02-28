const { assert, expect } = require('chai');
const { utils, wallets } = require('@aeternity/aeproject');

const MULTISIG_PRESALE_CONTRACT_SOURCE = './contracts/multisig-presale.aes';

describe('MULTISIG_PRESALE', () => {
  let client;
  let contract;

  before(async () => {
    client = await utils.getClient();

    // a filesystem object must be passed to the compiler if the contract uses custom includes
    const filesystem = utils.getFilesystem(MULTISIG_PRESALE_CONTRACT_SOURCE);

    // get content of contract
    const source = utils.getContractContent(MULTISIG_PRESALE_CONTRACT_SOURCE);

    // initialize the contract instance
    contract = await client.getContractInstance({ source, filesystem });


    // // create a snapshot of the blockchain state
    // await utils.createSnapshot(client);
  });

  // // after each test roll back to initial state
  // afterEach(async () => {
  //   await utils.rollbackSnapshot(client);
  // });
  it('ERR_Deploy: Twice Owners Inserted at deploy', async () => {
    let owners = [
      wallets[0].publicKey,
      wallets[1].publicKey,
      wallets[1].publicKey
    ]

    let required_approvals = 2
    try {
      await contract.deploy([owners, required_approvals])
    } catch (err) {
      assert.equal(err.message, 'Invocation failed: "all addresses should be different."')
    }
  })

  it('OK_Deploy: deploy & get owners', async () => {
    let owners = [
      wallets[0].publicKey,
      wallets[1].publicKey,
      wallets[2].publicKey
    ]

    let required_approvals = 2
    await contract.deploy([owners, required_approvals]);

    const owners_get = await contract.methods.get_owners()
    console.log("Contract deployed as: ")
    console.log(contract.deployInfo.result.contractId)

    console.log("Owners are... ")
    console.log(owners_get.decodedResult)

    assert.deepEqual(owners_get.decodedResult, owners);


    // const set = await contract.methods.set(42);
    // assert.equal(set.decodedEvents[0].name, 'SetXEvent');
    // assert.equal(set.decodedEvents[0].decoded[0], wallets[0].publicKey);
    // assert.equal(set.decodedEvents[0].decoded[1], 42);

    // const { decodedResult } = await contract.methods.get();
    // assert.equal(decodedResult, 42);
  });

  // it('ExampleContract: get undefined when not set before', async () => {
  //   const { decodedResult } = await contract.methods.get();
  //   assert.equal(decodedResult, undefined);
  // });
});
