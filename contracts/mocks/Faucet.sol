// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../interfaces/LinkTokenInterface.sol";
contract Faucet{
    uint256 constant NATIVE = 1e19;
    uint256 constant LINK = 5e19;
    uint256 public treasury;
    address linkAddr;
    constructor(address link) payable {
        // REQUIRE MIN 200 ETHER IN treasury
        require(msg.value >= 10*NATIVE, "Not enough");
        treasury = msg.value;
        linkAddr = link;
    }
    function loot() external {
        treasury -= NATIVE;
        payable(msg.sender).transfer(NATIVE);
        LinkTokenInterface(linkAddr).transfer(msg.sender,LINK);
    }
}