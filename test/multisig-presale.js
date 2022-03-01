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

  });

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

  });
});
