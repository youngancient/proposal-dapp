import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import useContract from "./useContract";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { liskSepoliaNetwork } from "../connection";
import { ErrorDecoder } from "ethers-decode-error";

const useExecuteProposal = () => {
  const contract = useContract(true);
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const [isLoading, setIsLoading] = useState(false);

  const errorDecoder = ErrorDecoder.create();

  const executeProposal = useCallback(
    async (id) => {
      if (!id) {
        toast.error("Invalid id");
        return;
      }
      if (!address) {
        toast.error("Connect your wallet!");
        return;
      }
      if (Number(chainId) !== liskSepoliaNetwork.chainId) {
        toast.error("You are not connected to the right network");
        return;
      }

      if (!contract) {
        toast.error("Cannot get contract!");
        return;
      }
      try {
        setIsLoading(true);
        const estimateGas = await contract.executeProposal.estimateGas(id);
        const tx = await contract.executeProposal(id, {
          gasLimit: (estimateGas * BigInt(120)) / BigInt(100),
        });
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          toast.success(`Executed proposal ${id} successful`);
          return;
        }
      } catch (error) {
        const decodedError = await errorDecoder.decode(error);
        toast.error(decodedError.reason);
      } finally {
        setIsLoading(false);
      }
    },
    [address, chainId, contract]
  );

  return { executeProposal, isExecuting: isLoading };
};

export default useExecuteProposal;
