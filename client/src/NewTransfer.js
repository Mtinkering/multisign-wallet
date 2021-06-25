import React, { useState } from 'react';

function NewTransfer({ tokens, createTransfer }) {
  const [transfer, setTransfer] = useState({});

  const submit = (e) => {
    e.preventDefault();

    if (!transfer.to || !transfer.amount || !transfer.token) {
      return alert('Please provide input for the transfer');
    }

    createTransfer(transfer);
  };

  const updateTransfer = (e, field) => {
    let value = e.target.value;

    if (field === 'token') {
      // value selected is the index
      value = tokens[value];
    }

    setTransfer({ ...transfer, [field]: value });
  };

  return (
    <div>
      <h2> Create transfer</h2>
      <form onSubmit={(e) => submit(e)}>
        <div>
          <label htmlFor="token">Token</label>
          <select id="token" onChange={(e) => updateTransfer(e, 'token')}>
            <option value=""> Select Token </option>
            {tokens.map((token, index) => (
              <option key={index} value={index}>
                {token.tokenSymbol}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="amount">Amount (in wei)</label>
          <input
            id="amount"
            type="text"
            onChange={(e) => updateTransfer(e, 'amount')}
          />
        </div>
        <div>
          <label htmlFor="to">To</label>
          <input
            id="to"
            type="text"
            onChange={(e) => updateTransfer(e, 'to')}
          />
        </div>

        <button>Submit</button>
      </form>
    </div>
  );
}

export default NewTransfer;
