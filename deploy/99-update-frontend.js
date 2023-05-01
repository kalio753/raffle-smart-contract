const { ethers, network } = require("hardhat")
const fs = require("fs")

const IS_UPDATE_FRONT_END = process.env.IS_UPDATE_FRONT_END
const FRONT_END_ADDRESSES_FILE =
    "../nextjs-lottery/constant/contractAddresses.json"
const FRONT_END_ABI_FILE = "../nextjs-lottery/constant/abi.json"

module.exports = async () => {
    if (IS_UPDATE_FRONT_END) {
        console.log("Updating Front End...")
        updateContractAddresses()
        updateAbi()
    }
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")

    fs.writeFileSync(
        FRONT_END_ABI_FILE,
        raffle.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const chainId = network.config.chainId.toString()

    const currAddresses = JSON.parse(
        fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
    )

    if (chainId in currAddresses) {
        if (!currAddresses[chainId].includes(raffle.address)) {
            currAddresses[chainId].push(raffle.address)
        }
    } else {
        currAddresses[chainId] = [raffle.address]
    }

    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currAddresses))
}

module.exports.tags = ["all", "frontend"]
