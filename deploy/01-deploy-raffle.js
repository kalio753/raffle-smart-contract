const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEthers("2")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // Defining arguments for the contract constructor
    let vrfCoordinatorV2Address
    let subscriptionId
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock"
        )
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        const txResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txResceipt = txResponse.wait(1)
        subscriptionId = txResceipt.events[0].args.subId

        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        )
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFees = networkConfig[chainId]["entranceFee"]

    const gasLane = networkConfig[chainId]["gasLane"]

    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]

    const interval = networkConfig[chainId]["interval"]

    const args = [
        vrfCoordinatorV2Address,
        entranceFees,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval
    ]

    const raffle = await deploy("raffle", {
        from: deployer,
        args,
        waitConfirmations: network.config.blockConfirmations || 1,
        log: true
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifiying...")
        await verify(raffle.address, args)
    }
}

module.exports.tags = ["all", "raffle"]
