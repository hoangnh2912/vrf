//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "../vrf/VRFConsumerBaseV2.sol";
import "../vrf/VRFCoordinatorV2.sol";

contract VRFConsumer is VRFConsumerBaseV2 {
    address public owner;
    address public vrfCoordinator = 0xFE5725db462CC0a4ACa15FD9317298b1a52582b5;
    uint256[] public random;
    uint256 public requestId;

    constructor() VRFConsumerBaseV2(vrfCoordinator) {
        owner = msg.sender;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override
    {
        random = randomWords;
    }

    function requestRandomness() public {
        // requestId = VRFCoordinatorV2(vrfCoordinator).requestRandomWords();
    }
}
