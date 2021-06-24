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
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const wallet = await getWallet(web3);
      const [approvers, quorum, transfers, tokens] = await Promise.all([
        wallet.methods.getApprovers().call(),
        wallet.methods.quorum().call(),
        wallet.methods.getTransfers().call(),
        wallet.methods.getTokens().call(),
      ]);

      setWeb3(web3);
      setAccounts(accounts);
      setWallet(wallet);
      setApprovers(approvers);
      setQuorum(quorum);
      setTransfers(transfers);
      setTokens(tokens);
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
    tokens.length === 0 ||
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
