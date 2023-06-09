const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig
} = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

// Step 1: Check for network, bc only unit tests on development chains
// Step 2: Get all contracts before each test using `deployments.fixture(['tagsName'])
if (!developmentChains.includes(network.name)) {
    let raffle, raffleEntranceFee, deployer
    describe("Raffle Staging test", () => {
        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            raffle = await ethers.getContract("Raffle", deployer)
            raffleEntranceFee = await raffle.getEntranceFee()
        })

        describe("fulfillRandomWords", () => {
            it("works with live Chainlink Keeper & VRF to get a random winner", async () => {
                console.log("Setting up test...")
                const startingTimestamp = await raffle.getLatestTimeStamp()
                const accounts = await ethers.getSigners()

                // We should set up listeners before enter the raffle
                // just in case of the blockchain moving too fast
                console.log("Setting up Listener...")
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
                                winnerEndingBalance.toString(),
                                winnerStartingBalance
                                    .add(raffleEntranceFee)
                                    .toString()
                            )
                            assert(endingTimestamp > startingTimestamp)

                            resolve()
                        } catch (error) {
                            console.error(error)
                            reject(error)
                        }
                    })

                    console.log("Entering Raffle...")
                    const tx = await raffle.enterRaffle({
                        value: raffleEntranceFee
                    })
                    await tx.wait(1)
                    console.log("Ok, time to wait...")
                    const winnerStartingBalance = await accounts[0].getBalance()
                })
            })
        })
    })
} else {
    describe.skip
}
