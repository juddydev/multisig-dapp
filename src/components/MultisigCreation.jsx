import React, { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { encodeMultiAddress, sortAddresses } from '@polkadot/util-crypto';
import { web3FromAddress } from '@polkadot/extension-dapp';

function MultisigCreation() {
  const [api, setApi] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signatories, setSignatories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [threshold, setThreshold] = useState(2);
  const [multisigAddress, setMultisigAddress] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false); // State for popup confirmation

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const provider = new WsProvider('wss://westend-rpc.polkadot.io');
        const apiInstance = await ApiPromise.create({ provider });
        console.log('Available modules:', apiInstance.tx); // Log available modules
        setApi(apiInstance);
      } catch (err) {
        setError('Error connecting to the Westend network');
      } finally {
        setIsLoading(false);
      }
    };
  
    init();
  }, []);
  

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
  
      const accountBalances = {};
      for (const account of injectedAccounts) {
        const { data: balance } = await api.query.system.account(account.address);
        // Convert from Planck (10^12) to WND
        const humanBalance = balance.free / Math.pow(10, 12);
        accountBalances[account.address] = humanBalance.toString();
      }
      setBalances(accountBalances);
    } catch (err) {
      setError('Failed to connect to Polkadot JS extension. Please try again.');
    }
  };
  

  const addSignatory = (account) => {
    if (!signatories.includes(account)) {
      setSignatories([...signatories, account]);
      setError('');
    }
  };

  const createMultisigAddress = () => {
    setError('');
    setSuccessMessage('');

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
    } catch (err) {
      setError('Failed to create multisig address. Please try again.');
    }
  };

  const handleTransferBalances = async () => {
    if (!api || !multisigAddress) return;
  
    try {
      // Create an array to hold the transfer promises
      const transfers = signatories.map(async (account) => {
        // Ensure the address is correctly passed to the account query
        const { data: { free } } = await api.query.system.account(account); // Use account instead of account.address
        const balanceToTransfer = free.toString(); // Get balance in smallest unit
  
        if (Number(balanceToTransfer) > 0) {
          const transferExtrinsic = api.tx.balances?.transfer(multisigAddress, balanceToTransfer); // Use optional chaining
          
          if (!transferExtrinsic) {
            throw new Error('Transfer function not available in the balances module.');
          }
  
          const injector = await web3FromAddress(account);
  
          // Log to see the transaction details before sending
          console.log(`Transferring ${balanceToTransfer} from ${account} to ${multisigAddress}`);
  
          await transferExtrinsic.signAndSend(account, { signer: injector.signer });
        } else {
          console.warn(`No balance to transfer for account: ${account}`);
        }
      });
  
      // Wait for all transfer promises to complete
      await Promise.all(transfers);
      setSuccessMessage('All balances transferred to the multisig account successfully!');
      setShowPopup(false); // Close popup after transfer
    } catch (err) {
      console.error('Error transferring balances:', err);
      setError(`Failed to transfer balances: ${err.message}`);
      setShowPopup(false); // Close popup on error
    }
  };
  
  
  

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">Create a Multisig Account</h1>

      {isLoading ? (
        <div>Loading Polkadot API...</div>
      ) : (
        <>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={connectExtension}>
            Connect to Polkadot JS Extension
          </button>

          {error && (
            <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
              <p>{successMessage}</p>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-xl mb-2">Available Accounts</h2>
            {accounts.map((account, index) => (
              <div key={index} className="mb-2">
              <button
                className="px-4 py-2 bg-green-500 text-white rounded"
                onClick={() => addSignatory(account.address)}
              >
                Add {account.meta.name || account.address} - Balance: {balances[account.address] ? `${balances[account.address]} WND` : 'Loading...'}
              </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="text-lg">Selected Signatories:</h3>
            <ul>
              {signatories.map((sig, idx) => (
                <li key={idx}>{sig}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <label className="text-lg mr-2">Threshold:</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="border border-gray-300 px-2 py-1 rounded"
            />
          </div>

          {!multisigAddress ? (
            <button className="mt-4 px-4 py-2 bg-purple-500 text-white rounded" onClick={createMultisigAddress}>
              Create Multisig Address
            </button>
          ) : (
            <button
              className="mt-4 px-4 py-2 bg-purple-500 text-white rounded"
              onClick={() => setShowPopup(true)}
            >
              Transfer Balances to Multisig Address
            </button>
          )}

          {multisigAddress && (
            <div className="mt-4">
              <h4 className="text-lg font-bold">Multisig Address: {multisigAddress}</h4>
            </div>
          )}

          {showPopup && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75">
              <div className="bg-white p-6 rounded-lg">
                <h3 className="text-lg">Confirm Transfer</h3>
                <p>Do you want to transfer all balances to the multisig account?</p>
                <button
                  className="mt-4 mr-2 px-4 py-2 bg-blue-500 text-white rounded"
                  onClick={handleTransferBalances}
                >
                  Confirm
                </button>
                <button
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
                  onClick={() => setShowPopup(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MultisigCreation;
