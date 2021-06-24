// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Mco is ERC20 {
  constructor() ERC20("Mco", "ERC20 Mco") {}

  function faucet(address to, uint amount) external {
    _mint(to, amount);
  }
}
