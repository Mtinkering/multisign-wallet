import React, { useEffect, useState } from 'react';
import { getWeb3, getWallet } from './utils.js';
import Header from './Header.js';
import NewTransfer from './NewTransfer';
import TransferList from './TransferList';

function App() {
  const [web3, setWeb3] = useState(undefined);
  const [accounts, setAccounts] = useState(undefined);
  const [wallet, setWallet] = useState(undefined);
  const [approvers, setApprovers] = useState([]);
  const [quorum, setQuorum] = useState(undefined);
  const [transfers, setTransfers] = useState([]);
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    const init = async () => {
      const _web3 = await getWeb3();
      const _accounts = await _web3.eth.getAccounts();
      const _wallet = await getWallet(_web3);
      const [_approvers, _quorum, rawTransfers, rawTokens] = await Promise.all([
        _wallet.methods.getApprovers().call(),
        _wallet.methods.quorum().call(),
        _wallet.methods.getTransfers().call(),
        _wallet.methods.getTokens().call(),
      ]);

      const _tokens = rawTokens.map((token) => ({
        ...token,
        tokenInUtf8: _web3.utils.hexToUtf8(token.tokenSymbol),
      }));
      const _transfers = rawTransfers.map((transfer) => ({
        ...transfer,
        tokenInUtf8: _web3.utils.hexToUtf8(transfer.token.tokenSymbol),
      }));

      setWeb3(_web3);
      setAccounts(_accounts);
      setWallet(_wallet);
      setApprovers(_approvers);
      setQuorum(_quorum);
      setTransfers(_transfers);
      setTokens(_tokens);
    };
    init();
  }, []);

  const _reload = async () => {
    const transfers = await wallet.methods.getTransfers().call();
    setTransfers(transfers);
  };

  const createTransfer = async (transfer) => {
    await wallet.methods
      .createTransfer(transfer.amount, transfer.to, transfer.token)
      .send({ from: accounts[0] });

    _reload();
  };

  const approveTransfer = async (transferId) => {
    await wallet.methods
      .approveTransfer(transferId)
      .send({ from: accounts[0] });

    _reload();
  };

  if (
    typeof web3 === 'undefined' ||
    typeof accounts === 'undefined' ||
    typeof wallet === 'undefined' ||
    !tokens ||
    tokens.length === 0 ||
    !approvers ||
    approvers.length === 0 ||
    typeof quorum === 'undefined'
  ) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      Multisig Dapp
      <Header approvers={approvers} quorum={quorum} />
      <NewTransfer tokens={tokens} createTransfer={createTransfer} />
      <TransferList transfers={transfers} approveTransfer={approveTransfer} />
    </div>
  );
}

export default App;
