// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract Wallet {
  mapping(address => bool) isApprover;
  address[] public approvers;

  uint public quorum;
  bytes32 constant NATIVE = 'ETH';

  struct Token {
    bytes32 tokenSymbol;
    address tokenAddress;
  }

  struct Transfer {
    uint id;
    Token token;
    uint amount;
    address payable to;
    uint approvals;
    bool sent;
  }

  Transfer[] public transfers;

  mapping(address => bytes32) tokenAddressToSymbol;
  Token[] public tokens;

  mapping(address => mapping(uint => bool)) public approvals;
  
  constructor(address[] memory _approvers, uint _quorum) {
    quorum = _quorum;
    approvers = _approvers;

    for (uint i = 0; i < _approvers.length; i++) {
      isApprover[_approvers[i]] = true;
    }

    tokens.push(Token(NATIVE, address(0)));
    tokenAddressToSymbol[address(0)] = NATIVE;
  }

  function getTokens() external view returns(Token[] memory) {
    return tokens;
  }

  function getApprovers() external view returns(address[] memory) {
    return approvers;
  }
  
  function getTransfers() external view returns(Transfer[] memory) {
    return transfers;
  }

  function addToken(bytes32 tokenSymbol, address tokenAddress) external onlyApprover() {
    require(tokenAddress != address(0), 'zero adress is forbidden');
    tokens.push(Token(tokenSymbol, tokenAddress));
    tokenAddressToSymbol[tokenAddress] = tokenSymbol;
  }

  function createTransfer(uint amount,  address payable to, Token memory token)
    external onlyApprover() isTokenSupported(token) {
    transfers.push(Transfer(
      transfers.length,
      token,
      amount,
      to,
      0,
      false
    ));
  }
  
  function approveTransfer(uint id) external onlyApprover() {
    require(transfers[id].sent == false, 'transfer has already been sent');
    require(approvals[msg.sender][id] == false, 'cannot approve transfer twice');
    
    approvals[msg.sender][id] = true;
    transfers[id].approvals++;
    
    // When the number of approvals reaches the quorum,
    // attempt to make the transfer
    if(transfers[id].approvals >= quorum) {
      transfers[id].sent = true;
      address payable to = transfers[id].to;
      uint amount = transfers[id].amount;

      // ERC20
      if (transfers[id].token.tokenAddress != address(0)) {
        IERC20(transfers[id].token.tokenAddress).transfer(
          to,
          amount
        );
      } else if (transfers[id].token.tokenSymbol == NATIVE) {
        to.transfer(amount);
      } else {
        // Should never happen, as the token is unidentified
        assert(true);
      }
    }
  }
  
  receive() external payable {}
  
  modifier onlyApprover() {
    require(isApprover[msg.sender] == true, 'only approver allowed');
    _;
  }

  modifier isTokenSupported(Token memory token) {
    require(tokenAddressToSymbol[token.tokenAddress] == token.tokenSymbol, 'token not supported');
    _;
  }
}
