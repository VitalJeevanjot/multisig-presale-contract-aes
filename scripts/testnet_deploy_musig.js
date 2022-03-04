const { Universal, MemoryAccount, Node } = require('@aeternity/aepp-sdk');

require('dotenv').config()



var fs = require('fs');

async function init () {
  const node = await Node({
    url: 'https://testnet.aeternity.io' // ideally host your own node
  })
  const account = MemoryAccount({
    // provide a valid keypair with your secretKey and publicKey
    keypair: { secretKey: process.env.TESTNET_SECRET_KEY, publicKey: process.env.TESTNET_PUBLIC_KEY }
  })


  const client = await Universal({
    nodes: [
      { name: 'testnet', instance: node }
    ],
    compilerUrl: 'https://compiler.aepps.com', // ideally host your own compiler
    accounts: [account]
  })

  const CONTRACT_SOURCE = fs.readFileSync('../contracts/multisig-presale.aes').toString()

  const musig_presale_Instance = await client.contractCompile(CONTRACT_SOURCE);

  const owners_arr = [
    process.env.TESTNET_PUBLIC_KEY,
    process.env.TESTNET_PUBLIC_KEY_2
  ]

  const reqiored_approvals = 2
  const extend_expiry_milli = 2592000000 // 30 days

  const max_available = 200

  const per_user_available = 5


  const tx = await musig_presale_Instance.deploy([owners_arr, reqiored_approvals, extend_expiry_milli, max_available, per_user_available])

  console.log(tx)
}

init()