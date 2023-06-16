// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/ERC677ReceiverInterface.sol";

/**
 * Mock token
 */
contract Link is ERC20 {
    // Decimals are set to 18 by default in `ERC20`
    event Transfer(address indexed from, address indexed to, uint value, bytes data);
    modifier validRecipient(address _recipient) {
        require(_recipient != address(0) && _recipient != address(this));
        _;
    }

    constructor() ERC20("Duongnd", "Link") {
        _mint(msg.sender, 1e27);
    }

    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external validRecipient(to) returns (bool success) {
        transfer(to, value);
        emit Transfer(msg.sender, to, value, data);
        if (isContract(to)) {
            contractFallback(to, value, data);
        }
        return true;
    }

    // PRIVATE

    function contractFallback(
        address _to,
        uint _value,
        bytes calldata _data
    ) private {
        ERC677ReceiverInterface receiver = ERC677ReceiverInterface(_to);
        receiver.onTokenTransfer(msg.sender, _value, _data);
    }

    function isContract(address _addr) private view returns (bool hasCode) {
        uint length;
        assembly {
            length := extcodesize(_addr)
        }
        return length > 0;
    }
}
