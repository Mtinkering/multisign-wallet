// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

contract Wallet {
  // Faciliate the lookup efficiency by using mapping
  mapping(address => bool) approverMapping;
  address[] public approvers;
  
  uint public quorum;
  
  struct Transfer {
    uint id;
    uint amount;
    address payable to;
    uint approvals;
    bool sent;
  }

  Transfer[] public transfers;
  
  // Mapping {address: {transfer_id: boolean}} to track if certain address
  // has performed the approval on certain transfer id
  mapping(address => mapping(uint => bool)) public approvals;
  
  constructor(address[] memory _approvers, uint _quorum) {
    quorum = _quorum;
    approvers = _approvers;

    for (uint i = 0; i < _approvers.length; i++) {
      approverMapping[_approvers[i]] = true;
    }
  }
  
  function getApprovers() external view returns(address[] memory) {
    return approvers;
  }
  
  function getTransfers() external view returns(Transfer[] memory) {
    return transfers;
  }
  
  function createTransfer(uint amount, address payable to) external onlyApprover {
    transfers.push(Transfer(
      transfers.length,
      amount,
      to,
      0,
      false
    ));
  }
  
  // Approve based on on the transfer id
  // Transfer id is also the index of the array
  function approveTransfer(uint id) external onlyApprover {
    require(transfers[id].sent == false, 'transfer has already been sent');
    require(approvals[msg.sender][id] == false, 'cannot approve transfer twice');
    
    approvals[msg.sender][id] = true;
    transfers[id].approvals++;
    
    // The moment the number of approvals reaches the quorum,
    // Attempt to make the transfer
    if(transfers[id].approvals >= quorum) {
      transfers[id].sent = true;
      address payable to = transfers[id].to;
      uint amount = transfers[id].amount;

      // Transfer ethereum
      to.transfer(amount);
    }
  }
  
  // Fallback
  receive() external payable {}
  
  // Authorize
  modifier onlyApprover() {
    require(approverMapping[msg.sender] == true, 'only approver allowed');
    _;
  }
}
