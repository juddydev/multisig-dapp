import React, { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';

const TransferTokens = ({ multisigAddress }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [api, setApi] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize Polkadot API
  const initApi = async () => {
    try {
      const provider = new WsProvider('wss://rpc.polkadot.io');
      const apiInstance = await ApiPromise.create({ provider });
      setApi(apiInstance);

      // Log available API methods
      console.log('API instance created successfully:', apiInstance);

    } catch (err) {
      console.error('Error connecting to Polkadot API:', err);
      setError('Failed to connect to Polkadot API. Please try again.');
    }
  };

  // Transfer tokens
  const transferTokens = async () => {
    setError(''); // Clear any previous error
    setSuccessMessage(''); // Clear any previous success message

    if (!api) {
      setError('API is not initialized.');
      return;
    }

    // Validate input
    if (!recipient || !amount) {
      setError('Recipient and amount fields are required.');
      return;
    }

    try {
      // Check if balances module exists
      if (!api.tx.balances || !api.tx.balances.transfer) {
        setError('Balances module is not available.');
        return;
      }

      // Create the transfer extrinsic
      const transferExtrinsic = api.tx.balances.transfer(recipient, amount);

      // Get nonce for the multisig address
      const { nonce } = await api.query.system.account(multisigAddress);

      // Sign and send the transaction
      await transferExtrinsic.signAndSend(multisigAddress, { nonce }, ({ status }) => {
        if (status.isInBlock) {
          setSuccessMessage('Transaction included in block.');
        } else if (status.isFinalized) {
          setSuccessMessage('Transaction finalized.');
        }
      });
    } catch (err) {
      console.error('Error transferring tokens:', err);
      setError('Failed to transfer tokens. Please check the console for details.');
    }
  };

  // Call initApi when the component mounts
  useEffect(() => {
    initApi();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">Transfer Tokens</h1>

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mt-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p>{successMessage}</p>
        </div>
      )}

      <input
        type="text"
        placeholder="Recipient Address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        className="border border-gray-300 px-2 py-1 mt-4 rounded"
      />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border border-gray-300 px-2 py-1 mt-4 rounded"
      />

      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={transferTokens}
      >
        Transfer Tokens
      </button>
    </div>
  );
};

export default TransferTokens;
