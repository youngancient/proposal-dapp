import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import useContract from "./useContract";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { liskSepoliaNetwork } from "../connection";

const useVote = () => {
  const contract = useContract(true);
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const [isLoading, setIsLoading] = useState(false);

  const vote = useCallback(
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
        const estimatedGas = await contract.vote.estimateGas(id);
        const tx = await contract.vote(id, {
          gasLimit: (estimatedGas * BigInt(120)) / BigInt(100),
        });
        const reciept = await tx.wait();
        if (reciept.status === 1) {
          toast.success(`Voted proposal ${id} successful`);
          return;
        }
      } catch (error) {
        console.log("error voting: ", error);
        toast.error(`Voted proposal ${id} failed`);
      } finally {
        setIsLoading(false);
      }
    },
    [address, chainId, contract]
  );

  return { vote, isLoading };
};

export default useVote;
