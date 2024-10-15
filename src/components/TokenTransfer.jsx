import React, { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { useLocation } from 'react-router-dom';
import { web3FromAddress } from '@polkadot/extension-dapp';

const TransferTokens = () => {
  const location = useLocation();
  const { multisigAddress, threshold, signatories } = location.state || {}; 
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [api, setApi] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Connect to the Westend Testnet
  useEffect(() => {
    const initApi = async () => {
      try {
        const provider = new WsProvider('wss://westend-rpc.polkadot.io');
        const apiInstance = await ApiPromise.create({ provider });
        setApi(apiInstance);
      } catch (err) {
        console.error('Failed to connect to Polkadot API:', err);
        setError('Failed to connect to Polkadot API');
      }
    };
    initApi();
  }, []);

  // Fetch the balance of the multisig address
  useEffect(() => {
    const fetchBalance = async () => {
      if (!api || !multisigAddress) return;

      try {
        const { data: { free } } = await api.query.system.account(multisigAddress);
        setBalance(free.toString());
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch balance:', err);
        setError('Failed to fetch balance. Please check the console for details.');
        setLoading(false);
      }
    };

    fetchBalance();
  }, [api, multisigAddress]);

  // Handle token transfer
  const transferTokens = async () => {
    setError('');
    setSuccessMessage('');

    if (!api) {
      setError('API is not initialized.');
      return;
    }

    if (!recipient || !amount) {
      setError('Recipient and amount fields are required.');
      return;
    }

    try {
      const decimals = api.registry.chainDecimals[0];
      const transferAmount = BigInt(amount) * BigInt(10 ** decimals);

      // Check if the multisig module is available
      if (!api.tx.multisig) {
        setError('Multisig module is not available.');
        return;
      }

      // Fetch the accounts and get keypair from extension
      const injector = await web3FromAddress(multisigAddress);

      // Create the transfer extrinsic
      const transferExtrinsic = api.tx.balances.transfer(recipient, transferAmount);

      // Get nonce for the multisig address
      const { nonce } = await api.query.system.account(multisigAddress);

      // Send the multisig transaction
      const txHash = await api.tx.multisig
        .asMulti(threshold, signatories, null, transferExtrinsic.method.toHex(), false, transferAmount)
        .signAndSend(multisigAddress, { nonce, signer: injector.signer }, ({ status }) => {
          if (status.isInBlock) {
            setSuccessMessage('Transaction included in block.');
          } else if (status.isFinalized) {
            setSuccessMessage('Transaction finalized.');
          }
        });

      console.log(`Submitted with hash ${txHash}`);
    } catch (err) {
      console.error('Error transferring tokens:', err);
      setError('Failed to transfer tokens. Please check the console for details.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">Transfer Tokens</h1>

      {error && (
        <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p>{successMessage}</p>
        </div>
      )}

      <div className="mt-4 text-center">
        <h4 className="text-lg">Multisig Address: {multisigAddress}</h4>
        {loading ? (
          <p>Loading balance...</p>
        ) : (
          <p className='text-blue-500'>Balance: {balance ? `${balance / 10 ** api.registry.chainDecimals[0]} WND` : 'N/A'}</p>
        )}
      </div>

      <input
        type="text"
        placeholder="Recipient Address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        className="border border-gray-300 px-2 py-1 mt-4 rounded w-[500px]"
      />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border border-gray-300 px-2 py-1 mt-4 rounded w-[500px]"
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
