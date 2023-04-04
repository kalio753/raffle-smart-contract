const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25")
const GAS_PRICE_LINK = 1e9
// GAS_PRICE_LINK (link per gas): Calculate base on the gas price of the chain
// ETH price skyrocketed ==> gas price skyrocketed
// Chainlink nodes pay the gas fees to give us the randomness & do external execution

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    if (developmentChains.includes(network.name)) {
        log("Local network detected: " + network.name)
        const args = [BASE_FEE, GAS_PRICE_LINK]

        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args,
            log: true,
            deterministicDeployment: false
        })

        log("Mock deployed!")
        log("______________________________________")
    }
}

module.exports.tags = ["all", "mocks"]
