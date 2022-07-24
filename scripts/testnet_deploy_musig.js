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

  // const owners_arr = [
  //   process.env.TESTNET_PUBLIC_KEY,
  //   process.env.TESTNET_PUBLIC_KEY_2,
  //   process.env.TESTNET_PUBLIC_KEY_3
  // ]
  const owners_arr = [
    "ak_62MPUPpxWox6fSNt2gZMMyhnLpczhi6nS3UcQG4PMaMQrekA4",
    "ak_2L2B8FG9y8drTYq8mV2FmZB6Revx1C8GYyieb8WTVnCmS44ajW",
    "ak_KhTZobdWMhs22uJeEpFomdyjvcxuggiJuPxCQsbt1t7BpuFas"
  ]

  const ratio = [15, 50, 100]

  const required_approvals = 2
  const extend_expiry_milli = 2592000000 // 30 days

  const max_available = 2000

  const per_user_available = 500



  const tx = await musig_presale_Instance.deploy([owners_arr, ratio, required_approvals, extend_expiry_milli, max_available, per_user_available])

  console.log(tx)
}

init()