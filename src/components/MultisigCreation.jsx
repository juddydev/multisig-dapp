import React, { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { encodeMultiAddress, sortAddresses } from '@polkadot/util-crypto';
import { useNavigate } from 'react-router-dom';

function MultisigCreation() {
  const navigate = useNavigate();
  const [api, setApi] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [signatories, setSignatories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [threshold, setThreshold] = useState(2);
  const [multisigAddress, setMultisigAddress] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize Polkadot.js API
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const provider = new WsProvider('wss://westend-rpc.polkadot.io');
        const apiInstance = await ApiPromise.create({ provider });
        console.log('Available modules:', apiInstance.tx);
        setApi(apiInstance);
      } catch (err) {
        setError('Error connecting to the Westend network');
      } finally {
        setIsLoading(false); // Ensure loading state is removed
      }
    };

    init();
  }, []);

  // Enable Polkadot JS extension and fetch balances
  const connectExtension = async () => {
    if (!api) {
      setError('API is not initialized yet.');
      return;
    }

    try {
      await web3Enable('polkadot-multisig');
      const injectedAccounts = await web3Accounts();

      if (injectedAccounts.length === 0) {
        setError('No accounts found in Polkadot JS extension.');
        return;
      }
      setAccounts(injectedAccounts);

      // Fetch balances for each account
      const accountBalances = {};
      for (const account of injectedAccounts) {
        const { data: balance } = await api.query.system.account(account.address);
        accountBalances[account.address] = balance.free.toHuman(); // Convert balance to human-readable format
      }
      setBalances(accountBalances);
    } catch (err) {
      console.error('Error connecting to Polkadot JS extension:', err);
      setError('Failed to connect to Polkadot JS extension. Please try again.');
    }
  };

  // Add a selected signatory to the list
  const addSignatory = (account) => {
    if (!signatories.includes(account)) {
      setSignatories([...signatories, account]);
      setError(''); // clear any previous errors
    }
  };

  // Create the multisig address
  const createMultisigAddress = () => {
    setError(''); // clear previous error
    setSuccessMessage(''); // clear previous success message

    if (!api) {
      setError('API is not initialized.');
      return;
    }
    if (signatories.length === 0 || threshold > signatories.length) {
      setError('Signatories list is empty or threshold is greater than the number of signatories.');
      return;
    }

    try {
      const sortedSignatories = sortAddresses(signatories, api.registry.chainSS58);
      const multisigAddr = encodeMultiAddress(sortedSignatories, threshold, api.registry.chainSS58);
      setMultisigAddress(multisigAddr);

      setSuccessMessage('Multisig address created successfully!');
      navigate(`/transfer-tokens`, { state: { multisigAddress: multisigAddr } });
    } catch (err) {
      console.error('Error creating multisig address:', err);
      setError('Failed to create multisig address. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">Create a Multisig Account</h1>

      {/* Show loading state */}
      {isLoading ? (
        <div>Loading Polkadot API...</div>
      ) : (
        <>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={connectExtension}>
            Connect to Polkadot JS Extension
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <p>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
              <p>{successMessage}</p>
            </div>
          )}

          {/* Signatory Selection */}
          <div className="mt-6">
            <h2 className="text-xl mb-2">Available Accounts</h2>
            {accounts.map((account, index) => (
              <div key={index} className="mb-2">
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded"
                  onClick={() => addSignatory(account.address)}
                >
                  Add {account.meta.name || account.address} - Balance: {balances[account.address] || 'Loading...'}
                </button>
              </div>
            ))}
          </div>

          {/* Display selected signatories */}
          <div className="mt-4">
            <h3 className="text-lg">Selected Signatories:</h3>
            <ul>
              {signatories.map((sig, idx) => (
                <li key={idx}>{sig}</li>
              ))}
            </ul>
          </div>

          {/* Threshold Input */}
          <div className="mt-4">
            <label className="text-lg mr-2">Threshold:</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="border border-gray-300 px-2 py-1 rounded"
            />
          </div>

          {/* Create Multisig Address */}
          <button className="mt-4 px-4 py-2 bg-purple-500 text-white rounded" onClick={createMultisigAddress}>
            Create Multisig Address
          </button>

          {/* Display Multisig Address */}
          {multisigAddress && (
            <div className="mt-4">
              <h4 className="text-lg">Multisig Address: {multisigAddress}</h4>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MultisigCreation;
