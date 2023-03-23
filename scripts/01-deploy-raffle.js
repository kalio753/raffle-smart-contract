const { network } = require("hardhat")

// destructuring from hre (hardhat runtimes environment)
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()

    const args = [12]
    log("Before deploy Raffle")
    const raffle = await deploy("Raffle", {
        contract: "Raffle",
        from: deployer,
        args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })
    log("Raffle deployed successfully")
}
