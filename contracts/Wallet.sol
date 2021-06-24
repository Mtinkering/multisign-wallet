// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

// Payable to cast to address payable: payable(xksds)
// payable(msg.sender).transfer(amount in wei);
// payable(address(contractName))

contract Wallet {
  // Faciliate the lookup efficiency by using mapping
  mapping(address => bool) isApprover;
  address[] public approvers;
  address public admin;
  uint public quorum;
  
  enum Standard {
    ERC20,
    NATIVE
  }

  struct Transfer {
    uint id;
    string tokenSymbol;
    Standard standard;
    uint amount;
    address payable to;
    uint approvals;
    bool sent;
  }

  Transfer[] public transfers;
  
  struct Token {
    string tokenSymbol;
    address tokenAddress;
    Standard standard; 
  }

  mapping(string => Token) public tokenToAddress;
  string[] public tokenList;

  // Mapping {address: {transfer_id: boolean}} to track if certain address
  // has performed the approval on certain transfer id
  mapping(address => mapping(uint => bool)) public approvals;
  
  constructor(address[] memory _approvers, uint _quorum) {
    quorum = _quorum;
    approvers = _approvers;

    for (uint i = 0; i < _approvers.length; i++) {
      isApprover[_approvers[i]] = true;
    }

    admin = msg.sender;
  }
  
  function addToken(string memory tokenSymbol, address tokenAddress) external onlyAdmin() {
    tokenToAddress[tokenSymbol] = Token(tokenSymbol, tokenAddress, Standard.ERC20);
    tokenList.push(tokenSymbol);
  }

  function getTokenList() external view returns(Token[] memory) {
    Token[] memory _tokens = new Token[](tokenList.length);
    for (uint i = 0; i < tokenList.length; i++) {
      _tokens[i] = tokenToAddress[tokenList[i]];
    }
    return _tokens;
  }

  function getApprovers() external view returns(address[] memory) {
    return approvers;
  }
  
  function getTransfers() external view returns(Transfer[] memory) {
    return transfers;
  }
  
  function createTransfer(Standard standard, string memory tokenSymbol, uint amount,  address payable to) external onlyApprover {
    transfers.push(Transfer(
      transfers.length,
      tokenSymbol,
      standard,
      amount,
      to,
      0,
      false
    ));
  }
  
  // Approve based on the transfer id which is the index of the array
  function approveTransfer(uint id) external onlyApprover {
    require(transfers[id].sent == false, "transfer has already been sent");
    require(approvals[msg.sender][id] == false, "cannot approve transfer twice");
    
    approvals[msg.sender][id] = true;
    transfers[id].approvals++;
    
    // The moment the number of approvals reaches the quorum,
    // Attempt to make the transfer
    if(transfers[id].approvals >= quorum) {
      transfers[id].sent = true;
      address payable to = transfers[id].to;
      uint amount = transfers[id].amount;

      // ERC20
      if (transfers[id].standard == Standard.ERC20) {
        // Retrieve the contract address and call transferFrom
        IERC20(tokenToAddress[transfers[id].tokenSymbol].tokenAddress).transferFrom(
          address(this),
          to,
          amount
        );  
      }

      if (transfers[id].standard == Standard.NATIVE) {
        // Transfer eth in wei
        to.transfer(amount);
      }
    }
  }
  
  // Fallback
  receive() external payable {}
  
  // Authorize
  modifier onlyApprover() {
    require(isApprover[msg.sender] == true, "only approver allowed");
    _;
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, 'only admin');
    _;
  }
}
