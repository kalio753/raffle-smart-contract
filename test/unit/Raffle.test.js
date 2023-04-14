const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig
} = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

// Step 1: Check for network, bc only unit tests on development chains
// Step 2: Get all contracts before each test using `deployments.fixture(['tagsName'])

if (developmentChains.includes(network.name)) {
    describe("Unit tests on Raffle", () => {
        let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            vrfCoordinatorV2Mock = await ethers.getContract(
                "VRFCoordinatorV2Mock",
                deployer
            )
            raffleEntranceFee = await raffle.getEntranceFee()
            interval = await raffle.getInterval()
        })

        describe("constructor", () => {
            it("should initialize the contract correctly", async () => {
                // Ideally, we only use 1 assert for 1 it
                const raffleState = await raffle.getRaffleState()

                assert.equal(raffleState.toString(), "0")
                assert.equal(
                    raffleEntranceFee.toString(),
                    networkConfig[network.config.chainId]["entranceFee"]
                )
                assert.equal(
                    interval.toString(),
                    networkConfig[network.config.chainId]["interval"]
                )
            })
        })

        describe("enterRafle", () => {
            it("should revert when not sending enough ETH", async () => {
                await expect(raffle.enterRaffle()).to.be.revertedWith(
                    "Raffle__NotSentEnoughEntranceFee"
                )
            })

            it("records player when they enter", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                const playerFromContract = await raffle.getPlayer(0)
                assert.equal(playerFromContract, deployer)
            })

            it("emit event on enter raffle", async () => {
                await expect(
                    raffle.enterRaffle({ value: raffleEntranceFee })
                ).to.emit(raffle, "RaffleEnter")
            })

            it("revert when raffle state is calculating", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })

                // These 2 functions get from here: https://hardhat.org/hardhat-network/docs/reference
                await network.provider.send("evm_increaseTime", [
                    interval.toNumber() + 1
                ])
                await network.provider.send("evm_mine", [])

                // Pretend to be Chainlink Keepers
                await raffle.performUpkeep([])
                await expect(
                    raffle.enterRaffle({ value: raffleEntranceFee })
                ).to.be.revertedWith("Raffle__NotOpen")
            })
        })

        describe("checkUpkeep", () => {
            it("returns false if ppl haven't send any ETH", async () => {
                await network.provider.send("evm_increaseTime", [
                    interval.toNumber() + 1
                ])
                await network.provider.send("evm_mine", [])

                const { upkeepNeeded } = await raffle.checkUpkeep([])
                assert(!upkeepNeeded)
            })

            it("returns false if raffle haven't open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })

                await network.provider.send("evm_increaseTime", [
                    interval.toNumber() + 1
                ])
                await network.provider.send("evm_mine", [])

                await raffle.performUpkeep([])
                const raffleState = await raffle.getRaffleState()
                const { upkeepNeeded } = await raffle.checkUpkeep([])
                assert.equal(raffleState.toString(), "1")
                assert.equal(upkeepNeeded, false)
            })

            it("returns false if not enough time has passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })

                await network.provider.send("evm_increaseTime", [
                    interval.toNumber() - 5
                ])
                await network.provider.send("evm_mine", [])

                const { upkeepNeeded } = await raffle.checkUpkeep([])
                assert.equal(upkeepNeeded, false)
            })

            it("returns true if enough time, someone sended ETH, open state", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })

                await network.provider.send("evm_increaseTime", [
                    interval.toNumber() + 1
                ])
                await network.provider.send("evm_mine", [])

                const { upkeepNeeded } = await raffle.checkUpkeep([])
                assert.equal(upkeepNeeded, true)
            })
        })

        describe("performUpkeep", () => {
            it("only run when checkUpkeep is true", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })

                await network.provider.send("evm_increaseTime", [
                    interval.toNumber() + 1
                ])
                await network.provider.send("evm_mine", [])

                const tx = await raffle.performUpkeep([])

                assert(tx)
            })

            // it("revert if checkUpkeep is false", async () => {

            //     await expect(await raffle.performUpkeep([])).to.be.revertedWith(
            //         "Raffle__UpkeepNotNeeded"
            //     )
            // })

            it("updates raffle state, calls VRFCoordinator, emits event", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })

                await network.provider.send("evm_increaseTime", [
                    interval.toNumber() + 1
                ])
                await network.provider.send("evm_mine", [])

                const txResponse = await raffle.performUpkeep([])
                const txReceipt = await txResponse.wait(1)
                console.log(txReceipt.events[1].args)
                const requestId = txReceipt.events[1].args.reqId

                const raffleState = await raffle.getRaffleState()
                assert.equal(raffleState.toString(), "1")
            })
        })

        describe("fulfillRandomWords", () => {
            beforeEach(async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })

                await network.provider.send("evm_increaseTime", [
                    interval.toNumber() + 1
                ])
                await network.provider.send("evm_mine", [])
            })

            it("can only be called after performUpkeep", async () => {
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                ).to.be.revertedWith("nonexistent request")
            })

            it("picks winner, resets lottery, sends money", async () => {
                const additionalEntrants = 3
                const startingAccountIndex = 1
                const accounts = await ethers.getSigners()

                for (
                    let i = startingAccountIndex;
                    i < additionalEntrants + startingAccountIndex;
                    i++
                ) {
                    const accountConnectedRaffle = raffle.connect(accounts[i])
                    await accountConnectedRaffle.enterRaffle({
                        value: raffleEntranceFee
                    })
                }

                const startingTimestamp = await raffle.getLatestTimeStamp()

                await new Promise(async (resolve, reject) => {
                    const tx = await raffle.performUpkeep([])
                    const txReceipt = await tx.wait(1)
                    const winnerStartingBalance = await accounts[1].getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[1].args.reqId,
                        raffle.address
                    )

                    // once(): once this event is emitted, this func will run
                    raffle.once("PickedWinner", async () => {
                        console.log("Found the event")
                        try {
                            const recentWinner = await raffle.getRecentWinner()
                            console.log("Log to find who is tthe winner")
                            console.log(recentWinner)
                            console.log(accounts[0].address)
                            console.log(accounts[1].address)
                            console.log(accounts[2].address)
                            console.log(accounts[3].address)

                            const raffleState = await raffle.getRaffleState()
                            const endingTimestamp =
                                await raffle.getLatestTimeStamp()
                            const numPlayers = await raffle.getNumberOfPlayers()
                            const winnerEndingBalance =
                                await accounts[1].getBalance()

                            assert.equal(numPlayers.toString(), "0")
                            assert.equal(raffleState.toString(), "0")
                            assert(endingTimestamp > startingTimestamp)

                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance
                                    .add(
                                        raffleEntranceFee
                                            .mul(additionalEntrants)
                                            .add(raffleEntranceFee)
                                    )
                                    .toString()
                            )
                        } catch (e) {
                            reject(e)
                        }
                        resolve()
                    })
                })
            })
        })
    })
} else {
    describe.skip
}
