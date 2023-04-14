const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

// Step 1: Check for network, bc only unit tests on development chains
// Step 2: Get all contracts before each test using `deployments.fixture(['tagsName'])
if (!developmentChains.includes(network.name)) {
    describe("Unit tests on Raffle", () => {
        let raffle, raffleEntranceFee, deployer

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            raffle = await ethers.getContract("Raffle", deployer)
            raffleEntranceFee = await raffle.getEntranceFee()
        })
    })

    describe("fulfillRandomWords", () => {
        it("works with live Chainlink Keeper & VRF to get a random winner", async () => {
            const startingTimestamp = await raffle.getLatestTimeStamp()
            const accounts = await ethers.getSigners()

            // We should set up listeners before enter the raffle
            // just in case of the blockchain moving too fast
            await new Promise(async (resolve, reject) => {
                raffle.once("PickedWinner", async () => {
                    console.log("Picked Winner event fired")

                    try {
                        const recentWinner = await raffle.getRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const winnerEndingBalance =
                            await accounts[0].getBalance()
                        const endingTimestamp =
                            await raffle.getLatestTimeStamp()

                        await expect(raffle.getPlayer(0)).to.be.reverted
                        assert.equal(
                            recentWinner.toString(),
                            accounts[0].address
                        )
                        assert.equal(raffleState, 0)
                        assert.equal(
                            winnerStartingBalance
                                .add(raffleEntranceFee)
                                .toString(),
                            winnerEndingBalance.toString()
                        )
                        assert(endingTimestamp > startingTimestamp)

                        resolve()
                    } catch (error) {
                        console.error(error)
                        reject(error)
                    }
                })

                await raffle.enterRaffle({ value: raffleEntranceFee })
                const winnerStartingBalance = await accounts[0].getBalance()
            })
        })
    })
} else {
    describe.skip
}
