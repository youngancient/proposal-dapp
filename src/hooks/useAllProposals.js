import { useCallback, useEffect, useState } from "react";
import useContract from "./useContract";
import { Contract, ethers } from "ethers";
import useRunners from "./useRunners";
import { Interface } from "ethers";
import ABI from "../ABI/proposal.json";

// without using Multicall
export const useAllProposals = () => {
  const [allProposals, setAllProposals] = useState([]);
  const readOnlyProposalContract = useContract();

  const fetchAllProposals = useCallback(async () => {
    if (!readOnlyProposalContract) return;
    try {
      // gets the count of proposals
      // note: the contract has a bug, if returns 1 more than the actual count of proposals
      const proposalCount = Number(
        await readOnlyProposalContract.proposalCount()
      );

      // we subtract 1 from the length
      const proposalIdArray = Array.from(
        { length: proposalCount - 1 },
        (_, i) => i + 1
      );

      const promises = proposalIdArray.map((i) =>
        readOnlyProposalContract.proposals(i)
      );
      const responses = await Promise.all(promises);

      // let data = [];

      const data = responses.map((proposalStruct) => ({
        description: proposalStruct.description,
        amount: proposalStruct.amount,
        minRequiredVote: proposalStruct.minVotesToPass,
        votecount: proposalStruct.voteCount,
        deadline: proposalStruct.votingDeadline,
        executed: proposalStruct.executed,
      }));

      setAllProposals(data);
    } catch (error) {
      console.log("error fetching all proposals: ", error);
    }
  }, [readOnlyProposalContract]);

  useEffect(() => {
    fetchAllProposals();
  }, [fetchAllProposals]);

  return allProposals;
};

const multiCallABI = [
  "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

export const useMulticallAllProposals = () => {
  const [allProposals, setAllProposals] = useState([]);
  const readOnlyProposalContract = useContract();
  const { readOnlyProvider } = useRunners();

  const fetchAllProposals = useCallback(
    async () => {
      if (!readOnlyProposalContract) return;
      const multicallContract = new Contract(
        import.meta.env.VITE_MULTICALL_ADDRESS,
        multiCallABI,
        readOnlyProvider
      );

      // contract interface

      const iface = new Interface(ABI);
      try {
        const proposalCount = Number(
          await readOnlyProposalContract.proposalCount()
        );

        // we subtract 1 from the length
        const proposalIdArray = Array.from(
          { length: proposalCount - 1 },
          (_, i) => i + 1
        );

        const calls = proposalIdArray.map((id) => ({
          target: import.meta.env.VITE_CONTRACT_ADDRESS,
          callData: iface.encodeFunctionData("proposals", [id]),
        }));

        const responses = await multicallContract.tryAggregate.staticCall(
          true,
          calls
        );

        const decodedResults = responses.map((response) =>
          iface.decodeFunctionResult("proposals", response.returnData)
        );

        const data = decodedResults.map((proposalStruct, index) => ({
          id: proposalIdArray[index],
          description: proposalStruct.description,
          amount: proposalStruct.amount,
          minRequiredVote: proposalStruct.minVotesToPass,
          votecount: proposalStruct.voteCount,
          deadline: proposalStruct.votingDeadline,
          executed: proposalStruct.executed,
        }));

        setAllProposals(data);
      } catch (error) {
        console.log("error fetching proposals: ", error);
      }
    },
    [readOnlyProposalContract],
    readOnlyProvider
  );

  useEffect(() => {
    fetchAllProposals();
  }, [fetchAllProposals]);

  const handleCreatedProposalEvent = useCallback(
    async (
      proposalId,
      description,
      recipient,
      amount,
      votingDeadline,
      minVotesToPass
      // eventData
    ) => {
      const newProposal = {
        proposalId,
        description,
        amount,
        minRequiredVote: Number(minVotesToPass),
        votecount: 0,
        deadline: votingDeadline,
        executed: false,
      };
      console.log(newProposal);
      // Update the state with the new proposal, prepend it to the list
      setAllProposals([...allProposals, newProposal]);
    }
  );

  const handleVotedProposalEvent = useCallback(async (proposalId, voter) => {
    console.log(proposalId, voter);
  });

  useEffect(() => {
    readOnlyProposalContract.on("ProposalCreated", handleCreatedProposalEvent);

    readOnlyProposalContract.on("Voted", handleVotedProposalEvent);

    return () => {
      readOnlyProposalContract.off(
        "ProposalCreated",
        handleCreatedProposalEvent
      );
      readOnlyProposalContract.off("Voted", handleVotedProposalEvent);
    };
  }, [readOnlyProvider, allProposals]);

  return allProposals;
};
