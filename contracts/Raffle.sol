/* Function TODO:  
  _Participate to the lottery pool
  _Pick a random winner from the pool
  _Winner to be selected automatically after X times
  _Randomness (Chainlink Oracle) ; Automated Execution (Chainlink Keeper)
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

error Raffle__NotSentEnoughEntranceFee();
error Raffle__NotOpen();
error Raffle__FailedToRewardWinner();
error Raffle__UpkeepNotNeeded(
    uint256 currBalance,
    uint256 playersLength,
    uint256 raffleState
);

/**
 * @title Auto Random Raffle Smart Contract
 * @author Kalio753
 * @notice This contract create a automatic random decetralized lottery for players to join
 * @dev Implement Chainlink VRF & Chainlink Keepers
 */

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    // Type
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    // This will assign OPEN as 0; CALCULATING as 1

    // State variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;

    //      Lottery variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    //      VRF variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Events
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed reqId);
    event PickedWinner(address indexed winner);

    // Functions
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_entranceFee = entranceFee;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN; // RaffleState.OPEN == RaffleState(0)
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotSentEnoughEntranceFee();
        }

        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }

        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is fuction of Chainlink Keeper to check when to reload scripts
     * When to update :
     * 1. It's time (check time pass if greater than interval passed in)
     * 2. Have at least 1 player & some ETH in the Lottery
     * 3. Subscription should have some LINK (The service online)
     * 4. The state of lotter should be 'open'
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isTimePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        bool isOpen = s_raffleState == RaffleState.OPEN;

        upkeepNeeded = isTimePassed && hasPlayers && hasBalance && isOpen;
        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        s_raffleState = RaffleState.CALCULATING;
        uint256 reqId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, // gas lane (total WEI to consume base on different network)
            i_subscriptionId, // contract on chain which handle the calculation for the randomness
            REQUEST_CONFIRMATIONS, // How many blocks u want to wait on Chainlink node to response
            i_callbackGasLimit, // How much gas until it revert
            NUM_WORDS // How many random numbers you want to take
        );

        emit RequestedRaffleWinner(reqId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable winner = s_players[indexOfWinner];
        s_recentWinner = winner;
        (bool success, ) = winner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__FailedToRewardWinner();
        }
        emit PickedWinner(winner);

        // Reset lottery
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
    }

    // Pure / view functions
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    // If not reading data from the storage, we can use pure
    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
