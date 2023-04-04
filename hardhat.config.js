require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
// const LOCAL_RPC_URL = process.env.LOCAL_RPC_URL
const COINMARKETCAP_API = process.env.COINMARKETCAP_API

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.8",
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfimations: 1
        },
        goerli: {
            chainId: 5,
            blockConfimations: 6,
            url: GOERLI_RPC_URL,
            accounts: [GOERLI_PRIVATE_KEY]
        }
    },
    namedAccounts: {
        deployer: {
            default: 0
        },
        player: {
            default: 1
        }
    }
}
